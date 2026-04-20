import 'dotenv/config';
import sql from '../config/database.js';

async function migrate() {
  try {
    console.log('Starting budget type migration...');
    
    const result1 = await sql`
      UPDATE estimation 
      SET budget_type = 'LOW' 
      WHERE budget_type = 'FIXED';
    `;
    console.log(`Updated 'FIXED' to 'LOW'`);

    const result2 = await sql`
      UPDATE estimation 
      SET budget_type = 'MEDIUM' 
      WHERE budget_type = 'FLEXIBLE';
    `;
    console.log(`Updated 'FLEXIBLE' to 'MEDIUM'`);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
