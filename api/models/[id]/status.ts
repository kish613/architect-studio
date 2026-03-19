import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db.js";
import { checkMeshyTaskStatus } from "../../../lib/meshy.js";
import {
  isProviderSpecific3DStage,
} from "../../../shared/model-pipeline.js";
import { floorplanModels } from "../../../shared/schema.js";

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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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

    const isMeshyGeneration =
      model.provider === "meshy" &&
      (model.meshyTaskId || model.status === "generating_3d" || isProviderSpecific3DStage(model.stage));

    if (isMeshyGeneration && model.meshyTaskId) {
      const taskResult = await checkMeshyTaskStatus(model.meshyTaskId);

      if (taskResult.success && taskResult.modelUrl) {
        const [updatedModel] = await db.update(floorplanModels).set({
          provider: "meshy",
          stage: "completed",
          status: "completed",
          model3dUrl: taskResult.modelUrl,
          finishedAt: new Date(),
          lastError: null,
          lastDiagnostics: stringifyDiagnostics(taskResult.diagnostics),
        }).where(eq(floorplanModels.id, modelId)).returning();

        return res.json(updatedModel);
      }

      if (!taskResult.success || taskResult.status === "failed") {
        const [failedModel] = await db.update(floorplanModels).set({
          provider: "meshy",
          stage: "failed",
          status: "failed",
          finishedAt: new Date(),
          lastError: taskResult.error || "Meshy 3D generation failed",
          lastDiagnostics: stringifyDiagnostics(taskResult.diagnostics),
        }).where(eq(floorplanModels.id, modelId)).returning();

        return res.json(failedModel);
      }
    }

    return res.json(model);
  } catch (error) {
    console.error("Error checking status:", error);
    return res.status(500).json({ error: "Failed to check status" });
  }
}
