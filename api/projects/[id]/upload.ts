import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { storage } from "../../../lib/storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const projectId = parseInt(id as string);

  if (isNaN(projectId)) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get content type
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Content type must be multipart/form-data" });
    }

    // Read the raw body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // Parse multipart form data manually (simplified)
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      return res.status(400).json({ error: "No boundary found in content-type" });
    }

    // Find the file content between boundaries
    const bodyStr = body.toString("binary");
    const parts = bodyStr.split(`--${boundary}`);

    let fileBuffer: Buffer | null = null;
    let filename = "floorplan";
    let fileMimeType = "image/png";

    for (const part of parts) {
      if (part.includes("Content-Disposition") && part.includes("filename=")) {
        // Extract filename
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }

        // Extract content type
        const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
        if (contentTypeMatch) {
          fileMimeType = contentTypeMatch[1].trim();
        }

        // Extract file content (after double CRLF)
        const contentStart = part.indexOf("\r\n\r\n");
        if (contentStart !== -1) {
          let content = part.slice(contentStart + 4);
          // Remove trailing CRLF
          if (content.endsWith("\r\n")) {
            content = content.slice(0, -2);
          }
          fileBuffer = Buffer.from(content, "binary");
        }
      }
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.some((type) => fileMimeType.includes(type.split("/")[1]))) {
      return res.status(400).json({ error: "Only image and PDF files are allowed" });
    }

    // Generate unique filename
    const ext = filename.split(".").pop() || "png";
    const uniqueFilename = `floorplan-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, fileBuffer, {
      access: "public",
      contentType: fileMimeType,
    });

    // Create model record
    const model = await storage.createModel({
      projectId,
      originalUrl: blob.url,
      status: "uploaded",
    });

    res.status(201).json(model);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
}



