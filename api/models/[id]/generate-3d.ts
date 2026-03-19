import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";
import {
  DEFAULT_3D_PROVIDER,
  get3DStageForProvider,
} from "../../../shared/model-pipeline.js";
import { createImageTo3DTask } from "../../../lib/meshy.js";

function stringifyDiagnostics(diagnostics: unknown): string | null {
  if (!diagnostics) {
    return null;
  }

  try {
    return JSON.stringify(diagnostics);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await requireAuth(req, res);
  if (!session) {
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const modelId = parseInt(req.query.id as string);
  if (Number.isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.isometricUrl) {
      return res.status(400).json({ error: "Isometric image not yet generated" });
    }

    const hasCredits = await canUserGenerate(user.id);
    if (!hasCredits) {
      return res.status(403).json({
        error: "Generation limit reached",
        message: "No credits remaining. Please purchase more credits to continue generating.",
        redirectTo: "/pricing",
      });
    }

    const startedAt = new Date();
    const generatingStage = get3DStageForProvider(DEFAULT_3D_PROVIDER);

    await db.update(floorplanModels).set({
      provider: DEFAULT_3D_PROVIDER,
      stage: generatingStage,
      status: generatingStage,
      startedAt,
      finishedAt: null,
      lastError: null,
      lastDiagnostics: null,
    }).where(eq(floorplanModels.id, modelId));

    const result = await createImageTo3DTask(model.isometricUrl);

    if (result.success && result.taskId) {
      const deducted = await deductCredit(user.id);
      if (!deducted) {
        console.error("Failed to deduct credit after Meshy task creation");
      }

      const [updatedModel] = await db.update(floorplanModels).set({
        provider: DEFAULT_3D_PROVIDER,
        stage: generatingStage,
        status: generatingStage,
        meshyTaskId: result.taskId,
        startedAt,
        finishedAt: null,
        lastError: null,
        lastDiagnostics: stringifyDiagnostics(result.diagnostics),
      }).where(eq(floorplanModels.id, modelId)).returning();

      return res.json(updatedModel);
    }

    const [failedModel] = await db.update(floorplanModels).set({
      provider: DEFAULT_3D_PROVIDER,
      stage: "failed",
      status: "failed",
      finishedAt: new Date(),
      lastError: result.error || "Failed to start 3D generation",
      lastDiagnostics: stringifyDiagnostics(result.diagnostics),
    }).where(eq(floorplanModels.id, modelId)).returning();

    return res.status(500).json({
      error: result.error || "Failed to start 3D generation",
      model: failedModel,
    });
  } catch (error) {
    console.error("Error starting 3D generation:", error);
    return res.status(500).json({ error: "Failed to start 3D generation" });
  }
}
