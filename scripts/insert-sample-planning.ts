import { neon } from '@neondatabase/serverless';

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Inserting sample planning analysis row...');

    const inserted = await sql`
      INSERT INTO planning_analyses (user_id, property_image_url, floorplan_url, address, postcode, status, created_at, updated_at)
      VALUES ('test-user', 'https://example.com/property.jpg', 'https://example.com/floorplan.png', '42 High Street', 'SW1A 1AA', 'pending', NOW(), NOW())
      RETURNING id, user_id, property_image_url, floorplan_url, address, postcode, status, created_at
    `;

    console.log('Inserted row:');
    console.table(inserted);

    const id = inserted?.[0]?.id;
    if (!id) {
      console.error('No ID returned from insert');
      process.exit(1);
    }

    console.log(`Fetching row id=${id} for verification...`);
    const fetched = await sql`
      SELECT id, user_id, property_image_url, floorplan_url, address, postcode, status, created_at
      FROM planning_analyses
      WHERE id = ${id}
    `;

    console.log('Fetched row:');
    console.table(fetched);

    console.log('\n✅ Sample planning analysis insertion and verification successful.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting or fetching sample row:', error);
    process.exit(1);
  }
}

run();