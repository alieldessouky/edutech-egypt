import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  console.log("Simple connection test...");
  const { data, error } = await supabase.from('attempts').select('id').limit(1);
  if (error) {
    console.log("ERROR accessing attempts table:", error.message);
  } else {
    console.log("SUCCESS: Can see attempts table. Found:", data?.length, "rows.");
  }
}

run();
