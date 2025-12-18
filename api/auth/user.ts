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
      endpoint: "user",
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

  try {
    const cookieHeader = req.headers.cookie || null;
    const token = authModule.getSessionFromCookies(cookieHeader);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const session = await authModule.verifySession(token);
    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await authModule.getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json(user);
  } catch (error: any) {
    // #region agent log H3
    return res.status(500).json({
      endpoint: "user",
      hypothesis: "H3",
      error: "User fetch failed",
      message: error?.message || String(error),
      stack: error?.stack,
    });
    // #endregion
  }
}



