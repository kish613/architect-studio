import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { storage } from "../../serverless-lib/storage";
import { PLAN_LIMITS, type SubscriptionPlan } from "../../serverless-shared/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing stripe-signature" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  try {
    const buf = await buffer(req);
    const event = stripe.webhooks.constructEvent(
      buf,
      signature,
      webhookSecret
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const type = session.metadata?.type;

        if (!userId) {
          console.error("No userId in session metadata");
          break;
        }

        if (type === "pay_per_use") {
          // Add generations to user's account
          const count = parseInt(session.metadata?.count || "1", 10);
          const subscription = await storage.getSubscription(userId);
          if (subscription) {
            await storage.createOrUpdateSubscription(userId, {
              generationsLimit: subscription.generationsLimit + count,
            });
          }
        } else if (type === "subscription") {
          // Update subscription plan
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as unknown as Stripe.Subscription;
          const priceId = stripeSubscription.items.data[0]?.price.id;

          // Map price ID to plan (you'll need to configure these)
          let plan: SubscriptionPlan = "free";
          const price = await stripe.prices.retrieve(priceId);
          const productId = price.product as string;
          const product = await stripe.products.retrieve(productId);

          if (product.metadata?.plan) {
            plan = product.metadata.plan as SubscriptionPlan;
          }

          // Get billing period from subscription items
          const subscriptionItem = stripeSubscription.items.data[0];
          const periodStart = (subscriptionItem as any)?.current_period_start || 
                              (stripeSubscription as any).current_period_start || 
                              Math.floor(Date.now() / 1000);
          const periodEnd = (subscriptionItem as any)?.current_period_end || 
                            (stripeSubscription as any).current_period_end || 
                            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          await storage.createOrUpdateSubscription(userId, {
            plan,
            stripeSubscriptionId: session.subscription as string,
            generationsLimit: PLAN_LIMITS[plan],
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        // This would require a lookup - for now we'll skip this
        console.log("Subscription updated for customer:", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log("Subscription deleted for customer:", customerId);
        // Reset to free plan
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    res.status(400).json({ error: "Webhook processing error" });
  }
}



