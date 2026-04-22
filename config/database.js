import postgres from 'postgres';

let sql;

if (!global._sql) {
  const connectionString = process.env.SUPABASE_DB_URL;

  global._sql = postgres(connectionString, {
    max: 20,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    prepare: false, // Required for Supabase Transaction Pooler
  });

  console.log('Database connection pool created');
}

sql = global._sql;

export default sql;
