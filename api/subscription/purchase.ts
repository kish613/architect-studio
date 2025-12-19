import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { storage } from "../../serverless-lib/storage";
import {
  getSessionFromCookies,
  verifySession,
  getUserById,
} from "../../serverless-lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

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

  const user = await getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { priceId, count } = req.body || {};
    if (!priceId) {
      return res.status(400).json({ error: "Price ID required" });
    }

    let subscription = await storage.getSubscription(user.id);
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await storage.createOrUpdateSubscription(user.id, {
        stripeCustomerId: customerId,
      });
    }

    const protocol =
      req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: count || 1 }],
      mode: "payment",
      success_url: `${baseUrl}/pricing?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        type: "pay_per_use",
        count: String(count || 1),
      },
    });

    res.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}



