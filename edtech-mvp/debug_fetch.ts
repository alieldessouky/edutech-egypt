import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  console.log("Starting debug fetch...");
  const { data, error } = await supabase
    .from('attempts')
    .select('id, created_at, score, total_questions, student_name, students(display_name)')
    .limit(1);

  if (error) {
    console.error("Supabase Query Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Fetch Successful! Sample row:", JSON.stringify(data?.[0], null, 2));
  }
}

run();
