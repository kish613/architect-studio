import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db.js";
import { checkRetextureTaskStatus } from "../../../lib/meshy.js";
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

  const { id } = req.query;
  const modelId = parseInt(id as string);

  if (isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    if (model.retextureTaskId && model.status === "retexturing") {
      const taskResult = await checkRetextureTaskStatus(model.retextureTaskId);

      if (taskResult.success && taskResult.status === "completed" && taskResult.modelUrl) {
        const [updatedModel] = await db.update(floorplanModels).set({
          provider: "meshy",
          stage: "completed",
          status: "completed",
          model3dUrl: taskResult.modelUrl,
          retextureTaskId: null,
          finishedAt: new Date(),
          lastError: null,
          lastDiagnostics: stringifyDiagnostics(taskResult.diagnostics),
          retextureVersion: (model.retextureVersion ?? 0) + 1,
        }).where(eq(floorplanModels.id, modelId)).returning();
        return res.json(updatedModel);
      }

      if (!taskResult.success || taskResult.status === "failed") {
        const [restoredModel] = await db.update(floorplanModels).set({
          stage: "completed",
          status: "completed",
          retextureTaskId: null,
          finishedAt: new Date(),
          lastError: taskResult.error || "Retexture failed",
          lastDiagnostics: stringifyDiagnostics(taskResult.diagnostics),
        }).where(eq(floorplanModels.id, modelId)).returning();

        return res.json({
          ...restoredModel,
          error: taskResult.error || "Retexture failed",
        });
      }
    }

    return res.json(model);
  } catch (error) {
    console.error("Error checking retexture status:", error);
    return res.status(500).json({ error: "Failed to check retexture status" });
  }
}
