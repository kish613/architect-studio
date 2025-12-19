import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSessionFromCookies,
  verifySession,
  getUserById,
} from "../../serverless-lib/auth";

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
    // #region agent log
    console.error("[DEBUG] User fetch error:", error);
    return res.status(500).json({
      endpoint: "user",
      error: "User fetch failed",
      message: error?.message || String(error),
    });
    // #endregion
  }
}



