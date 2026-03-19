import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { createRetextureTask } from "../../../lib/meshy.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";

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
    const { texturePrompt } = req.body || {};
    if (!texturePrompt || typeof texturePrompt !== "string") {
      return res.status(400).json({ error: "Texture prompt is required" });
    }

    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.model3dUrl) {
      return res.status(400).json({ error: "3D model not yet generated" });
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
    const baseModelUrl = model.baseModel3dUrl || model.model3dUrl;

    await db.update(floorplanModels).set({
      provider: "meshy",
      stage: "retexturing",
      status: "retexturing",
      startedAt,
      finishedAt: null,
      lastError: null,
      lastDiagnostics: null,
      texturePrompt,
      baseModel3dUrl: baseModelUrl,
    }).where(eq(floorplanModels.id, modelId));

    const result = await createRetextureTask(model.model3dUrl, texturePrompt);

    if (result.success && result.taskId) {
      const deducted = await deductCredit(user.id);
      if (!deducted) {
        console.error("Failed to deduct credit after starting retexture task");
      }

      const [updatedModel] = await db.update(floorplanModels).set({
        provider: "meshy",
        stage: "retexturing",
        status: "retexturing",
        retextureTaskId: result.taskId,
        retextureUsed: true,
        startedAt,
        finishedAt: null,
        lastError: null,
        lastDiagnostics: stringifyDiagnostics(result.diagnostics),
      }).where(eq(floorplanModels.id, modelId)).returning();

      return res.json(updatedModel);
    }

    await db.update(floorplanModels).set({
      stage: "completed",
      status: "completed",
      finishedAt: new Date(),
      texturePrompt: null,
      lastError: result.error || "Failed to start retexturing",
      lastDiagnostics: stringifyDiagnostics(result.diagnostics),
    }).where(eq(floorplanModels.id, modelId));

    return res.status(500).json({
      error: result.error || "Failed to start retexturing",
    });
  } catch (error) {
    console.error("Error starting retexture:", error);
    return res.status(500).json({ error: "Failed to start retexturing" });
  }
}
