import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { floorplanDesigns } from "../../shared/schema.js";
import { ensurePascalScene } from "../../shared/pascal-load.js";
import { createEmptyScene } from "../../shared/pascal-scene.js";

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
      const canonicalScene = data.sceneData
        ? ensurePascalScene(data.sceneData).sceneData
        : createEmptyScene();
      const [floorplan] = await db
        .insert(floorplanDesigns)
        .values({
          userId: session.userId,
          name: data.name,
          projectId: data.projectId ?? null,
          sceneData: JSON.stringify(canonicalScene),
        })
        .returning();
      return res.status(201).json(floorplan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
      const diagnostics = (error as Error & { diagnostics?: unknown }).diagnostics;
      if (diagnostics) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid Pascal scene data",
          diagnostics,
        });
      }
      console.error("Error creating floorplan:", error);
      return res.status(500).json({ error: "Failed to create floorplan" });
    }
  }

  if (req.method === "GET") {
    try {
      // Light list — include new BIM-first asset URLs so the projects list
      // can badge rows with "BIM ready", "IFC available", etc. without
      // fetching every canonical JSON blob.
      const designs = await db
        .select({
          id: floorplanDesigns.id,
          name: floorplanDesigns.name,
          projectId: floorplanDesigns.projectId,
          userId: floorplanDesigns.userId,
          thumbnailUrl: floorplanDesigns.thumbnailUrl,
          sourceFileUrl: floorplanDesigns.sourceFileUrl,
          ifcUrl: floorplanDesigns.ifcUrl,
          fragmentsUrl: floorplanDesigns.fragmentsUrl,
          glbUrl: floorplanDesigns.glbUrl,
          createdAt: floorplanDesigns.createdAt,
          updatedAt: floorplanDesigns.updatedAt,
        })
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
