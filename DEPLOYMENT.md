# Deployment Guide - Vercel

This guide explains how to deploy Architect Studio to Vercel with Neon PostgreSQL, Google OAuth, and all required services.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. A [Neon](https://neon.tech) account for PostgreSQL
3. A [Google Cloud](https://console.cloud.google.com) project with OAuth credentials
4. A [Google AI Studio](https://aistudio.google.com) API key for Gemini
5. A [Meshy](https://www.meshy.ai) API key
6. A [Stripe](https://stripe.com) account

## Step 1: Set Up Neon Database

1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string (it looks like `postgresql://user:pass@host/dbname?sslmode=require`)
3. Run the database migrations:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-neon-connection-string"

# Push the schema to Neon
npm run db:push
```

## Step 2: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
6. Select **Web application**
7. Add authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (for local development)
8. Save your **Client ID** and **Client Secret**

## Step 3: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Click **Get API key**
3. Create a new API key or use an existing one
4. Note: The app uses `gemini-2.0-flash-exp` model for image generation

## Step 4: Get Meshy API Key

1. Sign up at [Meshy](https://www.meshy.ai)
2. Go to your account settings
3. Generate an API key

## Step 5: Set Up Stripe

1. Create a [Stripe](https://stripe.com) account
2. Get your API keys from the Dashboard
3. Set up products using the seed script:

```bash
export STRIPE_SECRET_KEY="sk_test_..."
npx tsx scripts/seed-stripe-products.ts
```

4. Set up a webhook endpoint in Stripe Dashboard:
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Events: Select all events (or at minimum: `checkout.session.completed`, `customer.subscription.*`)
   - Copy the webhook signing secret

## Step 6: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and click **New Project**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`

### Option B: Deploy via CLI

```bash
npm i -g vercel
vercel
```

## Step 7: Configure Environment Variables

In your Vercel project settings, add these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `MESHY_API_KEY` | Meshy 3D API key | `msy_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SESSION_SECRET` | Random 32+ character string | `your-random-secret` |

Vercel Blob storage is automatically configured when you enable it in your project.

## Step 8: Enable Vercel Blob Storage

1. In your Vercel project, go to **Storage**
2. Click **Create Database**
3. Select **Blob**
4. The `BLOB_READ_WRITE_TOKEN` is automatically added to your environment

## Step 9: Update OAuth Redirect URI

After deployment, update your Google OAuth credentials with the actual Vercel URL:
- `https://your-app.vercel.app/api/auth/callback`

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in all the environment variables
3. Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Troubleshooting

### OAuth Redirect Mismatch
Make sure the redirect URI in Google Cloud Console exactly matches your deployment URL.

### Database Connection Issues
- Ensure your Neon database allows connections from Vercel's IP ranges
- Check that `?sslmode=require` is in your connection string

### Stripe Webhooks Not Working
- Verify the webhook URL is correct
- Check that the webhook secret is correctly set
- Look at Stripe Dashboard > Webhooks for error logs

### Blob Storage Errors
- Ensure Vercel Blob is enabled in your project
- The `BLOB_READ_WRITE_TOKEN` should be auto-configured

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   React     │  │   API       │  │  Vercel Blob    │  │
│  │   Frontend  │──│   Routes    │──│  (File Storage) │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                  │
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Neon PostgreSQL│  │ External APIs   │
│  (Database)     │  │ - Google OAuth  │
└─────────────────┘  │ - Gemini AI     │
                     │ - Meshy 3D      │
                     │ - Stripe        │
                     └─────────────────┘
```




