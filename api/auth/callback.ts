import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getGoogleTokens,
  getGoogleUserInfo,
  upsertUser,
  createSession,
  getSessionCookieHeader,
} from "../../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    return res.redirect("/?error=auth_failed");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    // Get the host from the request to build the callback URL
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    // Exchange code for tokens
    const tokens = await getGoogleTokens(code, redirectUri);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // Create or update user in database
    const user = await upsertUser(googleUser);

    // Create session
    const sessionToken = await createSession({
      userId: user.id,
      email: user.email || "",
    });

    // Set cookie and redirect
    res.setHeader("Set-Cookie", getSessionCookieHeader(sessionToken));
    res.redirect("/");
  } catch (error) {
    console.error("Callback error:", error);
    res.redirect("/?error=auth_failed");
  }
}



