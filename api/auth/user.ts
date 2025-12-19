import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Inline schema
const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inline DB connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Inline auth utilities
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production"
);
const COOKIE_NAME = "auth_session";

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return cookies[COOKIE_NAME] || null;
}

async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}

async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cookieHeader = req.headers.cookie || null;
    const token = getSessionFromCookies(cookieHeader);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await verifySession(token);
    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(user);
  } catch (error: any) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}
