import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function syncFeatures() {
  try {
    console.log('🔄 Syncing subscription snapshots with latest plan features...');
    
    // Dynamic import to ensure process.env is populated
    const { default: sql } = await import('../config/database.js');

    const activeSubs = await sql`
      SELECT subscription_id, plan_id, user_id 
      FROM subscriptions 
      WHERE status = 'ACTIVE'
    `;

    console.log(`Found ${activeSubs.length} active subscriptions.`);

    for (const sub of activeSubs) {
      console.log(`Processing sub ${sub.subscription_id} (Plan: ${sub.plan_id})...`);

      // 1. Fetch latest features for this plan
      const features = await sql`
        SELECT feature_key, feature_value_en
        FROM features
        WHERE plan_id = ${sub.plan_id}
      `;

      if (features.length === 0) {
        console.warn(`⚠️ No features found for plan ${sub.plan_id}. Skipping.`);
        continue;
      }

      // 2. Build new snapshot
      const snapshot = {};
      features.forEach(f => {
        snapshot[f.feature_key] = f.feature_value_en;
      });

      console.log(`New snapshot for sub ${sub.subscription_id}:`, JSON.stringify(snapshot));

      // 3. Update subscription
      await sql`
        UPDATE subscriptions
        SET features_snapshot = ${snapshot}
        WHERE subscription_id = ${sub.subscription_id}
      `;
    }

    console.log('✅ Synchronisation complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

syncFeatures();
