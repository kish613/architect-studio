import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleOAuthURL } from "../../lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the host from the request to build the callback URL
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    const authUrl = getGoogleOAuthURL(redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to initiate login" });
  }
}



