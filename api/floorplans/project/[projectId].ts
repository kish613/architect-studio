import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and, desc } from "drizzle-orm";
import { jwtVerify } from "jose";

const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { projectId } = req.query;
  const pid = parseInt(projectId as string);
  if (isNaN(pid)) return res.status(400).json({ error: "Invalid project ID" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  try {
    const db = getDb();
    const designs = await db
      .select()
      .from(floorplanDesigns)
      .where(and(eq(floorplanDesigns.projectId, pid), eq(floorplanDesigns.userId, session.userId)))
      .orderBy(desc(floorplanDesigns.updatedAt));
    return res.json(designs);
  } catch (error) {
    console.error("Error fetching project floorplans:", error);
    return res.status(500).json({ error: "Failed to fetch floorplans" });
  }
}
