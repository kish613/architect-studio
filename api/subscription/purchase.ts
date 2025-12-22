import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// Inline schema
const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Inline db connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

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
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { priceId, count } = req.body || {};
    if (!priceId) {
      return res.status(400).json({ error: "Price ID required" });
    }

    let [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id));
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      if (subscription) {
        await db.update(userSubscriptions).set({ stripeCustomerId: customerId }).where(eq(userSubscriptions.userId, user.id));
      } else {
        await db.insert(userSubscriptions).values({
          userId: user.id,
          plan: "free",
          generationsLimit: 2,
          stripeCustomerId: customerId,
        });
      }
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
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
