/**
 * Apply Priority 2 Database Migration
 * Adds grace period and subscription status fields to user_subscriptions table
 *
 * Usage: tsx scripts/apply-migration.ts
 * Make sure DATABASE_URL is set in your environment
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

async function applyMigration() {
  console.log("🚀 Starting database migration...\n");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    console.log("📝 Step 1: Adding subscription_status column...");
    await sql`
      ALTER TABLE user_subscriptions
      ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    `;
    console.log("✅ subscription_status column added\n");

    console.log("📝 Step 2: Adding grace_period_ends_at column...");
    await sql`
      ALTER TABLE user_subscriptions
      ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP
    `;
    console.log("✅ grace_period_ends_at column added\n");

    console.log("📝 Step 3: Creating index on subscription_status...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
      ON user_subscriptions(subscription_status)
    `;
    console.log("✅ Index idx_user_subscriptions_status created\n");

    console.log("📝 Step 4: Creating index on grace_period_ends_at...");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period
      ON user_subscriptions(grace_period_ends_at)
      WHERE grace_period_ends_at IS NOT NULL
    `;
    console.log("✅ Index idx_user_subscriptions_grace_period created\n");

    console.log("📝 Step 5: Updating existing subscriptions to 'active' status...");
    const result = await sql`
      UPDATE user_subscriptions
      SET subscription_status = 'active'
      WHERE subscription_status IS NULL
    `;
    console.log(`✅ Updated ${result.length || 0} existing subscriptions\n`);

    console.log("🎉 Migration completed successfully!");
    console.log("\n📊 Verifying migration...");

    // Verify the migration
    const verification = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_subscriptions'
        AND column_name IN ('subscription_status', 'grace_period_ends_at')
      ORDER BY column_name
    `;

    console.log("\n✅ New columns verified:");
    console.table(verification);

    console.log("\n✅ Migration complete! Your database is now ready for Priority 2 features.");

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log("\n✅ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:");
    console.error(error);
    process.exit(1);
  });
