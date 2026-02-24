import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL parameter required" });
    }

    // Only allow Meshy and Vercel Blob URLs
    const isAllowed =
      url.includes("meshy.ai") ||
      url.includes(".public.blob.vercel-storage.com");
    if (!isAllowed) {
      return res.status(403).json({ error: "URL not allowed" });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch model" });
    }

    const contentType =
      response.headers.get("content-type") || "model/gltf-binary";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error proxying model:", error);
    res.status(500).json({ error: "Failed to proxy model" });
  }
}




