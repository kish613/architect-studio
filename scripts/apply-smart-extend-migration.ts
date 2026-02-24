/**
 * Apply Smart Extension Advisor Migration (004)
 * Adds EPC data, PDR assessment, real planning search, conservation/listing checks,
 * extension options, costs, party wall analysis, and neighbour impact columns.
 *
 * Usage: npx tsx scripts/apply-smart-extend-migration.ts
 * Make sure DATABASE_URL is set in your environment
 */

import { neon } from "@neondatabase/serverless";

async function applySmartExtendMigration() {
  console.log("🚀 Starting Smart Extension Advisor migration...\n");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. House number
    console.log("📝 Step 1/17: Adding house_number column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS house_number TEXT`;
    console.log("✅ house_number added\n");

    // 2. Workflow mode
    console.log("📝 Step 2/17: Adding workflow_mode column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS workflow_mode TEXT DEFAULT 'classic'`;
    console.log("✅ workflow_mode added\n");

    // 3. EPC data
    console.log("📝 Step 3/17: Adding epc_data column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS epc_data TEXT`;
    console.log("✅ epc_data added\n");

    // 4. Real approval data
    console.log("📝 Step 4/17: Adding real_approval_data column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS real_approval_data TEXT`;
    console.log("✅ real_approval_data added\n");

    // 5. PDR assessment
    console.log("📝 Step 5/17: Adding pdr_assessment column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS pdr_assessment TEXT`;
    console.log("✅ pdr_assessment added\n");

    // 6. Conservation area flag
    console.log("📝 Step 6/17: Adding is_conservation_area column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS is_conservation_area BOOLEAN DEFAULT FALSE`;
    console.log("✅ is_conservation_area added\n");

    // 7. Listed building flag
    console.log("📝 Step 7/17: Adding is_listed_building column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS is_listed_building BOOLEAN DEFAULT FALSE`;
    console.log("✅ is_listed_building added\n");

    // 8. Listed building grade
    console.log("📝 Step 8/17: Adding listed_building_grade column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS listed_building_grade TEXT`;
    console.log("✅ listed_building_grade added\n");

    // 9. Conservation area name
    console.log("📝 Step 9/17: Adding conservation_area_name column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS conservation_area_name TEXT`;
    console.log("✅ conservation_area_name added\n");

    // 10. Orientation
    console.log("📝 Step 10/17: Adding orientation column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS orientation TEXT`;
    console.log("✅ orientation added\n");

    // 11. Party wall assessment
    console.log("📝 Step 11/17: Adding party_wall_assessment column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS party_wall_assessment TEXT`;
    console.log("✅ party_wall_assessment added\n");

    // 12. Neighbour impact
    console.log("📝 Step 12/17: Adding neighbour_impact column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS neighbour_impact TEXT`;
    console.log("✅ neighbour_impact added\n");

    // 13. Extension options
    console.log("📝 Step 13/17: Adding extension_options column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS extension_options TEXT`;
    console.log("✅ extension_options added\n");

    // 14. Selected option tier
    console.log("📝 Step 14/17: Adding selected_option_tier column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS selected_option_tier TEXT`;
    console.log("✅ selected_option_tier added\n");

    // 15. Cost estimate
    console.log("📝 Step 15/17: Adding cost_estimate column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS cost_estimate TEXT`;
    console.log("✅ cost_estimate added\n");

    // 16. Generated option floorplans
    console.log("📝 Step 16/17: Adding generated_option_floorplans column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS generated_option_floorplans TEXT`;
    console.log("✅ generated_option_floorplans added\n");

    // 17. Satellite image URL
    console.log("📝 Step 17/17: Adding satellite_image_url column...");
    await sql`ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS satellite_image_url TEXT`;
    console.log("✅ satellite_image_url added\n");

    // Index
    console.log("📝 Creating workflow_mode index...");
    await sql`CREATE INDEX IF NOT EXISTS idx_planning_analyses_workflow ON planning_analyses(workflow_mode)`;
    console.log("✅ Index created\n");

    // Verification
    console.log("📊 Verifying migration...");
    const verification = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'planning_analyses'
        AND column_name IN (
          'house_number', 'workflow_mode', 'epc_data', 'real_approval_data',
          'pdr_assessment', 'is_conservation_area', 'is_listed_building',
          'listed_building_grade', 'conservation_area_name', 'orientation',
          'party_wall_assessment', 'neighbour_impact', 'extension_options',
          'selected_option_tier', 'cost_estimate', 'generated_option_floorplans',
          'satellite_image_url'
        )
      ORDER BY column_name
    `;

    console.log("\n✅ New columns verified:");
    console.table(verification);

    console.log(`\n🎉 Smart Extension Advisor migration complete! ${verification.length}/17 columns verified.`);

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

applySmartExtendMigration()
  .then(() => {
    console.log("\n✅ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:");
    console.error(error);
    process.exit(1);
  });
