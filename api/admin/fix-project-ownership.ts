import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp } from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";
import { jwtVerify } from "jose";

// Inline schema
const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
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

/**
 * ONE-TIME MIGRATION: Fix existing projects with null userId
 * This endpoint assigns all projects with null userId to the current authenticated user
 *
 * Call this once to claim your existing projects, then delete this file
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed - use POST" });
  }

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

    // Find all projects with null userId
    const orphanedProjects = await db
      .select()
      .from(projects)
      .where(isNull(projects.userId));

    console.log(`Found ${orphanedProjects.length} projects with null userId`);

    if (orphanedProjects.length === 0) {
      return res.json({
        message: "No projects need fixing",
        updated: 0,
      });
    }

    // Update all orphaned projects to belong to the current user
    const projectIds = orphanedProjects.map((p) => p.id);

    for (const project of orphanedProjects) {
      await db
        .update(projects)
        .set({ userId: session.userId })
        .where(isNull(projects.userId));
    }

    console.log(`Updated ${orphanedProjects.length} projects to userId: ${session.userId}`);

    res.json({
      message: `Successfully assigned ${orphanedProjects.length} project(s) to your account`,
      updated: orphanedProjects.length,
      projectIds,
      userId: session.userId,
    });
  } catch (error) {
    console.error("Error fixing project ownership:", error);
    res.status(500).json({ error: "Failed to fix project ownership" });
  }
}
