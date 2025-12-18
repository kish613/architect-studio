import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../lib/storage";
import {
  getSessionFromCookies,
  verifySession,
  getUserById,
} from "../../lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
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
    let subscription = await storage.getSubscription(user.id);

    if (!subscription) {
      subscription = await storage.createOrUpdateSubscription(user.id, {});
    }

    res.json({
      plan: subscription.plan,
      generationsUsed: subscription.generationsUsed,
      generationsLimit: subscription.generationsLimit,
      canGenerate: subscription.generationsUsed < subscription.generationsLimit,
      stripeCustomerId: subscription.stripeCustomerId,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
}



