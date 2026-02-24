import { readFile } from 'fs/promises';
import { neon } from '@neondatabase/serverless';

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx scripts/run-sql.ts <sql-file-path>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set');
    process.exit(1);
  }

  const sqlText = (await readFile(file, 'utf-8')).toString();

  const client = neon(process.env.DATABASE_URL);

  try {
    // Preferred: use client.query if available
    if (typeof (client as any).query === 'function') {
      console.log('Using client.query to execute SQL file');
      const res = await (client as any).query(sqlText);
      console.log('Query result:', res && res.rowCount ? `${res.rowCount} rows affected` : 'OK');
    } else {
      console.log('client.query not available; attempting to execute statements one by one');
      // Fallback: split into statements and run each via template tag
      const statements = sqlText.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        console.log('Executing statement:', stmt.substring(0, 120));
        await (client as any)`\n${stmt}\n`;
      }
      console.log('All statements executed');
    }

    console.log('✅ SQL file executed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing SQL file:', error);
    process.exit(1);
  }
}

run();