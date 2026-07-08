import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ycdzokzdbbxkpvovbrwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHpva3pkYmJ4a3B2b3ZicndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDM1NDIsImV4cCI6MjA4ODU3OTU0Mn0.tCxOGxWoowH3NBX-mS5L2CY0Kn7BnjTV6Lk8jq_kpCM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('time_records').select('*').limit(1);
  if (data) {
    console.log("Record structure:", Object.keys(data[0]));
  }
}
run();
