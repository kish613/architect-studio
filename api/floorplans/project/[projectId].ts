import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanDesigns } from "../../../shared/schema.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { projectId } = req.query;
  const pid = parseInt(projectId as string);
  if (isNaN(pid)) return res.status(400).json({ error: "Invalid project ID" });

  const session = await requireAuth(req, res);
  if (!session) return;

  try {
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
