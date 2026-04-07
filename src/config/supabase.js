require('dotenv').config({ override: true });
const { Pool } = require('pg');

const databaseUrl = process.env.SUPABASE_DB_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;