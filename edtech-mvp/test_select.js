const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('attempts').select('demo_key').limit(1);
    console.log("Select result:", data, error);
}
test();
