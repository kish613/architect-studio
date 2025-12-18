import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleOAuthURL } from "../../lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if required env vars are set
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID is not set");
      return res.status(500).json({ 
        error: "OAuth not configured", 
        details: "GOOGLE_CLIENT_ID environment variable is missing" 
      });
    }

    // Get the host from the request to build the callback URL
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    console.log("OAuth redirect URI:", redirectUri);
    
    const authUrl = getGoogleOAuthURL(redirectUri);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      error: "Failed to initiate login",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}



