import sql from './config/database.js';
const plans = await sql`SELECT plan_id, name_en FROM plans`;
console.log(JSON.stringify(plans, null, 2));
process.exit(0);
