import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClearSessionCookieHeader } from "../_lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear the session cookie
  res.setHeader("Set-Cookie", getClearSessionCookieHeader());
  res.redirect("/");
}



