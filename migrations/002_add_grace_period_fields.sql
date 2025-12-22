-- Add grace period and subscription status fields to user_subscriptions table
-- Migration: 002_add_grace_period_fields.sql
-- Date: 2025-12-21

-- Add subscription_status column (default to 'active' for existing rows)
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add grace_period_ends_at column (nullable, only set when payment fails)
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Add index for faster queries on subscription status
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
ON user_subscriptions(subscription_status);

-- Add index for grace period queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period
ON user_subscriptions(grace_period_ends_at)
WHERE grace_period_ends_at IS NOT NULL;

-- Update existing subscriptions to have 'active' status
UPDATE user_subscriptions
SET subscription_status = 'active'
WHERE subscription_status IS NULL;
