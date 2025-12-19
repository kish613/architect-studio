import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../lib/storage";
import { createImageTo3DTask } from "../../lib/meshy";
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
    const model = await storage.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const project = await storage.getProject(model.projectId);
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.isometricUrl) {
      return res.status(400).json({ error: "Isometric image not yet generated" });
    }

    // Update status
    await storage.updateModel(modelId, { status: "generating_3d" });

    // Use the isometric URL directly (it's a public Vercel Blob URL)
    const imageUrl = model.isometricUrl;

    // Create Meshy task
    const result = await createImageTo3DTask(imageUrl);

    if (result.success && result.taskId) {
      const updatedModel = await storage.updateModel(modelId, {
        meshyTaskId: result.taskId,
      });
      res.json(updatedModel);
    } else {
      await storage.updateModel(modelId, { status: "failed" });
      res.status(500).json({
        error: result.error || "Failed to start 3D generation",
      });
    }
  } catch (error) {
    console.error("Error starting 3D generation:", error);
    res.status(500).json({ error: "Failed to start 3D generation" });
  }
}



