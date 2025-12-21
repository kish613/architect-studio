import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { jwtVerify } from "jose";

// Inline schema
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

const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  lastModified: true,
});

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

// Inline db connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
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
    // Only fetch projects owned by the current user
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, session.userId))
      .orderBy(desc(projects.lastModified));

    const projectsWithModels = await Promise.all(
      userProjects.map(async (project) => {
        const models = await db
          .select()
          .from(floorplanModels)
          .where(eq(floorplanModels.projectId, project.id))
          .orderBy(desc(floorplanModels.createdAt));
        return { ...project, models };
      })
    );

    res.json(projectsWithModels);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
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
    const data = insertProjectSchema.parse(req.body);

    // Automatically set the userId from the authenticated session
    const [project] = await db
      .insert(projects)
      .values({
        ...data,
        userId: session.userId,
      })
      .returning();

    console.log("Created project:", project.id, "for user:", session.userId);
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
}
