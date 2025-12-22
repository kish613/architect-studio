# Migration & Testing Guide

## Overview
This guide covers applying the Priority 2 database migration and testing the complete subscription system implementation.

---

## 📦 Part 1: Apply Database Migration

### Option A: Using the Migration Script (Recommended)

**Prerequisites:**
- DATABASE_URL environment variable must be set
- Node.js and npm installed

**Steps:**

1. **Set DATABASE_URL in your environment:**

```bash
# On Windows (PowerShell)
$env:DATABASE_URL="your-database-url-here"

# On macOS/Linux (Bash)
export DATABASE_URL="your-database-url-here"
```

2. **Run the migration script:**

```bash
npx tsx scripts/apply-migration.ts
```

**Expected Output:**
```
🚀 Starting database migration...

📝 Step 1: Adding subscription_status column...
✅ subscription_status column added

📝 Step 2: Adding grace_period_ends_at column...
✅ grace_period_ends_at column added

📝 Step 3: Creating index on subscription_status...
✅ Index idx_user_subscriptions_status created

📝 Step 4: Creating index on grace_period_ends_at...
✅ Index idx_user_subscriptions_grace_period created

📝 Step 5: Updating existing subscriptions to 'active' status...
✅ Updated X existing subscriptions

🎉 Migration completed successfully!
```

---

### Option B: Manual SQL Migration

If you prefer to run the migration manually or the script doesn't work:

1. **Connect to your Neon database**
   - Go to https://console.neon.tech
   - Navigate to your project
   - Open SQL Editor

2. **Run this SQL:**

```sql
-- Add subscription_status column
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add grace_period_ends_at column
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
ON user_subscriptions(subscription_status);

-- Create partial index for grace period queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period
ON user_subscriptions(grace_period_ends_at)
WHERE grace_period_ends_at IS NOT NULL;

-- Update existing subscriptions to active status
UPDATE user_subscriptions
SET subscription_status = 'active'
WHERE subscription_status IS NULL;
```

3. **Verify the migration:**

```sql
-- Check if columns were added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
  AND column_name IN ('subscription_status', 'grace_period_ends_at')
ORDER BY column_name;

-- Should return 2 rows:
-- grace_period_ends_at | timestamp without time zone | YES | NULL
-- subscription_status  | text                         | YES | 'active'::text
```

4. **Check indexes:**

```sql
-- Verify indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND indexname LIKE 'idx_user_subscriptions_%';

-- Should show both new indexes
```

---

## 🧪 Part 2: Comprehensive Testing

### Pre-Testing Checklist

- [ ] Database migration applied successfully
- [ ] All environment variables set in Vercel
- [ ] Stripe webhooks configured
- [ ] Stripe Customer Portal enabled
- [ ] Code deployed to staging/production

---

### Backend Tests

#### Test 1: Grace Period on Payment Failure

**Setup:**
1. Create a test subscription in Stripe Dashboard
2. Trigger a payment failure (use test card `4000 0000 0000 0341`)

**Expected Behavior:**
- Webhook receives `invoice.payment_failed` event
- Database: `subscription_status` = 'past_due'
- Database: `gracePeriodEndsAt` = current time + 3 days
- User can still generate (if they have credits)
- Console logs: "Grace period set for user {userId} until {date}"

**Verification:**
```sql
SELECT
  user_id,
  plan,
  subscription_status,
  grace_period_ends_at,
  generations_used,
  generations_limit
FROM user_subscriptions
WHERE subscription_status = 'past_due';
```

---

#### Test 2: Grace Period Clearance on Payment Success

**Setup:**
1. Update payment method for user in grace period
2. Wait for Stripe to retry payment

**Expected Behavior:**
- Webhook receives `invoice.paid` event
- Database: `subscription_status` = 'active'
- Database: `gracePeriodEndsAt` = NULL
- Database: `generationsUsed` = 0 (reset for new billing period)
- Console logs: "Invoice paid for user {userId}, resetting billing period"

**Verification:**
```sql
SELECT
  user_id,
  subscription_status,
  grace_period_ends_at,
  generations_used,
  current_period_start,
  current_period_end
FROM user_subscriptions
WHERE user_id = 'test-user-id';
```

---

#### Test 3: Credit Deduction (Atomic)

**Setup:**
1. User with 5/20 credits used
2. Make multiple concurrent generation requests

**Expected Behavior:**
- No race conditions
- Credits deduct correctly (6, 7, 8...)
- Row-level locking prevents double deduction
- Generation succeeds for all valid requests

**Verification:**
```sql
-- Check credit count after concurrent requests
SELECT generations_used FROM user_subscriptions WHERE user_id = 'test-user-id';
-- Should match exact number of successful generations
```

---

#### Test 4: Billing Period Reset

**Setup:**
1. User with currentPeriodEnd in the past
2. User attempts to generate

**Expected Behavior:**
- `checkAndResetBillingPeriod()` detects expired period
- Credits reset to 0
- New period dates set (30 days from old period end)
- Generation proceeds successfully

**Verification:**
```sql
SELECT
  generations_used,
  current_period_start,
  current_period_end
FROM user_subscriptions
WHERE user_id = 'test-user-id';
-- generations_used should be 1 (just generated)
-- period dates should be updated
```

---

#### Test 5: Stripe Customer Portal

**Setup:**
1. Authenticated user with active subscription
2. POST to `/api/stripe/create-portal-session`

**Expected Behavior:**
- Returns `{ url: "https://billing.stripe.com/session/..." }`
- URL is valid and redirects to Stripe portal
- Portal shows correct subscription
- Can update payment method
- Can view invoices
- Can cancel subscription

**Test with cURL:**
```bash
curl -X POST https://your-domain.com/api/stripe/create-portal-session \
  -H "Cookie: auth_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

---

### Frontend Tests

#### Test 6: Usage Warning Banners

**Test Scenarios:**

| Scenario | Condition | Expected Banner |
|----------|-----------|-----------------|
| Normal | < 80% used | No banner |
| Low Credits | 80-90% used | Yellow banner: "Running Low on Credits" |
| Very Low | 90-100% used | Orange banner: "Almost Out - Only X remaining" |
| Exhausted | 100% used | Red banner: "No Credits Remaining" |
| Grace Period | past_due status | Red banner: "Payment Failed - X days remaining" |

**How to Test:**
1. Open app and log in
2. Manually update database to each scenario
3. Refresh page
4. Verify correct banner appears

**SQL for Testing:**
```sql
-- Set to 80% (low)
UPDATE user_subscriptions SET generations_used = 16 WHERE user_id = 'test-user' AND generations_limit = 20;

-- Set to 90% (very low)
UPDATE user_subscriptions SET generations_used = 18 WHERE user_id = 'test-user' AND generations_limit = 20;

-- Set to 100% (exhausted)
UPDATE user_subscriptions SET generations_used = 20 WHERE user_id = 'test-user' AND generations_limit = 20;

-- Set to grace period
UPDATE user_subscriptions SET
  subscription_status = 'past_due',
  grace_period_ends_at = NOW() + INTERVAL '2 days'
WHERE user_id = 'test-user';
```

---

#### Test 7: Header Credit Counter

**Expected Behavior:**
1. Shows correct credit count (e.g., "5/20")
2. Opens popover on click
3. Popover shows:
   - Plan name
   - Visual usage bar
   - Percentage
   - "Manage" button → /settings
   - "Upgrade" button → /pricing

**How to Test:**
1. Log in to app
2. Click credit counter in header
3. Verify popover appearance
4. Click "Manage" → should navigate to Settings
5. Click "Upgrade" → should navigate to Pricing

---

#### Test 8: Settings Page

**Expected Sections:**
1. **Account Information**
   - Shows user name and email

2. **Subscription Details**
   - Current plan with status badge
   - Generation limit display
   - Visual usage indicator
   - Grace period warning (if past_due)
   - Billing period dates

3. **Actions**
   - "Manage Billing" button (if paid plan)
   - "Upgrade Plan" / "Change Plan" button

**How to Test:**
1. Navigate to /settings
2. Verify all sections render
3. Click "Manage Billing" → opens Stripe portal
4. Click "Upgrade Plan" → navigates to /pricing

---

#### Test 9: Paywall Modal Integration

**Test Scenario 1: Pre-Generation Check**
1. User with 0 credits remaining
2. Click "Generate Isometric View"
3. **Expected:** PaywallModal opens immediately (no API call)

**Test Scenario 2: API 403 Response**
1. User with credits showing but backend says no
2. Click "Generate Isometric View"
3. API returns 403
4. **Expected:** PaywallModal opens, subscription refreshes

**Test Scenario 3: Modal Content**
- Shows current usage
- Shows all pricing plans
- "Most Popular" badge on Pro
- Pay-per-use option ($3 for 1 credit)
- Can click upgrade → redirects to Stripe

**How to Test:**
```sql
-- Set to 0 credits for Scenario 1
UPDATE user_subscriptions SET generations_used = 20 WHERE user_id = 'test-user' AND generations_limit = 20;
```

---

#### Test 10: Subscription Data Refresh

**Expected Behavior:**
- After generation: Credit count updates in header
- After checkout: Plan updates in Settings
- After modal close: Subscription data refreshes
- On window focus: Subscription refetches

**How to Test:**
1. Complete a generation
2. Open DevTools Network tab
3. Verify `/api/subscription` is called
4. Verify header counter decrements
5. Switch browser tabs and return
6. Verify subscription refetches

---

### Integration Tests

#### Test 11: Complete User Journey (Happy Path)

**Scenario:** New user to paid customer

1. **Sign up**
   - Sign in with Google
   - Auto-created with free plan (2 credits)

2. **Generate isometric views**
   - Generate 1st view → Success, 1/2 used
   - Generate 2nd view → Success, 2/2 used
   - Attempt 3rd view → PaywallModal appears

3. **Upgrade to Pro**
   - Click "Upgrade to Pro"
   - Redirected to Stripe checkout
   - Complete payment (test card: `4242 4242 4242 4242`)
   - Redirected back to app

4. **Verify upgrade**
   - Header shows "0/20"
   - Settings shows "Pro Plan"
   - No warning banners

5. **Generate more**
   - Generate 3rd view → Success
   - Header shows "1/20"

---

#### Test 12: Payment Failure Recovery

**Scenario:** Paid user experiences payment failure

1. **Setup:**
   - User on Pro plan with active subscription
   - 15/20 credits used

2. **Payment fails:**
   - Stripe sends payment_failed webhook
   - User sees red banner: "Payment Failed - 3 days remaining"
   - User can still generate (16, 17, 18...)

3. **Update payment:**
   - Click "Update Payment" button
   - Redirected to Stripe Customer Portal
   - Update payment method
   - Return to app

4. **Verify recovery:**
   - Red banner disappears
   - Status badge shows "Active"
   - Can continue generating normally

---

### Load Testing

#### Test 13: Concurrent Generations

**Setup:**
- 10 users generating simultaneously
- Each user has 10/20 credits

**Expected:**
- No race conditions
- Each user's credits deduct correctly
- No double deduction
- All successful requests complete
- Database remains consistent

**Test Script:**
```javascript
// Use Artillery or k6 for load testing
// Example with curl in parallel:
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/models/123/generate-isometric \
    -H "Cookie: auth_session=USER_${i}_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}' &
done
wait
```

---

## 🎯 Success Criteria

### Backend
- ✅ All webhook events processed correctly
- ✅ Grace periods set/cleared automatically
- ✅ No race conditions in credit deduction
- ✅ Billing periods reset correctly
- ✅ Customer portal sessions created
- ✅ All database queries performant (< 50ms)

### Frontend
- ✅ Warning banners display correctly
- ✅ Header credit counter updates in real-time
- ✅ Settings page shows accurate information
- ✅ Paywall modal appears when appropriate
- ✅ Checkout flows complete successfully
- ✅ Subscription data refreshes properly

### User Experience
- ✅ No confusing error messages
- ✅ Clear upgrade paths
- ✅ Smooth payment flows
- ✅ Graceful handling of failures
- ✅ Professional UI/UX throughout

---

## 🐛 Common Issues & Solutions

### Issue 1: Migration fails with "column already exists"

**Solution:** This is safe to ignore. The migration uses `IF NOT EXISTS` clauses. Run:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_subscriptions';
```
Verify both new columns are present.

---

### Issue 2: Webhook events not processing

**Checklist:**
- [ ] Webhook URL configured in Stripe Dashboard
- [ ] STRIPE_WEBHOOK_SECRET set in environment
- [ ] Webhook endpoint is public (not localhost)
- [ ] Events are enabled in Stripe Dashboard
- [ ] Webhook signature verification passing

**Debug:**
```bash
# Check webhook logs in Stripe Dashboard
# Webhooks → Recent events → Click event → View logs
```

---

### Issue 3: PaywallModal not appearing

**Checklist:**
- [ ] useSubscription() hook returning data
- [ ] subscription.canGenerate is false
- [ ] generateIsometricMutation error handler triggered
- [ ] showPaywall state updating

**Debug:**
```javascript
// Add to Viewer component
console.log('Subscription:', subscription);
console.log('Can generate:', subscription?.canGenerate);
```

---

### Issue 4: Grace period not clearing

**Checklist:**
- [ ] invoice.paid webhook received
- [ ] clearGracePeriod() called in webhook
- [ ] Database updated (check SQL)
- [ ] Frontend refetched subscription data

**Debug:**
```sql
SELECT * FROM user_subscriptions
WHERE grace_period_ends_at IS NOT NULL;
```

---

### Issue 5: Credits not resetting at billing period

**Checklist:**
- [ ] currentPeriodEnd date is set
- [ ] Date is in the past
- [ ] checkAndResetBillingPeriod() called before generation
- [ ] New period dates calculated correctly

**Debug:**
```sql
SELECT
  user_id,
  generations_used,
  current_period_start,
  current_period_end,
  NOW() > current_period_end as is_expired
FROM user_subscriptions;
```

---

## 📝 Test Checklist

Copy this checklist and check off as you test:

### Database Migration
- [ ] Migration script runs without errors
- [ ] New columns added to user_subscriptions
- [ ] Indexes created successfully
- [ ] Existing subscriptions updated to 'active'

### Backend Functionality
- [ ] Grace period set on payment failure
- [ ] Grace period cleared on payment success
- [ ] Credits deduct atomically (no race conditions)
- [ ] Billing periods reset automatically
- [ ] Customer portal sessions created
- [ ] All webhook events handled

### Frontend Components
- [ ] UsageWarningBanner displays correctly
- [ ] Header credit counter works
- [ ] Settings page renders all sections
- [ ] PaywallModal appears when appropriate
- [ ] All navigation links work

### Integration Flows
- [ ] New user signup → free plan
- [ ] Free user upgrade → paid plan
- [ ] Paid user downgrade → free plan
- [ ] Payment failure → grace period → recovery
- [ ] Credit exhaustion → paywall → upgrade
- [ ] Stripe checkout → success redirect
- [ ] Customer portal → update payment

### Performance
- [ ] Subscription API responds < 200ms
- [ ] Generation with credit check < 500ms
- [ ] No visible lag in UI
- [ ] Database queries optimized

### Error Handling
- [ ] Invalid API requests return proper errors
- [ ] Network failures handled gracefully
- [ ] Webhook failures logged
- [ ] User-friendly error messages

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] Migration applied to production database
- [ ] Environment variables set in Vercel
- [ ] Stripe webhooks configured for production
- [ ] Stripe Customer Portal enabled
- [ ] Test end-to-end flow in production
- [ ] Monitor error logs for first 24 hours
- [ ] Have rollback plan ready

---

## 📊 Monitoring

After deployment, monitor:

1. **Stripe Dashboard:**
   - Successful payments
   - Failed payments
   - Webhook delivery success rate

2. **Vercel Logs:**
   - API errors
   - Webhook processing logs
   - Database query performance

3. **Database:**
   - Grace period count
   - Subscription status distribution
   - Credit usage patterns

**SQL Queries for Monitoring:**

```sql
-- Count users in grace period
SELECT COUNT(*) FROM user_subscriptions
WHERE subscription_status = 'past_due'
  AND grace_period_ends_at > NOW();

-- Subscription distribution
SELECT plan, subscription_status, COUNT(*)
FROM user_subscriptions
GROUP BY plan, subscription_status;

-- Average credit usage by plan
SELECT
  plan,
  AVG(generations_used) as avg_used,
  AVG(generations_limit) as avg_limit,
  AVG(CAST(generations_used AS FLOAT) / generations_limit * 100) as avg_percentage
FROM user_subscriptions
GROUP BY plan;
```

---

## ✅ You're Ready!

If all tests pass, your implementation is complete and production-ready! 🎉

For questions or issues:
1. Check the implementation docs
2. Review Stripe Dashboard logs
3. Check Vercel deployment logs
4. Verify database state with SQL queries
