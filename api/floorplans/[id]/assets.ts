import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanDesigns } from "../../../shared/schema.js";

export const config = { api: { bodyParser: false } };

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

  const session = await requireAuth(req, res);
  if (!session) return;

  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  // Ownership check — floorplan must belong to this user
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
