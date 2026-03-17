import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { put } from "@vercel/blob";

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
  const sqlClient = neon(process.env.DATABASE_URL);
  return drizzle(sqlClient);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = getDb();

  if (req.method === "GET") {
    try {
      const [floorplan] = await db
        .select()
        .from(floorplanDesigns)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)));
      if (!floorplan) return res.status(404).json({ error: "Floorplan not found" });
      return res.json(floorplan);
    } catch (error) {
      console.error("Error fetching floorplan:", error);
      return res.status(500).json({ error: "Failed to fetch floorplan" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { sceneData, thumbnail, name } = req.body as {
        sceneData?: string;
        thumbnail?: string;
        name?: string;
      };

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (sceneData !== undefined) updates.sceneData = sceneData;
      if (name !== undefined) updates.name = name;

      if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("data:")) {
        const base64Data = thumbnail.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const blob = await put(`floorplans/${floorplanId}/thumbnail.png`, buffer, {
          access: "public",
          contentType: "image/png",
        });
        updates.thumbnailUrl = blob.url;
      }

      const [updated] = await db
        .update(floorplanDesigns)
        .set(updates)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Floorplan not found" });
      return res.json(updated);
    } catch (error) {
      console.error("Error saving floorplan:", error);
      return res.status(500).json({ error: "Failed to save floorplan" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(floorplanDesigns)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)));
      return res.status(204).send("");
    } catch (error) {
      console.error("Error deleting floorplan:", error);
      return res.status(500).json({ error: "Failed to delete floorplan" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
