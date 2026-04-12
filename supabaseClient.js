import { createClient } from '@supabase/supabase-js';

// Using a lazy getter so createClient() is called after dotenv has loaded env vars
let _supabase;

const getSupabase = () => {
    if (!_supabase) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        console.log("Supabase URL Check:", supabaseUrl ? "✅ OK" : "❌ Empty");
        _supabase = createClient(supabaseUrl, supabaseKey);
    }
    return _supabase;
};

// Proxy so callers can still use `supabase.from(...)` directly
const supabase = new Proxy({}, {
    get(_, prop) {
        return getSupabase()[prop];
    }
});

export default supabase;