import { db } from "./db";
import { userSubscriptions, PLAN_LIMITS, type SubscriptionPlan, type UserSubscription } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Get user's subscription with automatic creation of free plan if not exists
 */
export async function getSubscription(userId: string): Promise<UserSubscription> {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!subscription) {
    // Auto-create free subscription for new users
    const [newSubscription] = await db
      .insert(userSubscriptions)
      .values({
        userId,
        plan: "free",
        generationsUsed: 0,
        generationsLimit: PLAN_LIMITS.free,
      })
      .returning();
    return newSubscription;
  }

  return subscription;
}

/**
 * Get full subscription status including whether user can generate
 */
export async function getSubscriptionStatus(userId: string) {
  const subscription = await getSubscription(userId);

  // Check if billing period needs reset
  await checkAndResetBillingPeriod(userId);

  // Refetch after potential reset
  const updatedSubscription = await getSubscription(userId);

  const remaining = updatedSubscription.generationsLimit - updatedSubscription.generationsUsed;
  const canGenerate = remaining > 0;
  const usagePercentage = (updatedSubscription.generationsUsed / updatedSubscription.generationsLimit) * 100;

  return {
    ...updatedSubscription,
    remaining,
    canGenerate,
    usagePercentage,
    isNearLimit: usagePercentage >= 80,
  };
}

/**
 * Check if user can generate (has credits available)
 * Considers grace period for past_due subscriptions
 */
export async function canUserGenerate(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  // Check if billing period needs reset first
  await checkAndResetBillingPeriod(userId);

  // Refetch after potential reset
  const updatedSubscription = await getSubscription(userId);

  // If subscription is past_due, check grace period
  if (updatedSubscription.subscriptionStatus === 'past_due') {
    const now = new Date();
    if (updatedSubscription.gracePeriodEndsAt && now < updatedSubscription.gracePeriodEndsAt) {
      // Still in grace period - allow generations with warning
      return updatedSubscription.generationsUsed < updatedSubscription.generationsLimit;
    } else {
      // Grace period expired - no generations allowed
      return false;
    }
  }

  // If subscription is canceled or unpaid, no generations
  if (updatedSubscription.subscriptionStatus === 'canceled' ||
      updatedSubscription.subscriptionStatus === 'unpaid') {
    return false;
  }

  return updatedSubscription.generationsUsed < updatedSubscription.generationsLimit;
}

/**
 * Deduct a credit from user's account (atomic operation)
 * Returns true if successful, false if insufficient credits
 */
export async function deductCredit(userId: string): Promise<boolean> {
  try {
    // Use transaction with row-level locking to prevent race conditions
    const result = await db.transaction(async (tx) => {
      const [subscription] = await tx
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .for("update"); // Row-level lock

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (subscription.generationsUsed >= subscription.generationsLimit) {
        return false;
      }

      await tx
        .update(userSubscriptions)
        .set({
          generationsUsed: subscription.generationsUsed + 1,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.userId, userId));

      return true;
    });

    return result;
  } catch (error) {
    console.error("Error deducting credit:", error);
    return false;
  }
}

/**
 * Add credits to user's account (for pay-per-use purchases)
 */
export async function addCredits(userId: string, count: number): Promise<void> {
  const subscription = await getSubscription(userId);

  await db
    .update(userSubscriptions)
    .set({
      generationsLimit: subscription.generationsLimit + count,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Check if billing period has ended and reset credits if needed
 */
export async function checkAndResetBillingPeriod(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  // Only reset for subscriptions with a period end date
  if (!subscription.currentPeriodEnd) {
    return false;
  }

  const now = new Date();

  // Check if current period has ended
  if (now > subscription.currentPeriodEnd) {
    console.log(`Resetting billing period for user ${userId}`);

    // Calculate new period (30 days from old period end)
    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = new Date(subscription.currentPeriodEnd);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

    await db
      .update(userSubscriptions)
      .set({
        generationsUsed: 0,
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        updatedAt: now,
      })
      .where(eq(userSubscriptions.userId, userId));

    return true;
  }

  return false;
}

/**
 * Reset billing period manually (for admin/testing)
 */
export async function resetBillingPeriod(userId: string): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await db
    .update(userSubscriptions)
    .set({
      generationsUsed: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Update user's subscription plan
 */
export async function updateSubscriptionPlan(
  userId: string,
  plan: SubscriptionPlan,
  stripeSubscriptionId?: string
): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      plan,
      generationsLimit: PLAN_LIMITS[plan],
      stripeSubscriptionId: stripeSubscriptionId || undefined,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Cancel subscription (downgrade to free plan)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      plan: "free",
      generationsLimit: PLAN_LIMITS.free,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Update Stripe customer ID for a user
 */
export async function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Get user ID from Stripe customer ID
 */
export async function getUserIdFromStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId));

  return subscription?.userId || null;
}

/**
 * Set grace period for failed payment (3 days from now)
 */
export async function setGracePeriod(userId: string): Promise<void> {
  const now = new Date();
  const gracePeriodEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

  await db
    .update(userSubscriptions)
    .set({
      subscriptionStatus: "past_due",
      gracePeriodEndsAt: gracePeriodEnd,
      updatedAt: now,
    })
    .where(eq(userSubscriptions.userId, userId));

  console.log(`Grace period set for user ${userId} until ${gracePeriodEnd.toISOString()}`);
}

/**
 * Clear grace period (payment succeeded or subscription canceled)
 */
export async function clearGracePeriod(userId: string, newStatus: "active" | "canceled" = "active"): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      subscriptionStatus: newStatus,
      gracePeriodEndsAt: null,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  userId: string,
  status: "active" | "past_due" | "canceled" | "unpaid" | "trialing"
): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      subscriptionStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));
}

/**
 * Check if user is in grace period
 */
export async function isInGracePeriod(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);

  if (subscription.subscriptionStatus !== 'past_due') {
    return false;
  }

  if (!subscription.gracePeriodEndsAt) {
    return false;
  }

  const now = new Date();
  return now < subscription.gracePeriodEndsAt;
}
