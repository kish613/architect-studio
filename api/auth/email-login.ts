import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT } from "jose";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Inline schema (matches shared/models/auth.ts)
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  passwordHash: varchar("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const COOKIE_NAME = "auth_session";

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

async function createSession(payload: { userId: string; email: string }): Promise<string> {
  const JWT_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || "fallback-secret-change-in-production"
  );
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

function getSessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = getDb();

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user has a password (Google-only users won't)
    if (!user.passwordHash) {
      return res.status(401).json({
        error: "This account uses Google sign-in. Please use the Google button to log in.",
      });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session
    const sessionToken = await createSession({
      userId: user.id,
      email: user.email || "",
    });

    res.setHeader("Set-Cookie", getSessionCookieHeader(sessionToken));
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });
  } catch (err: any) {
    console.error("Email login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}
