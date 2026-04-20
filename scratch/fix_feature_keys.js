import 'dotenv/config';
import sql from '../config/database.js';

async function migrate() {
  try {
    console.log('🚀 Starting feature key standardization...');

    // 1. Update features table
    const result1 = await sql`
      UPDATE features 
      SET feature_key = 'projects_limit' 
      WHERE feature_key = 'max_projects'
    `;
    console.log('✅ Updated feature_key in features table.');

    // 2. Update AI feature key to match middleware
    const result2 = await sql`
      UPDATE features 
      SET feature_key = 'ai_usage_limit' 
      WHERE feature_key = 'ai_assistant'
    `;
    console.log('✅ Updated ai_assistant to ai_usage_limit in features table.');

    // 3. Update existing subscriptions snapshots
    // We use a raw SQL approach to replace keys in JSONB
    const result3 = await sql`
      UPDATE subscriptions 
      SET features_snapshot = features_snapshot - 'max_projects' || jsonb_build_object('projects_limit', features_snapshot->>'max_projects')
      WHERE features_snapshot ? 'max_projects'
    `;
    console.log('✅ Renamed max_projects to projects_limit in subscriptions table.');

    const result4 = await sql`
      UPDATE subscriptions 
      SET features_snapshot = features_snapshot - 'ai_assistant' || jsonb_build_object('ai_usage_limit', features_snapshot->>'ai_assistant')
      WHERE features_snapshot ? 'ai_assistant'
    `;
    console.log('✅ Renamed ai_assistant to ai_usage_limit in subscriptions table.');

    console.log('🏁 Migration completed successfully.');
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

