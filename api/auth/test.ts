import type { VercelRequest, VercelResponse } from "@vercel/node";
// Static import to test bundling
import { getSessionFromCookies } from "../../serverless-lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    success: true,
    message: "Static import worked!",
    functionExists: typeof getSessionFromCookies === "function",
  });
}

