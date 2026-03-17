import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

export const config = { api: { bodyParser: false } };

// ─── Inline DB schema ─────────────────────────────────────

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

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

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

async function readBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  // Ownership check — floorplan must belong to this user
  const db = getDb();
  const [floorplan] = await db
    .select({ id: floorplanDesigns.id })
    .from(floorplanDesigns)
    .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)));

  if (!floorplan) {
    return res.status(404).json({ error: "Floorplan not found" });
  }

  try {
    const body = await readBody(req);

    // Size limit: 10 MB
    if (body.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large. Maximum 10MB." });
    }

    const contentType = req.headers["content-type"] || "application/octet-stream";
    const ext = contentType.split("/")[1]?.split(";")[0] || "bin";

    const blob = await put(
      `floorplans/${floorplanId}/assets/${Date.now()}.${ext}`,
      body,
      { access: "public", contentType }
    );

    return res.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading asset:", error);
    return res.status(500).json({ error: "Failed to upload asset" });
  }
}
