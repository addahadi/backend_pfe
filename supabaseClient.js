require('dotenv').config(); // تأكدي بلي هاد السطر هو الأول
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// هاد السطر للتيست برك، باش نشوفو إذا المتغيرات راهم يلحقو
console.log("Supabase URL Check:", supabaseUrl ? "✅ OK" : "❌ Empty");

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;