import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { createImageTo3DTask } from "../../../lib/meshy.js";
import { generateTrellis3D } from "../../../lib/trellis.js";
import {
  DEFAULT_3D_PROVIDER,
  get3DStageForProvider,
  resolve3DProvider,
} from "../../../shared/model-pipeline.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";

export const maxDuration = 300;

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

async function downloadAndStoreGlb(modelId: number, glbUrl: string) {
  const response = await fetch(glbUrl);
  if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status}`);
  }

  const glbBuffer = await response.arrayBuffer();
  return put(`models/${modelId}/trellis-model.glb`, Buffer.from(glbBuffer), {
    access: "public",
    contentType: "model/gltf-binary",
  });
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
    const resolvedProvider = resolve3DProvider("trellis", {
      trellisHealthy: Boolean(process.env.HF_TOKEN),
      trellisUsable: true,
    });

    await db.update(floorplanModels).set({
      provider: resolvedProvider.provider,
      stage: get3DStageForProvider(resolvedProvider.provider),
      status: get3DStageForProvider(resolvedProvider.provider),
      startedAt,
      finishedAt: null,
      lastError: null,
      lastDiagnostics: null,
    }).where(eq(floorplanModels.id, modelId));

    if (resolvedProvider.provider === DEFAULT_3D_PROVIDER) {
      const fallback = await createImageTo3DTask(model.isometricUrl);
      if (!fallback.success || !fallback.taskId) {
        await db.update(floorplanModels).set({
          provider: DEFAULT_3D_PROVIDER,
          stage: "failed",
          status: "failed",
          finishedAt: new Date(),
          lastError: fallback.error || "Failed to start Meshy fallback",
          lastDiagnostics: stringifyDiagnostics(fallback.diagnostics),
        }).where(eq(floorplanModels.id, modelId));

        return res.status(500).json({ error: fallback.error || "Failed to start 3D generation" });
      }

      await deductCredit(user.id);

      const [updatedModel] = await db.update(floorplanModels).set({
        provider: DEFAULT_3D_PROVIDER,
        stage: get3DStageForProvider(DEFAULT_3D_PROVIDER),
        status: get3DStageForProvider(DEFAULT_3D_PROVIDER),
        meshyTaskId: fallback.taskId,
        startedAt,
        finishedAt: null,
        lastDiagnostics: stringifyDiagnostics({
          fallbackFrom: "trellis",
          reason: resolvedProvider.fallbackReason || "trellis_unavailable",
        }),
      }).where(eq(floorplanModels.id, modelId)).returning();

      return res.json(updatedModel);
    }

    const trellisResult = await generateTrellis3D(model.isometricUrl);
    if (!trellisResult.success || !trellisResult.glbUrl) {
      const fallback = await createImageTo3DTask(model.isometricUrl);
      if (!fallback.success || !fallback.taskId) {
        await db.update(floorplanModels).set({
          provider: DEFAULT_3D_PROVIDER,
          stage: "failed",
          status: "failed",
          finishedAt: new Date(),
          lastError: trellisResult.error || fallback.error || "Failed to generate 3D model",
          lastDiagnostics: stringifyDiagnostics({
            trellis: trellisResult.diagnostics,
            fallback: fallback.diagnostics,
          }),
        }).where(eq(floorplanModels.id, modelId));

        return res.status(500).json({
          error: trellisResult.error || fallback.error || "Failed to generate 3D model",
        });
      }

      await deductCredit(user.id);

      const [updatedModel] = await db.update(floorplanModels).set({
        provider: DEFAULT_3D_PROVIDER,
        stage: get3DStageForProvider(DEFAULT_3D_PROVIDER),
        status: get3DStageForProvider(DEFAULT_3D_PROVIDER),
        meshyTaskId: fallback.taskId,
        startedAt,
        finishedAt: null,
        lastError: null,
        lastDiagnostics: stringifyDiagnostics({
          fallbackFrom: "trellis",
          trellis: trellisResult.diagnostics,
        }),
      }).where(eq(floorplanModels.id, modelId)).returning();

      return res.json(updatedModel);
    }

    const blob = await downloadAndStoreGlb(modelId, trellisResult.glbUrl);
    await deductCredit(user.id);

    const [updatedModel] = await db.update(floorplanModels).set({
      provider: "trellis",
      stage: "completed",
      status: "completed",
      model3dUrl: blob.url,
      startedAt,
      finishedAt: new Date(),
      lastError: null,
      lastDiagnostics: stringifyDiagnostics(trellisResult.diagnostics),
    }).where(eq(floorplanModels.id, modelId)).returning();

    return res.json(updatedModel);
  } catch (error: any) {
    console.error("TRELLIS 3D generation error:", error);
    await db.update(floorplanModels).set({
      stage: "failed",
      status: "failed",
      finishedAt: new Date(),
      lastError: error?.message || "Failed to generate 3D model with TRELLIS",
    }).where(eq(floorplanModels.id, modelId));

    return res.status(500).json({
      error: error?.message || "Failed to generate 3D model with TRELLIS",
    });
  }
}
