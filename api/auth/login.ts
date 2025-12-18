import type { VercelRequest, VercelResponse } from "@vercel/node";

// #region agent log H2 H3
let authModule: any = null;
let importError: Error | null = null;
try {
  authModule = require("../../lib/auth");
} catch (e) {
  importError = e instanceof Error ? e : new Error(String(e));
}
// #endregion

export default function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log H2 H3
  if (importError) {
    console.error("[DEBUG H2/H3] Module import failed:", importError.message);
    return res.status(500).json({
      hypothesis: "H2/H3",
      error: "Module import failed",
      message: importError.message,
      stack: importError.stack,
    });
  }
  // #endregion

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // #region agent log H1
  const envCheck = {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
  };
  console.log("[DEBUG H1] Environment variables check:", envCheck);
  // #endregion

  // #region agent log H1
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      hypothesis: "H1",
      error: "GOOGLE_CLIENT_ID not set",
      envCheck,
    });
  }
  // #endregion

  // #region agent log H5
  const headers = {
    host: req.headers.host,
    xForwardedProto: req.headers["x-forwarded-proto"],
    xForwardedHost: req.headers["x-forwarded-host"],
  };
  console.log("[DEBUG H5] Request headers:", headers);
  // #endregion

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    // #region agent log H4
    console.log("[DEBUG H4] Attempting getGoogleOAuthURL with redirectUri:", redirectUri);
    // #endregion

    const authUrl = authModule.getGoogleOAuthURL(redirectUri);

    // #region agent log H4
    console.log("[DEBUG H4] Generated authUrl:", authUrl?.substring(0, 100) + "...");
    // #endregion

    res.redirect(authUrl);
  } catch (error) {
    // #region agent log H4
    console.error("[DEBUG H4] getGoogleOAuthURL threw:", error);
    return res.status(500).json({
      hypothesis: "H4",
      error: "getGoogleOAuthURL failed",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // #endregion
  }
}



