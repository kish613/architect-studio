import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";

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

    if (!model.baseModel3dUrl) {
      return res.status(400).json({ error: "No base model to revert to" });
    }

    const [updatedModel] = await db.update(floorplanModels).set({
      stage: "completed",
      status: "completed",
      model3dUrl: model.baseModel3dUrl,
      retextureTaskId: null,
      texturePrompt: null,
      finishedAt: new Date(),
      lastError: null,
    }).where(eq(floorplanModels.id, modelId)).returning();

    return res.json(updatedModel);
  } catch (error) {
    console.error("Error reverting texture:", error);
    return res.status(500).json({ error: "Failed to revert texture" });
  }
}
