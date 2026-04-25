import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const { default: sql } = await import('../config/database.js');
  const features = await sql`SELECT * FROM features`;
  console.log(JSON.stringify(features, null, 2));
  process.exit();
}
check();
