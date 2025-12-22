import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import {
  getSubscription,
  addCredits,
  updateSubscriptionPlan,
  cancelSubscription,
  updateStripeCustomerId,
  getUserIdFromStripeCustomer,
  resetBillingPeriod,
  clearGracePeriod,
  setGracePeriod,
} from "../../lib/subscription-manager";
import { PLAN_LIMITS, type SubscriptionPlan, userSubscriptions } from "../../shared/schema";
import { db } from "../../lib/db";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
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

    console.log(`Received webhook: ${event.type}`);

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

        // Store Stripe customer ID if not already stored
        if (session.customer) {
          await updateStripeCustomerId(userId, session.customer as string);
        }

        if (type === "pay_per_use") {
          // Add generations to user's account
          const count = parseInt(session.metadata?.count || "1", 10);
          console.log(`Adding ${count} credits to user ${userId}`);
          await addCredits(userId, count);
        } else if (type === "subscription") {
          // Update subscription plan
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as unknown as Stripe.Subscription;
          const priceId = stripeSubscription.items.data[0]?.price.id;

          // Map price ID to plan
          let plan: SubscriptionPlan = "free";
          const price = await stripe.prices.retrieve(priceId);
          const productId = price.product as string;
          const product = await stripe.products.retrieve(productId);

          if (product.metadata?.plan) {
            plan = product.metadata.plan as SubscriptionPlan;
          }

          console.log(`Updating user ${userId} to ${plan} plan`);
          await updateSubscriptionPlan(userId, plan, session.subscription as string);

          // Set billing period
          const subscription = await getSubscription(userId);
          const periodStart = (stripeSubscription as any).current_period_start || Math.floor(Date.now() / 1000);
          const periodEnd = (stripeSubscription as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          // Update billing period in database
          await db.update(userSubscriptions).set({
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
            updatedAt: new Date(),
          }).where(eq(userSubscriptions.userId, userId));
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const userId = await getUserIdFromStripeCustomer(customerId);
        if (!userId) {
          console.error("No user found for Stripe customer:", customerId);
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId) {
          console.error("No price ID found in subscription");
          break;
        }

        // Get plan from product metadata
        let plan: SubscriptionPlan = "free";
        const price = await stripe.prices.retrieve(priceId);
        const productId = price.product as string;
        const product = await stripe.products.retrieve(productId);

        if (product.metadata?.plan) {
          plan = product.metadata.plan as SubscriptionPlan;
        }

        console.log(`Subscription updated for user ${userId} to ${plan} plan`);
        await updateSubscriptionPlan(userId, plan, subscription.id);

        // Update billing period
        await db.update(userSubscriptions).set({
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          updatedAt: new Date(),
        }).where(eq(userSubscriptions.userId, userId));

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const userId = await getUserIdFromStripeCustomer(customerId);
        if (!userId) {
          console.error("No user found for Stripe customer:", customerId);
          break;
        }

        console.log(`Subscription canceled for user ${userId}, downgrading to free plan`);
        await cancelSubscription(userId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const userId = await getUserIdFromStripeCustomer(customerId);
        if (!userId) {
          console.error("No user found for Stripe customer:", customerId);
          break;
        }

        console.log(`Invoice paid for user ${userId}, resetting billing period`);

        // Clear grace period if user was past_due
        await clearGracePeriod(userId, "active");

        // Reset credits for new billing period
        await resetBillingPeriod(userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const userId = await getUserIdFromStripeCustomer(customerId);
        if (!userId) {
          console.error("No user found for Stripe customer:", customerId);
          break;
        }

        console.log(`Payment failed for user ${userId} - starting grace period`);

        // Set 3-day grace period
        await setGracePeriod(userId);

        // TODO: Send email notification about payment failure
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
