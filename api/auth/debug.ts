import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    },
    nodeVersion: process.version,
  };

  // Try to import lib/auth dynamically
  try {
    const auth = await import("../../lib/auth");
    diagnostics.authModule = {
      loaded: true,
      exports: Object.keys(auth),
    };
  } catch (e: any) {
    diagnostics.authModule = {
      loaded: false,
      error: e?.message,
      stack: e?.stack,
    };
  }

  // Try to import lib/db dynamically
  try {
    const db = await import("../../lib/db");
    diagnostics.dbModule = {
      loaded: true,
      exports: Object.keys(db),
    };
  } catch (e: any) {
    diagnostics.dbModule = {
      loaded: false,
      error: e?.message,
      stack: e?.stack,
    };
  }

  res.json(diagnostics);
}

