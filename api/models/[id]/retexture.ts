import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../lib/storage";
import { createRetextureTask } from "../../lib/meshy";
import {
  getSessionFromCookies,
  verifySession,
  getUserById,
} from "../../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(token);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = user.id;
  const { id } = req.query;
  const modelId = parseInt(id as string);

  if (isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    const { texturePrompt } = req.body || {};

    if (!texturePrompt || typeof texturePrompt !== "string") {
      return res.status(400).json({ error: "Texture prompt is required" });
    }

    const model = await storage.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const project = await storage.getProject(model.projectId);
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.model3dUrl) {
      return res.status(400).json({ error: "3D model not yet generated" });
    }

    // Check if retexturing was already used for this model
    if (model.retextureUsed) {
      return res.status(403).json({
        error: "Retexturing limit reached",
        message: "Retexturing is limited to once per model",
      });
    }

    // Check usage limits
    let subscription = await storage.getSubscription(userId);
    if (!subscription) {
      subscription = await storage.createOrUpdateSubscription(userId, {});
    }

    if (subscription.generationsUsed >= subscription.generationsLimit) {
      return res.status(403).json({
        error: "Generation limit reached",
        message: "Please upgrade your plan or purchase additional generations",
        redirectTo: "/pricing",
      });
    }

    // Backup the original model URL before retexturing (if not already backed up)
    const baseModelUrl = model.baseModel3dUrl || model.model3dUrl;

    // Update status to retexturing
    await storage.updateModel(modelId, {
      status: "retexturing",
      texturePrompt: texturePrompt,
      baseModel3dUrl: baseModelUrl,
    });

    // Create retexture task with the existing model URL
    const result = await createRetextureTask(model.model3dUrl, texturePrompt);

    if (result.success && result.taskId) {
      // Only increment credits and mark retextureUsed on successful task creation
      await storage.createOrUpdateSubscription(userId, {
        generationsUsed: subscription.generationsUsed + 1,
      });

      const updatedModel = await storage.updateModel(modelId, {
        retextureTaskId: result.taskId,
        retextureUsed: true,
      });
      res.json(updatedModel);
    } else {
      // Revert status on failure - retexture can still be retried
      await storage.updateModel(modelId, {
        status: "completed",
        texturePrompt: null,
      });
      res.status(500).json({
        error: result.error || "Failed to start retexturing",
      });
    }
  } catch (error) {
    console.error("Error starting retexture:", error);
    res.status(500).json({ error: "Failed to start retexturing" });
  }
}



