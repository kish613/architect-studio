import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../serverless-lib/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
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

    if (!model.baseModel3dUrl) {
      return res.status(400).json({ error: "No base model to revert to" });
    }

    // Revert to the base model
    const updatedModel = await storage.updateModel(modelId, {
      model3dUrl: model.baseModel3dUrl,
      texturePrompt: null,
    });

    res.json(updatedModel);
  } catch (error) {
    console.error("Error reverting texture:", error);
    res.status(500).json({ error: "Failed to revert texture" });
  }
}



