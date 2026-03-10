const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("Simple connection test (JS)...");
  const { data, error } = await supabase.from('attempts').select('id').limit(1);
  if (error) {
    console.log("ERROR accessing attempts table:", error.message);
  } else {
    console.log("SUCCESS: Can see attempts table.");
    
    console.log("Testing specific columns...");
    const { error: colError } = await supabase.from('attempts').select('id, score, total_questions, student_name').limit(1);
    if (colError) {
      console.log("COLUMN ERROR:", colError.message);
    } else {
      console.log("SUCCESS: All columns exist.");
    }
  }
}

run();
