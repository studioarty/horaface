import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase variables in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Adding pin column to providers table...");
  const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'ALTER TABLE providers ADD COLUMN IF NOT EXISTS pin TEXT;' 
  });
  
  if (error) {
      console.error("Error executing SQL:", error);
  } else {
      console.log("Success:", data);
  }
}

run();
