import type { VercelRequest, VercelResponse } from "@vercel/node";

// #region agent log H1 - Check module import
let authModule: any = null;
let importError: string | null = null;
try {
  authModule = await import("../../lib/auth");
} catch (e: any) {
  importError = e?.message || String(e);
}
// #endregion

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log H1
  if (importError) {
    return res.status(500).json({
      endpoint: "callback",
      hypothesis: "H1",
      error: "Module import failed",
      message: importError,
      envCheck: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      },
    });
  }
  // #endregion

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

    // #region agent log H4
    console.log("[DEBUG] Getting tokens...");
    // #endregion
    const tokens = await authModule.getGoogleTokens(code, redirectUri);

    // #region agent log H4
    console.log("[DEBUG] Getting user info...");
    // #endregion
    const googleUser = await authModule.getGoogleUserInfo(tokens.access_token);

    // #region agent log H4
    console.log("[DEBUG] Upserting user...");
    // #endregion
    const user = await authModule.upsertUser(googleUser);

    // #region agent log H4
    console.log("[DEBUG] Creating session...");
    // #endregion
    const sessionToken = await authModule.createSession({
      userId: user.id,
      email: user.email || "",
    });

    res.setHeader("Set-Cookie", authModule.getSessionCookieHeader(sessionToken));
    res.redirect("/");
  } catch (error: any) {
    // #region agent log H4
    return res.status(500).json({
      endpoint: "callback",
      hypothesis: "H4",
      error: "Callback processing failed",
      message: error?.message || String(error),
      stack: error?.stack,
    });
    // #endregion
  }
}



