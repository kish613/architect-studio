# Stripe Setup Steps - Complete Guide

## Overview

This guide walks you through setting up Stripe for your subscription system from start to finish. Follow each step in order.

**Time Required:** ~30 minutes
**Prerequisites:** Stripe account created

---

## 📋 Table of Contents

1. [Get Your Stripe API Keys](#step-1-get-your-stripe-api-keys)
2. [Create Subscription Products](#step-2-create-subscription-products)
3. [Set Up Webhook Endpoint](#step-3-set-up-webhook-endpoint)
4. [Enable Customer Portal](#step-4-enable-customer-portal)
5. [Set Environment Variables in Vercel](#step-5-set-environment-variables-in-vercel)
6. [Test in Test Mode](#step-6-test-in-test-mode)
7. [Deploy to Production](#step-7-deploy-to-production)
8. [Go Live with Live Keys](#step-8-go-live-with-live-keys)

---

## Step 1: Get Your Stripe API Keys

### 1.1 Navigate to API Keys

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure **Test mode** toggle (top right) is ON
3. Click **Developers** in the top navigation
4. Click **API keys** in the left sidebar

### 1.2 Copy Your Keys

You'll see two keys:

**Publishable Key** (Safe to expose in frontend)
- Starts with `pk_test_...` (test mode) or `pk_live_...` (live mode)
- Click the **copy** icon
- Save it temporarily (we'll add to Vercel later)

**Secret Key** (NEVER expose publicly)
- Starts with `sk_test_...` (test mode) or `sk_live_...` (live mode)
- Click **Reveal test key**
- Click the **copy** icon
- Save it temporarily in a secure place

### 1.3 Keep Keys Safe

⚠️ **Security Warning:**
- Never commit these keys to git
- Never share them in chat/email
- Never hardcode them in your code
- Use environment variables only

---

## Step 2: Create Subscription Products

You can either run the seed script or create products manually.

### Option A: Run the Seed Script (Recommended)

Your project already has a seed script at `/scripts/seed-stripe-products.ts`.

1. **Set your Stripe secret key temporarily:**
   ```bash
   # Windows PowerShell
   $env:STRIPE_SECRET_KEY="sk_test_your_key_here"

   # macOS/Linux
   export STRIPE_SECRET_KEY="sk_test_your_key_here"
   ```

2. **Run the seed script:**
   ```bash
   npx tsx scripts/seed-stripe-products.ts
   ```

3. **Expected output:**
   ```
   🚀 Seeding Stripe products...
   ✅ Created product: Starter Plan (price_...)
   ✅ Created product: Pro Plan (price_...)
   ✅ Created product: Studio Plan (price_...)
   ✅ Created product: Pay-per-use (price_...)
   🎉 All products created successfully!
   ```

### Option B: Create Products Manually

If the seed script doesn't work, create products manually:

1. Go to **Products** in Stripe Dashboard
2. Click **+ Add product**

**For each plan, create:**

#### Starter Plan
- **Name:** Starter Plan
- **Description:** 5 generations per month
- **Pricing:**
  - Price: $9.00 USD
  - Billing period: Monthly
  - Recurring
- **Metadata:** Add `plan = starter`
- Click **Save product**

#### Pro Plan
- **Name:** Pro Plan
- **Description:** 20 generations per month
- **Pricing:**
  - Price: $29.00 USD
  - Billing period: Monthly
  - Recurring
- **Metadata:** Add `plan = pro`
- Click **Save product**

#### Studio Plan
- **Name:** Studio Plan
- **Description:** 60 generations per month
- **Pricing:**
  - Price: $79.00 USD
  - Billing period: Monthly
  - Recurring
- **Metadata:** Add `plan = studio`
- Click **Save product**

#### Pay-per-use
- **Name:** Single Generation Credit
- **Description:** Buy 1 generation credit
- **Pricing:**
  - Price: $3.00 USD
  - One time
- **Metadata:** Add `plan = pay_per_use`
- Click **Save product**

### 2.3 Verify Products

Go to **Products** in Stripe Dashboard. You should see 4 products with their prices.

---

## Step 3: Set Up Webhook Endpoint

### 3.1 Get Your Webhook URL

**For Production:**
```
https://your-domain.vercel.app/api/stripe/webhook
```

**For Local Testing:**
```
Use Stripe CLI (see section 6.2)
```

### 3.2 Create Webhook Endpoint

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**

3. **Endpoint URL:**
   ```
   https://your-domain.vercel.app/api/stripe/webhook
   ```

4. **Description:** (optional)
   ```
   Production webhook for subscription events
   ```

5. **Events to send:**
   Click **Select events** and enable these:

   **Checkout:**
   - ☑️ `checkout.session.completed`

   **Customer:**
   - ☑️ `customer.subscription.created`
   - ☑️ `customer.subscription.updated`
   - ☑️ `customer.subscription.deleted`

   **Invoice:**
   - ☑️ `invoice.paid`
   - ☑️ `invoice.payment_failed`
   - ☑️ `invoice.payment_action_required`

6. Click **Add events**
7. Click **Add endpoint**

### 3.3 Get Webhook Signing Secret

After creating the endpoint:

1. Click on the webhook endpoint you just created
2. Find **Signing secret** section
3. Click **Reveal**
4. Copy the secret (starts with `whsec_...`)
5. Save it securely (you'll add it to Vercel later)

### 3.4 Verify Webhook Settings

Your webhook should show:
- Status: **Enabled**
- Events: **6 events** selected
- Signing secret: **Revealed** (whsec_...)

---

## Step 4: Enable Customer Portal

### 4.1 Navigate to Customer Portal Settings

1. Go to [https://dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)

   **OR**

2. Click **Settings** → **Billing** → **Customer portal**

### 4.2 Activate the Portal

1. Click the **"Activate test link"** button (if in test mode)
2. You'll see the configuration page

### 4.3 Configure Business Information

**Required fields:**

- **Business name:**
  ```
  Architect Studio
  ```

- **Privacy policy URL:**
  ```
  https://your-domain.com/privacy
  ```
  (Create a simple privacy page if you don't have one)

- **Terms of service URL:**
  ```
  https://your-domain.com/terms
  ```
  (Create a simple terms page if you don't have one)

### 4.4 Configure Functionality

**What customers can do:**

✅ **Update payment methods**
- Toggle: **ON**
- Customers can add/remove cards

✅ **Cancel subscriptions**
- Toggle: **ON**
- Cancellation behavior: **"Cancel at end of billing period"** (Recommended)
  - This lets users keep access until their paid period ends

Alternative: **"Cancel immediately"**
  - Use only if you want to revoke access right away

✅ **View invoice history**
- Toggle: **ON**
- Customers can download receipts

❌ **Pause subscriptions** (Optional)
- Toggle: **OFF**
- Usually not needed for SaaS

❌ **Switch plans** (Optional)
- Toggle: **OFF**
- Better to handle upgrades through your app's pricing page

### 4.5 Set Return URL

**Default return URL:**
```
https://your-domain.com/settings
```

Or for local testing:
```
http://localhost:3000/settings
```

This is where customers return after managing their billing.

### 4.6 Save Configuration

1. Scroll to the bottom
2. Click **"Save changes"**
3. You should see: "Your customer portal settings have been saved"

### 4.7 Test the Portal Link

1. Click **"View portal"** button
2. You should see the Stripe-hosted customer portal
3. Verify your business name appears
4. Check that enabled features show up
5. Click "Return to [Your Business Name]" - should redirect to your return URL

---

## Step 5: Set Environment Variables in Vercel

### 5.1 Navigate to Vercel Project Settings

1. Go to [https://vercel.com](https://vercel.com)
2. Select your project
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar

### 5.2 Add Stripe Test Keys (For Testing)

Add these variables one by one:

#### STRIPE_SECRET_KEY
- **Name:** `STRIPE_SECRET_KEY`
- **Value:** `sk_test_your_key_from_step_1`
- **Environments:** ☑️ Preview, ☑️ Development
- Click **Add**

#### STRIPE_PUBLISHABLE_KEY
- **Name:** `STRIPE_PUBLISHABLE_KEY`
- **Value:** `pk_test_your_key_from_step_1`
- **Environments:** ☑️ Preview, ☑️ Development
- Click **Add**

#### STRIPE_WEBHOOK_SECRET
- **Name:** `STRIPE_WEBHOOK_SECRET`
- **Value:** `whsec_your_secret_from_step_3`
- **Environments:** ☑️ Preview, ☑️ Development
- Click **Add**

### 5.3 Add Other Required Variables

#### SESSION_SECRET
- **Name:** `SESSION_SECRET`
- **Value:** Generate a random string (min 32 characters)
  ```bash
  # Generate with Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Environments:** ☑️ Production, ☑️ Preview, ☑️ Development
- Click **Add**

#### NEXT_PUBLIC_APP_URL
- **Name:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://your-project.vercel.app` (your actual Vercel URL)
- **Environments:** ☑️ Production, ☑️ Preview
- Click **Add**

#### DATABASE_URL
- **Name:** `DATABASE_URL`
- **Value:** Your Neon database URL (should already be set)
- If not set, add it:
  ```
  postgresql://neondb_owner:npg_...@ep-....neon.tech/neondb?sslmode=require
  ```
- **Environments:** ☑️ Production, ☑️ Preview, ☑️ Development
- Click **Add**

### 5.4 Verify All Variables Are Set

You should have these 6 environment variables:
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ✅ `SESSION_SECRET`
- ✅ `NEXT_PUBLIC_APP_URL`
- ✅ `DATABASE_URL`

### 5.5 Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click **⋯** menu on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

---

## Step 6: Test in Test Mode

### 6.1 Test Stripe Checkout Flow

1. **Deploy your app** (or run locally)
2. **Sign in** to your app
3. **Navigate to Pricing page** (`/pricing`)
4. **Click "Upgrade to Pro"**
5. **You'll be redirected to Stripe Checkout**

**Use Stripe test cards:**

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0341` | Payment requires authentication |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

**Test details:**
- **Email:** Any email (e.g., `test@example.com`)
- **Name:** Any name
- **Card number:** One of the above
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

6. **Complete checkout**
7. **You should be redirected back to your app**
8. **Verify:**
   - Header shows new credit count (e.g., "0/20")
   - Settings page shows "Pro Plan"
   - Status badge shows "Active"

### 6.2 Test Webhooks Locally (Optional)

For local development, use Stripe CLI:

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** that appears (starts with `whsec_...`)

5. **Set in your `.env.local`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_from_stripe_cli
   ```

6. **In another terminal, run your app:**
   ```bash
   npm run dev
   ```

7. **Trigger test events:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger invoice.payment_failed
   ```

### 6.3 Test Customer Portal

1. **Go to Settings page** (`/settings`)
2. **Click "Manage Billing"**
3. **You should be redirected to Stripe Customer Portal**
4. **Verify you can:**
   - See your subscription
   - View payment methods
   - View invoices
   - Cancel subscription (don't actually cancel unless testing)
5. **Click "Return to Architect Studio"**
6. **You should return to `/settings`**

### 6.4 Test Grace Period (Payment Failure)

1. **In Stripe Dashboard:**
   - Go to **Customers**
   - Find your test customer
   - Click on their subscription
   - Click **⋯** → **Update payment**
   - Change card to `4000 0000 0000 0341` (requires authentication)

2. **Simulate payment failure:**
   - Go to **Billing** → **Subscriptions**
   - Click on the subscription
   - Click **Simulate** → **Payment failure**

3. **Check your app:**
   - Red banner should appear: "Payment Failed - 3 days remaining"
   - Database `subscription_status` should be `past_due`
   - User can still generate (if they have credits)

4. **Test recovery:**
   - Click "Update Payment"
   - Update to successful card `4242 4242 4242 4242`
   - Stripe retries payment
   - Check webhook logs
   - Banner should disappear
   - Status should return to "Active"

### 6.5 Test PaywallModal

1. **Exhaust your credits:**
   ```sql
   -- Run in Neon SQL Editor
   UPDATE user_subscriptions
   SET generations_used = generations_limit
   WHERE user_id = 'your-user-id';
   ```

2. **Go to a project** and click "Generate Isometric View"

3. **PaywallModal should appear** with:
   - Current usage (20/20)
   - All pricing plans
   - "Most Popular" badge on Pro
   - Pay-per-use option

4. **Click "Upgrade to Pro"**
5. **Complete checkout**
6. **Verify credits reset** (0/20 for Pro plan)

---

## Step 7: Deploy to Production

### 7.1 Commit and Push Your Code

```bash
# Make sure all files are committed
git add .
git commit -m "Add complete Stripe integration with paywall"
git push origin main
```

### 7.2 Vercel Automatic Deployment

Vercel will automatically deploy when you push to main:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Watch the deployment progress
3. Wait for "Ready" status
4. Click "Visit" to see your live site

### 7.3 Verify Deployment

Check these pages work:
- ✅ Home page loads
- ✅ Pricing page shows plans
- ✅ Settings page renders
- ✅ Sign in with Google works
- ✅ Generate flow works

---

## Step 8: Go Live with Live Keys

### 8.1 Switch Stripe to Live Mode

⚠️ **Before going live, make sure you've thoroughly tested everything in test mode!**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle **Live mode** (top right)
3. You'll see a banner if you haven't activated your account

### 8.2 Activate Your Stripe Account

If you see "Activate your account" banner:

1. Click **"Activate your account"**
2. Complete business information:
   - Business details
   - Bank account for payouts
   - Tax information
   - Identity verification
3. Wait for approval (can take a few hours to a few days)

### 8.3 Create Live Products

**Option A: Run seed script with live key**
```bash
# Set LIVE secret key
export STRIPE_SECRET_KEY="sk_live_your_live_key_here"

# Run seed script
npx tsx scripts/seed-stripe-products.ts
```

**Option B: Manually create products**
- Follow Step 2 but in **Live mode**
- Create the same 4 products with same prices

### 8.4 Create Live Webhook Endpoint

1. In **Live mode**, go to **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL:** `https://your-domain.vercel.app/api/stripe/webhook`
4. **Select same events** as test mode (6 events)
5. Click **Add endpoint**
6. **Copy the signing secret** (whsec_...)

### 8.5 Enable Live Customer Portal

1. Switch to **Live mode**
2. Go to **Settings** → **Billing** → **Customer portal**
3. Click **"Activate live link"**
4. Configure the same settings as test mode:
   - Business information
   - Functionality toggles
   - Return URL
5. Click **"Save changes"**

### 8.6 Get Live API Keys

1. Go to **Developers** → **API keys**
2. In **Live mode**, you'll see:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...` (click Reveal)
3. Copy both keys

### 8.7 Update Vercel Environment Variables for Production

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**

2. **Update or add for Production environment:**

   **STRIPE_SECRET_KEY**
   - Edit existing or add new
   - Value: `sk_live_your_live_key`
   - Environments: ☑️ **Production** only
   - Click **Save**

   **STRIPE_PUBLISHABLE_KEY**
   - Edit existing or add new
   - Value: `pk_live_your_live_key`
   - Environments: ☑️ **Production** only
   - Click **Save**

   **STRIPE_WEBHOOK_SECRET**
   - Edit existing or add new
   - Value: `whsec_your_live_webhook_secret`
   - Environments: ☑️ **Production** only
   - Click **Save**

3. **Redeploy production:**
   - Go to **Deployments**
   - Click **⋯** on production deployment
   - Click **Redeploy**
   - ☑️ **Use existing Build Cache**
   - Click **Redeploy**

### 8.8 Test Live Mode End-to-End

⚠️ **Use a real credit card (you can cancel immediately after testing)**

1. **Go to your live site**
2. **Sign in**
3. **Go to Pricing**
4. **Click "Upgrade to Pro"**
5. **Use real credit card** (you'll be charged)
6. **Complete checkout**
7. **Verify:**
   - Webhook received in Stripe Dashboard → Webhooks → Events
   - Database updated (check Neon)
   - Header shows new credit count
   - Settings shows Pro plan
8. **Test Customer Portal:**
   - Click "Manage Billing"
   - Verify it opens
   - **Cancel subscription** (to avoid ongoing charges)
   - Or keep it if you want to use the app!

---

## ✅ Final Checklist

Before going live, verify:

### Stripe Configuration
- [ ] Live mode activated
- [ ] 4 products created in live mode
- [ ] Live webhook endpoint created with 6 events
- [ ] Webhook signing secret copied
- [ ] Customer Portal enabled in live mode
- [ ] Live API keys obtained

### Vercel Configuration
- [ ] Production environment variables set with LIVE keys
- [ ] Preview/Dev environment variables set with TEST keys
- [ ] All 6 environment variables configured
- [ ] Latest deployment successful
- [ ] Site accessible at production URL

### Testing Completed
- [ ] Test mode checkout works
- [ ] Test mode webhooks delivered
- [ ] Customer portal accessible
- [ ] PaywallModal appears when out of credits
- [ ] Grace period triggers on payment failure
- [ ] Settings page displays correctly
- [ ] Live mode checkout tested (with real card)
- [ ] Live mode webhooks confirmed

### Documentation
- [ ] Privacy policy page created
- [ ] Terms of service page created
- [ ] Support/contact information available

---

## 📊 Environment Variables Summary

Here's a complete reference of all environment variables you need:

### For Production (Live Mode)
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from live webhook)
SESSION_SECRET=your-random-32-char-secret
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
DATABASE_URL=postgresql://neondb_owner:...
```

### For Preview/Development (Test Mode)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from test webhook)
SESSION_SECRET=your-random-32-char-secret
NEXT_PUBLIC_APP_URL=https://your-preview.vercel.app
DATABASE_URL=postgresql://neondb_owner:...
```

### For Local Development (.env.local)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe CLI)
SESSION_SECRET=your-random-32-char-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://neondb_owner:...
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

---

## 🐛 Troubleshooting

### Webhook events not being received

**Check:**
1. Webhook URL is correct in Stripe Dashboard
2. STRIPE_WEBHOOK_SECRET matches the webhook
3. Endpoint is publicly accessible (not localhost)
4. Go to Stripe → Webhooks → Click endpoint → View event logs

**Fix:**
- Verify webhook URL doesn't have typos
- Check Vercel logs for errors
- Test webhook with Stripe CLI locally

### Customer Portal returns error

**Check:**
1. Customer Portal is activated
2. Return URL is correct
3. User has a stripeCustomerId in database

**Fix:**
- Re-activate Customer Portal
- Update return URL
- Ensure user went through checkout first

### Checkout redirects but no webhook received

**Check:**
1. Webhook endpoint exists in Stripe
2. Events are enabled (checkout.session.completed)
3. Webhook secret is correct in Vercel

**Fix:**
- Check Stripe Dashboard → Webhooks → Events
- Look for failed deliveries
- Verify webhook signature verification in code

### Environment variables not working

**Check:**
1. Variables are set in correct environment (Production/Preview/Dev)
2. Deployment occurred AFTER setting variables
3. Variable names match exactly (case-sensitive)

**Fix:**
- Redeploy after adding variables
- Double-check spelling
- Clear build cache and redeploy

---

## 🎉 You're Live!

Congratulations! Your Stripe integration is complete and live!

### What you've accomplished:

✅ Stripe account configured
✅ Products and pricing created
✅ Webhooks set up and working
✅ Customer Portal enabled
✅ Environment variables configured
✅ Test mode thoroughly tested
✅ Live mode deployed
✅ End-to-end payment flow working

### Next steps:

1. **Monitor your first customers:**
   - Check Stripe Dashboard daily
   - Watch webhook deliveries
   - Monitor Vercel logs

2. **Set up email notifications** (future enhancement)
   - Payment failures
   - Subscription changes
   - Welcome emails

3. **Add analytics:**
   - Track conversion rates
   - Monitor MRR growth
   - Analyze churn

4. **Optimize:**
   - A/B test pricing
   - Improve paywall messaging
   - Add more payment methods

---

## 📚 Additional Resources

**Stripe Documentation:**
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)

**Your Implementation Docs:**
- `IMPLEMENTATION_COMPLETE.md` - Full overview
- `MIGRATION_AND_TESTING_GUIDE.md` - Testing guide
- `PRIORITY_1_IMPLEMENTATION.md` - Backend details
- `PRIORITY_2_IMPLEMENTATION.md` - Frontend details

**Support:**
- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support

---

**Need help? Review the troubleshooting section or check the Stripe Dashboard event logs for detailed error messages.**

Good luck with your launch! 🚀
