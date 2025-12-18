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
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    // #region agent log
    console.log("[DEBUG] Getting tokens...");
    // #endregion
    const tokens = await getGoogleTokens(code, redirectUri);

    // #region agent log
    console.log("[DEBUG] Getting user info...");
    // #endregion
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // #region agent log
    console.log("[DEBUG] Upserting user...");
    // #endregion
    const user = await upsertUser(googleUser);

    // #region agent log
    console.log("[DEBUG] Creating session...");
    // #endregion
    const sessionToken = await createSession({
      userId: user.id,
      email: user.email || "",
    });

    res.setHeader("Set-Cookie", getSessionCookieHeader(sessionToken));
    res.redirect("/");
  } catch (error: any) {
    // #region agent log
    console.error("[DEBUG] Callback error:", error);
    return res.status(500).json({
      endpoint: "callback",
      error: "Callback processing failed",
      message: error?.message || String(error),
    });
    // #endregion
  }
}



