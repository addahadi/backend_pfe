import 'dotenv/config';
import sql from '../config/database.js';

async function migrate() {
  try {
    console.log('🚀 Starting Database-Only Fix...');

    // 1. Update features table keys
    await sql`UPDATE features SET feature_key = 'projects_limit' WHERE feature_key = 'max_projects'`;
    await sql`UPDATE features SET feature_key = 'ai_usage_limit' WHERE feature_key = 'ai_assistant'`;
    await sql`UPDATE features SET feature_key = 'estimation_limit' WHERE feature_key = 'max_calculations'`; // Also fixing this one if it exists
    console.log('✅ Standardized keys in features table.');

    // 2. Fix snapshots in subscriptions table
    // Note: We leave the "double stringification" as-is because the code expects it.
    // We just parse, rename keys, and re-stringify.
    const subs = await sql`SELECT subscription_id, features_snapshot FROM subscriptions WHERE features_snapshot IS NOT NULL`;
    
    let updatedCount = 0;
    for (const sub of subs) {
      let snapshot = sub.features_snapshot;
      
      // If it's a string, parse it to modify
      if (typeof snapshot === 'string') {
        try {
          snapshot = JSON.parse(snapshot);
        } catch (e) {
          continue; 
        }
      }

      let changed = false;
      if (snapshot.max_projects) {
        snapshot.projects_limit = snapshot.max_projects;
        delete snapshot.max_projects;
        changed = true;
      }
      if (snapshot.ai_assistant) {
        snapshot.ai_usage_limit = snapshot.ai_assistant;
        delete snapshot.ai_assistant;
        changed = true;
      }
      if (snapshot.max_calculations) {
        snapshot.estimation_limit = snapshot.max_calculations;
        delete snapshot.max_calculations;
        changed = true;
      }

      // Re-stringify to maintain parity with the current code's behavior
      const fixedSnapshot = JSON.stringify(snapshot);

      await sql`
        UPDATE subscriptions 
        SET features_snapshot = ${fixedSnapshot} 
        WHERE subscription_id = ${sub.subscription_id}
      `;
      updatedCount++;
    }

    console.log(`✅ Standardized and repaired ${updatedCount} subscriptions in database.`);
    console.log('🏁 Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
function jsonb_build_object(arg0, arg1) {
throw new Error("Function not implemented.");
}
