import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { jwtVerify } from "jose";

export const config = { api: { bodyParser: false } };

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

  try {
    const body = await readBody(req);
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
