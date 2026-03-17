import { jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

export async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET environment variable is required");
    }
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<{ userId: string } | null> {
  const token = getSessionFromCookies(req.headers.cookie ?? null);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  const session = await verifySession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid session" });
    return null;
  }
  return session;
}
