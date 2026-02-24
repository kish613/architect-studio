import { neon } from "@neondatabase/serverless";

async function applyPlanningMigration() {
  console.log("🚀 Applying planning_analyses migration...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log("📝 Creating planning_analyses table (if not exists)...");

    await sql`
      CREATE TABLE IF NOT EXISTS planning_analyses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL,

        property_image_url TEXT NOT NULL,
        floorplan_url TEXT,

        address TEXT,
        postcode TEXT,
        latitude TEXT,
        longitude TEXT,

        property_analysis TEXT,
        approval_search_results TEXT,

        selected_modification TEXT,

        generated_exterior_url TEXT,
        generated_floorplan_url TEXT,
        generated_isometric_url TEXT,

        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    console.log("✅ Table created/verified.");

    console.log("📝 Creating indexes...");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_analyses_user ON planning_analyses(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_analyses_project ON planning_analyses(project_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_analyses_status ON planning_analyses(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_analyses_postcode ON planning_analyses(postcode)
    `;

    console.log("✅ Indexes created/verified.");

    // Verification: check columns exist
    const verification = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'planning_analyses'
        AND column_name IN (
          'property_image_url', 'floorplan_url', 'property_analysis', 'approval_search_results', 'status'
        )
      ORDER BY column_name
    `;

    console.log("✅ Verification result:");
    console.table(verification);

    console.log("🎉 Planning migration applied successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to apply planning migration:", error);
    process.exit(1);
  }
}

applyPlanningMigration();