import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "auth_session";

function getClearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }SameSite=Lax; Max-Age=0; Path=/`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Set-Cookie", getClearSessionCookieHeader());
  res.redirect("/");
}
