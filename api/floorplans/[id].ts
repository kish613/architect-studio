import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { requireAuth } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { floorplanDesigns } from "../../shared/schema.js";
import { ensurePascalScene } from "../../shared/pascal-load.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  const session = await requireAuth(req, res);
  if (!session) return;

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
      if (sceneData !== undefined) {
        updates.sceneData = JSON.stringify(ensurePascalScene(sceneData).sceneData);
      }
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
      const diagnostics = (error as Error & { diagnostics?: unknown }).diagnostics;
      if (diagnostics) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid Pascal scene data",
          diagnostics,
        });
      }
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
