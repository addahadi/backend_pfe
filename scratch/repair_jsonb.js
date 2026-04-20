import 'dotenv/config';
import sql from '../config/database.js';

async function migrate() {
  try {
    console.log('🚀 Starting Database Repair (Converting strings to true JSONB)...');

    const subs = await sql`SELECT subscription_id, features_snapshot FROM subscriptions WHERE features_snapshot IS NOT NULL`;
    
    let updatedCount = 0;
    for (const sub of subs) {
      let snapshot = sub.features_snapshot;
      
      // If it's a string, parse it to an object
      if (typeof snapshot === 'string') {
        try {
          snapshot = JSON.parse(snapshot);
        } catch (e) {
          console.log(`⚠️ Could not parse snapshot for sub ${sub.subscription_id}:`, snapshot);
          continue; 
        }
      }

      // DO NOT re-stringify. Pass the object directly to the driver.
      // The postgres.js driver will correctly store a JS object into a jsonb column as a JSONB object.
      await sql`
        UPDATE subscriptions 
        SET features_snapshot = ${snapshot} 
        WHERE subscription_id = ${sub.subscription_id}
      `;
      updatedCount++;
    }

    console.log(`✅ Repaired ${updatedCount} subscriptions (now stored as proper JSONB objects).`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Repair failed:', err);
    process.exit(1);
  }
}

migrate();
