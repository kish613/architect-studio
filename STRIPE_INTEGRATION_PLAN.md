# Stripe Integration & Paywall Implementation Plan

## Current State Analysis

### ✅ Already Implemented
1. **Database Schema** (`/shared/schema.ts`)
   - `user_subscriptions` table with credit tracking
   - Plan limits configuration (Free=2, Starter=5, Pro=20, Studio=60)
   - Stripe customer and subscription ID fields

2. **Stripe Checkout Flows**
   - Subscription checkout (`/api/subscription/checkout.ts`)
   - Pay-per-use purchases (`/api/subscription/purchase.ts`)
   - Stripe config endpoint (`/api/stripe/config.ts`)

3. **Webhook Handler** (`/api/stripe/webhook.ts`)
   - Processes `checkout.session.completed` events
   - Adds credits for subscriptions and pay-per-use purchases
   - Basic logging for subscription lifecycle events

4. **Credit Gating** (`/api/models/[id]/generate-isometric.ts`)
   - Pre-generation credit check
   - Post-generation credit deduction
   - Auto-creates free subscription for new users

### ⚠️ Missing Components

1. **Billing Cycle Management**
   - No automatic reset of `generationsUsed` at period boundaries
   - `currentPeriodStart/End` fields not actively used

2. **Subscription Lifecycle**
   - Incomplete webhook handlers for subscription updates/cancellations
   - No downgrade/upgrade flow handling

3. **User Experience**
   - No frontend paywall UI components
   - No usage warnings or grace periods
   - No subscription management portal

4. **Infrastructure**
   - Missing middleware for route protection
   - No comprehensive error handling
   - Limited analytics/monitoring

---

## Implementation Plan

### Phase 1: Core Billing Infrastructure

#### 1.1 Automatic Credit Reset System
**Files to modify:**
- `/api/stripe/webhook.ts`
- Create: `/lib/subscription-manager.ts`

**Implementation:**
```typescript
// New utility function to check and reset billing periods
async function checkAndResetBillingPeriod(userId: string) {
  const subscription = await getSubscription(userId);

  if (!subscription.currentPeriodEnd) return;

  const now = new Date();
  if (now > subscription.currentPeriodEnd) {
    // Reset credits for new billing period
    await db.update(userSubscriptions).set({
      generationsUsed: 0,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
      updatedAt: now,
    }).where(eq(userSubscriptions.userId, userId));
  }
}
```

**Hook into:**
- Webhook `invoice.paid` event (monthly reset trigger)
- Pre-generation check (fallback if webhook missed)

#### 1.2 Enhanced Webhook Handlers
**Add handlers for:**

1. **`customer.subscription.updated`**
   - Update plan tier in database
   - Adjust `generationsLimit` based on new plan
   - Handle proration and immediate upgrades
   - Log plan changes for analytics

2. **`customer.subscription.deleted`** / **`customer.subscription.canceled`**
   - Downgrade user to free plan
   - Set `generationsLimit` to 2
   - Clear Stripe IDs
   - Send cancellation email

3. **`invoice.payment_failed`**
   - Mark subscription as past_due
   - Send payment failure notification
   - Implement grace period (3 days)

4. **`invoice.paid`**
   - Reset `generationsUsed` to 0
   - Update billing period dates
   - Confirm subscription active status

**Webhook signature verification:**
```typescript
const signature = request.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(
  body,
  signature!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

#### 1.3 Subscription Manager Utility
**Create:** `/lib/subscription-manager.ts`

**Functions:**
- `getSubscriptionStatus(userId)` - Get full subscription state with credit info
- `canUserGenerate(userId)` - Check if user has credits available
- `deductCredit(userId)` - Atomic credit deduction with race condition handling
- `resetBillingPeriod(userId)` - Manual billing period reset
- `upgradeSubscription(userId, newPlan)` - Handle plan upgrades
- `downgradeSubscription(userId, newPlan)` - Handle plan downgrades
- `cancelSubscription(userId)` - Cancel subscription in Stripe and DB

---

### Phase 2: Stripe Customer Portal

#### 2.1 Create Portal Session Endpoint
**Create:** `/api/stripe/create-portal-session.ts`

```typescript
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await getSubscription(user.id);
  if (!subscription.stripeCustomerId) {
    return Response.json({ error: "No Stripe customer" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return Response.json({ url: session.url });
}
```

**Features:**
- Cancel subscription
- Update payment method
- View invoices
- Update billing information

#### 2.2 Enable Stripe Customer Portal
**Stripe Dashboard Setup:**
1. Enable Customer Portal in Stripe Dashboard
2. Configure allowed operations:
   - ✅ Cancel subscription
   - ✅ Update payment method
   - ✅ Invoice history
   - ❌ Pause subscription (disable)

---

### Phase 3: Frontend Paywall Components

#### 3.1 Paywall Modal Component
**Create:** `/client/src/components/PaywallModal.tsx`

```tsx
interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'limit_reached' | 'feature_locked' | 'upgrade_prompt';
}

export function PaywallModal({ isOpen, onClose, trigger }: PaywallModalProps) {
  const { subscription } = useSubscription();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {trigger === 'limit_reached'
              ? "You've reached your generation limit"
              : "Upgrade to unlock more generations"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <UsageDisplay
            used={subscription.generationsUsed}
            limit={subscription.generationsLimit}
          />

          <PricingCards currentPlan={subscription.plan} />

          <div className="flex gap-2">
            <Button onClick={() => handleCheckout('pro')}>
              Upgrade to Pro
            </Button>
            <Button variant="outline" onClick={() => handlePurchase(1)}>
              Buy 1 Credit ($3)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3.2 Usage Display Component
**Create:** `/client/src/components/UsageDisplay.tsx`

```tsx
export function UsageDisplay({ used, limit }: { used: number; limit: number }) {
  const percentage = (used / limit) * 100;
  const isWarning = percentage >= 80;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Generations used</span>
        <span className={isWarning ? "text-orange-500" : ""}>
          {used} / {limit}
        </span>
      </div>

      <Progress
        value={percentage}
        className={isWarning ? "bg-orange-500" : ""}
      />

      {isWarning && (
        <p className="text-sm text-orange-600">
          You're running low on credits
        </p>
      )}
    </div>
  );
}
```

#### 3.3 Pricing Page Enhancements
**Modify:** `/client/src/pages/Pricing.tsx`

**Add:**
- Current plan indicator
- Usage statistics
- Upgrade/downgrade CTAs
- Feature comparison table
- FAQ section
- Money-back guarantee badge

#### 3.4 Settings Page Integration
**Create:** `/client/src/pages/Settings.tsx`

**Sections:**
- Account information
- Current subscription plan with usage
- "Manage Billing" button → Stripe Customer Portal
- Payment method display
- Billing history

---

### Phase 4: API Route Protection Middleware

#### 4.1 Credit Gate Middleware
**Create:** `/lib/middleware/credit-gate.ts`

```typescript
export function withCreditGate(handler: RequestHandler) {
  return async (request: Request, context: any) => {
    const user = await getCurrentUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canGenerate = await canUserGenerate(user.id);
    if (!canGenerate) {
      return Response.json({
        error: "Credit limit reached",
        code: "LIMIT_REACHED",
        upgrade_url: "/pricing"
      }, { status: 403 });
    }

    return handler(request, context);
  };
}
```

**Apply to:**
- `/api/models/[id]/generate-isometric.ts`
- `/api/models/[id]/create-3d.ts` (if credit-gated)
- Any future generation endpoints

#### 4.2 Plan Gate Middleware
**Create:** `/lib/middleware/plan-gate.ts`

```typescript
export function withPlanGate(minPlan: SubscriptionPlan) {
  return function(handler: RequestHandler) {
    return async (request: Request, context: any) => {
      const user = await getCurrentUser(request);
      const subscription = await getSubscription(user.id);

      const planHierarchy = ['free', 'starter', 'pro', 'studio'];
      if (planHierarchy.indexOf(subscription.plan) < planHierarchy.indexOf(minPlan)) {
        return Response.json({
          error: "Plan upgrade required",
          required_plan: minPlan,
          current_plan: subscription.plan
        }, { status: 403 });
      }

      return handler(request, context);
    };
  };
}
```

---

### Phase 5: Grace Period & Soft Limits

#### 5.1 Grace Period Implementation
**Database Schema Update:**

Add to `user_subscriptions` table:
```typescript
gracePeriodEndsAt: timestamp('grace_period_ends_at'),
subscriptionStatus: text('subscription_status').$type<'active' | 'past_due' | 'canceled' | 'unpaid'>().default('active'),
```

**Logic:**
- On `invoice.payment_failed`: Set 3-day grace period
- Allow generations during grace period with warning banner
- After grace period: Hard block until payment succeeds

#### 5.2 Soft Limit Warnings
**Trigger points:**
- 50% used: "You've used half your credits"
- 80% used: "Running low on credits" (show upgrade CTA)
- 90% used: "Only X credits left" (prominent warning)
- 100% used: Hard paywall modal

**Implementation:**
```typescript
// In generation check
if (subscription.generationsUsed >= subscription.generationsLimit * 0.8) {
  // Include warning in API response
  return {
    warning: {
      type: 'low_credits',
      remaining: subscription.generationsLimit - subscription.generationsUsed,
      upgrade_url: '/pricing'
    }
  };
}
```

---

### Phase 6: Error Handling & Resilience

#### 6.1 Webhook Retry Logic
**Implementation:**
- Acknowledge webhook immediately (return 200)
- Process in background with retry queue
- Use idempotency keys for Stripe operations
- Store webhook events in database for audit trail

**Create:** `/lib/webhook-queue.ts`
```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Store and process asynchronously
```

#### 6.2 Stripe API Error Handling
**Wrap all Stripe calls:**
```typescript
async function safeStripeCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      // Log to monitoring service
      console.error('Stripe error:', error.type, error.message);

      // Retry on rate limit
      if (error.type === 'RateLimitError') {
        await delay(1000);
        return operation();
      }

      throw new Error(`Payment processing failed: ${error.message}`);
    }
    throw error;
  }
}
```

#### 6.3 Database Transaction Safety
**Use transactions for credit operations:**
```typescript
await db.transaction(async (tx) => {
  const subscription = await tx.select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .for('update'); // Row-level lock

  if (subscription.generationsUsed >= subscription.generationsLimit) {
    throw new Error('Insufficient credits');
  }

  await tx.update(userSubscriptions).set({
    generationsUsed: subscription.generationsUsed + 1
  });
});
```

---

### Phase 7: Analytics & Monitoring

#### 7.1 Conversion Funnel Tracking
**Events to track:**
1. Paywall shown
2. Pricing page viewed
3. Checkout initiated
4. Payment completed
5. Subscription activated

**Implementation:**
```typescript
// Analytics utility
export function trackEvent(event: string, properties?: Record<string, any>) {
  // Send to PostHog, Mixpanel, or GA4
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track(event, properties);
  }
}

// Usage
trackEvent('paywall_shown', {
  trigger: 'limit_reached',
  plan: subscription.plan,
  credits_used: subscription.generationsUsed
});
```

#### 7.2 Subscription Metrics Dashboard
**Create:** `/client/src/pages/admin/Subscriptions.tsx`

**Metrics:**
- MRR (Monthly Recurring Revenue)
- Churn rate
- Conversion rate by plan
- Average credits used per plan
- Payment failure rate
- Customer lifetime value

**Queries:**
```sql
-- MRR by plan
SELECT plan, COUNT(*) as subscribers,
  CASE plan
    WHEN 'starter' THEN COUNT(*) * 9
    WHEN 'pro' THEN COUNT(*) * 29
    WHEN 'studio' THEN COUNT(*) * 79
  END as mrr
FROM user_subscriptions
WHERE stripe_subscription_id IS NOT NULL
GROUP BY plan;
```

#### 7.3 Monitoring & Alerts
**Set up alerts for:**
- Webhook failures (> 5 in 1 hour)
- Payment failures (> 10% rate)
- Database connection errors
- Stripe API downtime

**Tools:**
- Sentry for error tracking
- Vercel Analytics for performance
- Custom webhook event log table

---

### Phase 8: Testing Strategy

#### 8.1 Stripe Test Mode Setup
**Test cards:**
```
4242 4242 4242 4242 - Success
4000 0000 0000 0341 - Decline (generic)
4000 0025 0000 3155 - Requires authentication
```

**Test scenarios:**
1. New subscription checkout
2. Upgrade flow (starter → pro)
3. Downgrade flow (pro → starter)
4. Cancellation
5. Payment failure + grace period
6. Webhook replay (idempotency)

#### 8.2 Integration Tests
**Create:** `/tests/integration/stripe.test.ts`

```typescript
describe('Stripe Integration', () => {
  it('should create subscription and grant credits', async () => {
    // Mock webhook event
    const event = createMockCheckoutEvent({
      userId: testUser.id,
      plan: 'pro'
    });

    await handleWebhook(event);

    const subscription = await getSubscription(testUser.id);
    expect(subscription.plan).toBe('pro');
    expect(subscription.generationsLimit).toBe(20);
  });

  it('should reset credits on billing period', async () => {
    // Set subscription to end of period
    await updateSubscription(testUser.id, {
      currentPeriodEnd: new Date(Date.now() - 1000)
    });

    await checkAndResetBillingPeriod(testUser.id);

    const subscription = await getSubscription(testUser.id);
    expect(subscription.generationsUsed).toBe(0);
  });
});
```

#### 8.3 End-to-End Tests
**Playwright tests:**
1. User hits paywall → sees modal
2. User clicks upgrade → redirects to Stripe
3. User completes payment → redirected back with success
4. Credits updated in UI
5. User can now generate

---

## Implementation Timeline & Priority

### Priority 1 (Critical - Week 1)
- [ ] Automatic credit reset system
- [ ] Enhanced webhook handlers (subscription lifecycle)
- [ ] Frontend paywall modal
- [ ] API route protection middleware

### Priority 2 (Important - Week 2)
- [ ] Stripe Customer Portal integration
- [ ] Usage display and warnings
- [ ] Grace period implementation
- [ ] Error handling improvements

### Priority 3 (Nice-to-have - Week 3)
- [ ] Analytics tracking
- [ ] Admin dashboard
- [ ] Comprehensive testing suite
- [ ] Documentation

---

## Environment Variables Required

```env
# Existing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# New
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_STUDIO=price_...
STRIPE_PRICE_ID_PAY_PER_USE=price_...
```

---

## Database Migrations Needed

```sql
-- Add subscription status tracking
ALTER TABLE user_subscriptions
ADD COLUMN subscription_status TEXT DEFAULT 'active',
ADD COLUMN grace_period_ends_at TIMESTAMP;

-- Add webhook event log
CREATE TABLE stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_user_subscriptions_stripe_customer
ON user_subscriptions(stripe_customer_id);
```

---

## Success Metrics

**Technical:**
- ✅ 100% webhook processing success rate
- ✅ < 200ms API response time for credit checks
- ✅ Zero race conditions in credit deduction
- ✅ 99.9% uptime for payment endpoints

**Business:**
- Track conversion rate (free → paid)
- Monitor monthly churn rate (target < 5%)
- Measure average revenue per user (ARPU)
- Track support tickets related to billing

---

## Risk Mitigation

1. **Double-charging users**
   - Solution: Idempotency keys on all Stripe operations
   - Webhook event deduplication

2. **Race conditions on credit deduction**
   - Solution: Database row-level locking
   - Atomic increment operations

3. **Webhook delivery failures**
   - Solution: Retry mechanism with exponential backoff
   - Manual reconciliation script

4. **User confusion during upgrade**
   - Solution: Clear messaging on proration
   - Immediate credit grants

5. **Stripe API downtime**
   - Solution: Queue pending operations
   - Graceful degradation (allow generations, reconcile later)

---

## Next Steps

1. Review this plan with stakeholders
2. Set up Stripe test environment
3. Create feature branch: `feature/stripe-paywall-complete`
4. Start with Priority 1 tasks
5. Deploy to staging for QA testing
6. Production rollout with feature flag
