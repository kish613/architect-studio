import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_lib/storage";
import { checkRetextureTaskStatus } from "../../_lib/meshy";

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
    const model = await storage.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // If there's a retexture task, check its status
    if (model.retextureTaskId && model.status === "retexturing") {
      const taskResult = await checkRetextureTaskStatus(model.retextureTaskId);

      if (taskResult.status === "completed" && taskResult.modelUrl) {
        const updatedModel = await storage.updateModel(modelId, {
          status: "completed",
          model3dUrl: taskResult.modelUrl,
          retextureTaskId: null, // Clear after completion
        });
        return res.json(updatedModel);
      } else if (taskResult.status === "failed") {
        // Revert to completed since we still have the previous model
        await storage.updateModel(modelId, {
          status: "completed",
          retextureTaskId: null,
        });
        return res.json({
          ...model,
          status: "completed",
          error: "Retexture failed",
        });
      }
    }

    res.json(model);
  } catch (error) {
    console.error("Error checking retexture status:", error);
    res.status(500).json({ error: "Failed to check retexture status" });
  }
}



