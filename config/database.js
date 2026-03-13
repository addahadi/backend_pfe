import postgres from 'postgres';

let sql;

if (!global._sql) {
  const connectionString = process.env.SUPABASE_DB_URL;


  global._sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  console.log('Database connection pool created');
}


sql = global._sql;

export default sql;