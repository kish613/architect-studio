import type { VercelRequest, VercelResponse } from "@vercel/node";
// Static import to test bundling
import { getSessionFromCookies } from "../lib/auth.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    success: true,
    message: "Static import worked!",
    functionExists: typeof getSessionFromCookies === "function",
  });
}

