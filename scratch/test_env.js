import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Dotenv Error:', result.error);
}

console.log('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? 'Loaded (redacted)' : 'Not Found');
