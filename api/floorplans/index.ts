import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { z } from "zod";

const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull().default("Untitled Floorplan"),
  sceneData: text("scene_data").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET environment variable is required");
    }
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

const createSchema = z.object({
  name: z.string().min(1).default("Untitled Floorplan"),
  projectId: z.number().optional(),
  sceneData: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "POST") {
    try {
      const data = createSchema.parse(req.body);
      const db = getDb();
      const [floorplan] = await db
        .insert(floorplanDesigns)
        .values({
          userId: session.userId,
          name: data.name,
          projectId: data.projectId ?? null,
          sceneData: data.sceneData || '{"nodes":{},"rootNodeIds":[]}',
        })
        .returning();
      return res.status(201).json(floorplan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error creating floorplan:", error);
      return res.status(500).json({ error: "Failed to create floorplan" });
    }
  }

  if (req.method === "GET") {
    try {
      const db = getDb();
      const designs = await db
        .select()
        .from(floorplanDesigns)
        .where(eq(floorplanDesigns.userId, session.userId))
        .orderBy(desc(floorplanDesigns.updatedAt));
      return res.json(designs);
    } catch (error) {
      console.error("Error fetching floorplans:", error);
      return res.status(500).json({ error: "Failed to fetch floorplans" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
