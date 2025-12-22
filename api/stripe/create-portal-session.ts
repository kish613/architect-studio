import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { jwtVerify } from "jose";
import { getSubscription } from "../../lib/subscription-manager";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Inline auth helpers
function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(token);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Get user's subscription to find Stripe customer ID
    const subscription = await getSubscription(session.userId);

    if (!subscription.stripeCustomerId) {
      return res.status(400).json({
        error: "No Stripe customer found",
        message: "You need to subscribe first before accessing the billing portal.",
      });
    }

    // Determine return URL
    const returnUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/settings`
      : `${req.headers.origin || "http://localhost:3000"}/settings`;

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    console.log(`Created billing portal session for user ${session.userId}`);

    res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    res.status(500).json({
      error: "Failed to create billing portal session",
      details: error.message,
    });
  }
}
