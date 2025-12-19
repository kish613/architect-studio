import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT } from "jose";
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

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

async function getGoogleTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google tokens: ${error}`);
  }
  return response.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to get Google user info");
  return response.json();
}

async function upsertUser(googleUser: GoogleUserInfo) {
  const existingUsers = await db.select().from(users).where(eq(users.email, googleUser.email));
  
  if (existingUsers.length > 0) {
    const [updated] = await db
      .update(users)
      .set({
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        profileImageUrl: googleUser.picture,
        updatedAt: new Date(),
      })
      .where(eq(users.email, googleUser.email))
      .returning();
    return updated;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: googleUser.id,
      email: googleUser.email,
      firstName: googleUser.given_name,
      lastName: googleUser.family_name,
      profileImageUrl: googleUser.picture,
    })
    .returning();
  return newUser;
}

async function createSession(payload: { userId: string; email: string }): Promise<string> {
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error } = req.query;

  if (error) {
    return res.redirect("/?error=auth_failed");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    const tokens = await getGoogleTokens(code, redirectUri);
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    const user = await upsertUser(googleUser);
    const sessionToken = await createSession({
      userId: user.id,
      email: user.email || "",
    });

    res.setHeader("Set-Cookie", getSessionCookieHeader(sessionToken));
    res.redirect("/");
  } catch (err: any) {
    console.error("Callback error:", err);
    res.redirect("/?error=auth_failed");
  }
}
