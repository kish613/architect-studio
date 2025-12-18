import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_lib/storage";
import { checkMeshyTaskStatus } from "../../_lib/meshy";

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

    // If there's a Meshy task, check its status
    if (model.meshyTaskId && model.status === "generating_3d") {
      const taskResult = await checkMeshyTaskStatus(model.meshyTaskId);

      if (taskResult.status === "completed" && taskResult.modelUrl) {
        const updatedModel = await storage.updateModel(modelId, {
          status: "completed",
          model3dUrl: taskResult.modelUrl,
        });
        return res.json(updatedModel);
      } else if (taskResult.status === "failed") {
        await storage.updateModel(modelId, { status: "failed" });
        return res.json({ ...model, status: "failed" });
      }
    }

    res.json(model);
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
}



