import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { users } from "../serverless-shared/schema";
import { eq } from "drizzle-orm";
import type { User } from "../serverless-shared/models/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production"
);

const COOKIE_NAME = "auth_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

export interface SessionPayload {
  userId: string;
  email: string;
  exp?: number;
  [key: string]: unknown;
}

// Google OAuth configuration
export function getGoogleOAuthURL(redirectUri: string): string {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  const options = {
    redirect_uri: redirectUri,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

export async function getGoogleTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const url = "https://oauth2.googleapis.com/token";

  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Google tokens: ${error}`);
  }

  return response.json();
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get Google user info");
  }

  return response.json();
}

// JWT Session Management
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string): void {
  // This is for use in API routes - we return the cookie header value
  // The actual setting happens in the API route
}

export function getSessionCookieHeader(token: string): string {
  const cookieValue = `${COOKIE_NAME}=${token}; HttpOnly; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }SameSite=Lax; Max-Age=${COOKIE_OPTIONS.maxAge}; Path=/`;
  return cookieValue;
}

export function getClearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }SameSite=Lax; Max-Age=0; Path=/`;
}

export function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[COOKIE_NAME] || null;
}

// User management
export async function upsertUser(googleUser: GoogleUserInfo): Promise<User> {
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, googleUser.email));

  if (existingUsers.length > 0) {
    // Update existing user
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

  // Create new user
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

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

// Middleware helper to get current user from request
export async function getCurrentUser(
  request: Request
): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie");
  const token = getSessionFromCookies(cookieHeader);

  if (!token) {
    return null;
  }

  const session = await verifySession(token);
  if (!session) {
    return null;
  }

  return getUserById(session.userId);
}

// Helper to require authentication
export async function requireAuth(
  request: Request
): Promise<{ user: User } | { error: Response }> {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      error: new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { user };
}

