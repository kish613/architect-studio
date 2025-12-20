import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const MESHY_API_URL = "https://api.meshy.ai";

// Inline schema
const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
});

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

// Inline auth helpers
function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

// Inline meshy task creation
async function createImageTo3DTask(imageUrl: string) {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY is not configured");
  }

  const response = await fetch(`${MESHY_API_URL}/openapi/v1/image-to-3d`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      ai_model: "latest",
      enable_pbr: true,
      should_remesh: true,
      topology: "quad",
      target_polycount: 300000,
      texture_richness: "high",
      art_style: "realistic",
      texture_prompt:
        "Photorealistic architectural interior: warm oak hardwood floors with visible grain, smooth matte white walls, fabric upholstery with weave texture, brushed metal fixtures, marble countertops with veining, glass with reflections, detailed wood furniture grain, ceramic tiles with grout, realistic PBR materials with accurate roughness and metallic properties, 4K quality textures",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Meshy API error:", error);
    return { success: false, error: `Meshy API error: ${response.status}` };
  }

  const data = await response.json();
  return {
    success: true,
    taskId: data.result,
  };
}

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

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
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
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.isometricUrl) {
      return res.status(400).json({ error: "Isometric image not yet generated" });
    }

    // Update status
    await db.update(floorplanModels).set({ status: "generating_3d" }).where(eq(floorplanModels.id, modelId));

    // Use the isometric URL directly (it's a public Vercel Blob URL)
    const imageUrl = model.isometricUrl;

    // Create Meshy task
    const result = await createImageTo3DTask(imageUrl);

    if (result.success && result.taskId) {
      const [updatedModel] = await db.update(floorplanModels).set({
        meshyTaskId: result.taskId,
      }).where(eq(floorplanModels.id, modelId)).returning();
      res.json(updatedModel);
    } else {
      await db.update(floorplanModels).set({ status: "failed" }).where(eq(floorplanModels.id, modelId));
      res.status(500).json({
        error: result.error || "Failed to start 3D generation",
      });
    }
  } catch (error) {
    console.error("Error starting 3D generation:", error);
    res.status(500).json({ error: "Failed to start 3D generation" });
  }
}
