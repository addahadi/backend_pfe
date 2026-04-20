import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fix() {
  const { default: sql } = await import('../config/database.js');
  
  const plans = [
    {
      id: '31000000-0000-0000-0000-000000000001', // FREE
      features: [
        { key: 'projects_limit', val: '3' },
        { key: 'ai_usage_limit', val: '5' },
        { key: 'estimation_limit', val: '10' }
      ]
    },
    {
      id: '31000000-0000-0000-0000-000000000002', // PRO
      features: [
        { key: 'projects_limit', val: '50' },
        { key: 'ai_usage_limit', val: '100' },
        { key: 'estimation_limit', val: '500' }
      ]
    },
    {
      id: '31000000-0000-0000-0000-000000000003', // ENTERPRISE
      features: [
        { key: 'projects_limit', val: 'unlimited' },
        { key: 'ai_usage_limit', val: 'unlimited' },
        { key: 'estimation_limit', val: 'unlimited' }
      ]
    }
  ];

  try {
    console.log('🧹 Cleaning old features...');
    await sql`DELETE FROM features`;

    console.log('Inserting standardized features...');
    for (const plan of plans) {
      for (const feature of plan.features) {
        await sql`
          INSERT INTO features (plan_id, feature_key, feature_value_en, feature_value_ar)
          VALUES (${plan.id}, ${feature.key}, ${feature.val}, ${feature.val})
        `;
      }
    }

    console.log('✅ Features table fixed.');
  } catch (err) {
    console.error('❌ Fix failed:', err);
  } finally {
    process.exit();
  }
}
fix();
