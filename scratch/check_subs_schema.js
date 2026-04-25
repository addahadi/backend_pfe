import sql from '../config/database.js';

async function checkSchema() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
    `;
    console.log('Subscriptions columns:', columns);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
