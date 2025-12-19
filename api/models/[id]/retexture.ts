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
  email: text("email").notNull().unique(),
  name: text("name"),
  picture: text("picture"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  generationsUsed: integer("generations_used").notNull().default(0),
  generationsLimit: integer("generations_limit").notNull().default(2),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

// Inline meshy retexture task creation
async function createRetextureTask(modelUrl: string, texturePrompt: string) {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY is not configured");
  }

  const response = await fetch(`${MESHY_API_URL}/openapi/v1/retexture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_url: modelUrl,
      text_style_prompt: texturePrompt,
      enable_original_uv: true,
      enable_pbr: true,
      ai_model: "latest",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Meshy Retexture API error:", error);
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
    const { texturePrompt } = req.body || {};

    if (!texturePrompt || typeof texturePrompt !== "string") {
      return res.status(400).json({ error: "Texture prompt is required" });
    }

    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
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
    let [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    if (!subscription) {
      [subscription] = await db.insert(userSubscriptions).values({
        userId,
        plan: "free",
        generationsLimit: 2,
      }).returning();
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
    await db.update(floorplanModels).set({
      status: "retexturing",
      texturePrompt: texturePrompt,
      baseModel3dUrl: baseModelUrl,
    }).where(eq(floorplanModels.id, modelId));

    // Create retexture task with the existing model URL
    const result = await createRetextureTask(model.model3dUrl, texturePrompt);

    if (result.success && result.taskId) {
      // Only increment credits and mark retextureUsed on successful task creation
      await db.update(userSubscriptions).set({
        generationsUsed: subscription.generationsUsed + 1,
        updatedAt: new Date(),
      }).where(eq(userSubscriptions.userId, userId));

      const [updatedModel] = await db.update(floorplanModels).set({
        retextureTaskId: result.taskId,
        retextureUsed: true,
      }).where(eq(floorplanModels.id, modelId)).returning();
      res.json(updatedModel);
    } else {
      // Revert status on failure - retexture can still be retried
      await db.update(floorplanModels).set({
        status: "completed",
        texturePrompt: null,
      }).where(eq(floorplanModels.id, modelId));
      res.status(500).json({
        error: result.error || "Failed to start retexturing",
      });
    }
  } catch (error) {
    console.error("Error starting retexture:", error);
    res.status(500).json({ error: "Failed to start retexturing" });
  }
}
