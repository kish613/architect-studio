import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_lib/storage";
import { generateIsometricFloorplan } from "../../_lib/gemini";
import {
  getSessionFromCookies,
  verifySession,
  getUserById,
} from "../../_lib/auth";

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

    const model = await storage.getModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const project = await storage.getProject(model.projectId);
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { prompt } = req.body || {};

    // Update status to generating
    await storage.updateModel(modelId, {
      status: "generating_isometric",
      isometricPrompt: prompt || null,
    });

    // Fetch the original image from the URL
    const imageResponse = await fetch(model.originalUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch original image");
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    // Generate isometric view
    const result = await generateIsometricFloorplan(imageBuffer, mimeType, prompt);

    if (result.success && result.imageUrl) {
      // Increment usage count on successful generation
      await storage.createOrUpdateSubscription(userId, {
        generationsUsed: subscription.generationsUsed + 1,
      });

      const updatedModel = await storage.updateModel(modelId, {
        status: "isometric_ready",
        isometricUrl: result.imageUrl,
      });
      res.json(updatedModel);
    } else {
      await storage.updateModel(modelId, { status: "failed" });
      res.status(500).json({
        error: result.error || "Failed to generate isometric view",
      });
    }
  } catch (error) {
    console.error("Error generating isometric:", error);
    res.status(500).json({ error: "Failed to generate isometric view" });
  }
}



