import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const MESHY_API_URL = "https://api.meshy.ai";

// Inline schema
const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  originalUrl: text("original_url").notNull(),
  isometricUrl: text("isometric_url"),
  isometricPrompt: text("isometric_prompt"),
  model3dUrl: text("model_3d_url"),
  baseModel3dUrl: text("base_model_3d_url"),
  meshyTaskId: text("meshy_task_id"),
  texturePrompt: text("texture_prompt"),
  retextureTaskId: text("retexture_task_id"),
  retextureUsed: boolean("retexture_used").notNull().default(false),
  status: text("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inline db connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

// Inline meshy retexture status check
async function checkRetextureTaskStatus(taskId: string) {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY is not configured");
  }

  const response = await fetch(
    `${MESHY_API_URL}/openapi/v1/retexture/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Meshy Retexture API error:", error);
    return { success: false, status: "failed", error: `Meshy API error: ${response.status}` };
  }

  const data = await response.json();

  if (data.status === "SUCCEEDED") {
    return {
      success: true,
      status: "completed",
      modelUrl: data.model_urls?.glb || data.model_urls?.obj,
    };
  } else if (data.status === "FAILED") {
    return {
      success: false,
      status: "failed",
      error: data.task_error?.message || "Retexture failed",
    };
  } else {
    return {
      success: true,
      status: data.status.toLowerCase(),
    };
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
    const db = getDb();
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // If there's a retexture task, check its status
    if (model.retextureTaskId && model.status === "retexturing") {
      const taskResult = await checkRetextureTaskStatus(model.retextureTaskId);

      if (taskResult.status === "completed" && taskResult.modelUrl) {
        const [updatedModel] = await db.update(floorplanModels).set({
          status: "completed",
          model3dUrl: taskResult.modelUrl,
          retextureTaskId: null, // Clear after completion
        }).where(eq(floorplanModels.id, modelId)).returning();
        return res.json(updatedModel);
      } else if (taskResult.status === "failed") {
        // Revert to completed since we still have the previous model
        await db.update(floorplanModels).set({
          status: "completed",
          retextureTaskId: null,
        }).where(eq(floorplanModels.id, modelId));
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
