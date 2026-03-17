import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { floorplanDesigns } from "../../shared/schema.js";

const createSchema = z.object({
  name: z.string().min(1).default("Untitled Floorplan"),
  projectId: z.number().optional(),
  sceneData: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method === "POST") {
    try {
      const data = createSchema.parse(req.body);
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
