import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

// Inline schema
const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  generationsUsed: integer("generations_used").notNull().default(0),
  generationsLimit: integer("generations_limit").notNull().default(2),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'studio';

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: 2,
  starter: 5,
  pro: 20,
  studio: 60,
};

// Inline db connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

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
    const db = getDb();
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
          const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
          if (subscription) {
            await db.update(userSubscriptions).set({
              generationsLimit: subscription.generationsLimit + count,
              updatedAt: new Date(),
            }).where(eq(userSubscriptions.userId, userId));
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

          // Get billing period from subscription
          const periodStart = stripeSubscription.current_period_start || Math.floor(Date.now() / 1000);
          const periodEnd = stripeSubscription.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          const [existing] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
          if (existing) {
            await db.update(userSubscriptions).set({
              plan,
              stripeSubscriptionId: session.subscription as string,
              generationsLimit: PLAN_LIMITS[plan],
              currentPeriodStart: new Date(periodStart * 1000),
              currentPeriodEnd: new Date(periodEnd * 1000),
              updatedAt: new Date(),
            }).where(eq(userSubscriptions.userId, userId));
          } else {
            await db.insert(userSubscriptions).values({
              userId,
              plan,
              stripeSubscriptionId: session.subscription as string,
              generationsLimit: PLAN_LIMITS[plan],
              currentPeriodStart: new Date(periodStart * 1000),
              currentPeriodEnd: new Date(periodEnd * 1000),
            });
          }
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
