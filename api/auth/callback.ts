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

// Inline auth utilities
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

// #region agent log
const DEBUG_ENDPOINT = "http://127.0.0.1:7243/ingest/e7eaf908-54f8-4b13-9a3f-83e463d9b005";
function debugLog(location: string, message: string, data: any, hypothesisId: string) {
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, message, data, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId })
  }).catch(() => {});
}
// #endregion

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

async function getGoogleTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
  // #region agent log
  debugLog('callback.ts:getGoogleTokens', 'Starting token exchange', { redirectUri, hasClientId: !!process.env.GOOGLE_CLIENT_ID, hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET }, 'H1');
  // #endregion
  
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
    // #region agent log
    debugLog('callback.ts:getGoogleTokens', 'Token exchange failed', { status: response.status, error }, 'H1');
    // #endregion
    throw new Error(`Failed to get Google tokens: ${error}`);
  }
  // #region agent log
  debugLog('callback.ts:getGoogleTokens', 'Token exchange succeeded', { status: response.status }, 'H1');
  // #endregion
  return response.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Failed to get Google user info");
  return response.json();
}

async function upsertUser(googleUser: GoogleUserInfo, db: ReturnType<typeof getDb>) {
  // #region agent log
  debugLog('callback.ts:upsertUser', 'Starting user upsert', { email: googleUser.email, id: googleUser.id }, 'H2');
  // #endregion
  
  const existingUsers = await db.select().from(users).where(eq(users.email, googleUser.email));
  
  // #region agent log
  debugLog('callback.ts:upsertUser', 'Existing users query result', { count: existingUsers.length }, 'H2');
  // #endregion
  
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
    // #region agent log
    debugLog('callback.ts:upsertUser', 'User updated', { userId: updated.id }, 'H2');
    // #endregion
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
  // #region agent log
  debugLog('callback.ts:upsertUser', 'New user created', { userId: newUser.id }, 'H2');
  // #endregion
  return newUser;
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
  // #region agent log
  debugLog('callback.ts:handler', 'Handler started', { method: req.method, hasCode: !!req.query.code, hasError: !!req.query.error }, 'H1');
  // #endregion

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error } = req.query;

  if (error) {
    // #region agent log
    debugLog('callback.ts:handler', 'OAuth error from Google', { error }, 'H1');
    // #endregion
    return res.redirect("/?error=auth_failed");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    // #region agent log
    debugLog('callback.ts:handler', 'Computed redirect URI', { protocol, host, redirectUri }, 'H1');
    // #endregion

    const tokens = await getGoogleTokens(code, redirectUri);
    
    // #region agent log
    debugLog('callback.ts:handler', 'Got tokens, fetching user info', {}, 'H1');
    // #endregion
    
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    
    // #region agent log
    debugLog('callback.ts:handler', 'Got Google user', { email: googleUser.email }, 'H2');
    // #endregion
    
    const db = getDb();
    const user = await upsertUser(googleUser, db);
    
    // #region agent log
    debugLog('callback.ts:handler', 'User upserted, creating session', { userId: user.id }, 'H3');
    // #endregion
    
    const sessionToken = await createSession({
      userId: user.id,
      email: user.email || "",
    });

    // #region agent log
    debugLog('callback.ts:handler', 'Session created, setting cookie', { tokenLength: sessionToken.length }, 'H3');
    // #endregion

    res.setHeader("Set-Cookie", getSessionCookieHeader(sessionToken));
    res.redirect("/");
  } catch (err: any) {
    // #region agent log
    debugLog('callback.ts:handler', 'Callback error', { message: err.message, stack: err.stack }, 'H1');
    // #endregion
    console.error("Callback error:", err);
    res.redirect("/?error=auth_failed");
  }
}
