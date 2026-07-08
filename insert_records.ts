import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ycdzokzdbbxkpvovbrwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHpva3pkYmJ4a3B2b3ZicndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDM1NDIsImV4cCI6MjA4ODU3OTU0Mn0.tCxOGxWoowH3NBX-mS5L2CY0Kn7BnjTV6Lk8jq_kpCM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const providers = [
    { id: 'prov-1773143801161', name: 'Cirlene' },
    { id: 'prov-1773143596326', name: 'Sueli' },
    { id: 'prov-1773143698092', name: 'CARINA' },
    { id: 'prov-1774619354039', name: 'Larissa ferreira' }
  ];

  const dateStr = "2026-07-07";

  const shifts = [
    { start: "08:00:00", end: "12:00:00", name: "Manhã" },
    { start: "13:30:00", end: "18:00:00", name: "Tarde" }
  ];

  for (const provider of providers) {
    for (const shift of shifts) {
      const checkInTime = new Date(`${dateStr}T${shift.start}-03:00`).toISOString();
      const checkOutTime = new Date(`${dateStr}T${shift.end}-03:00`).toISOString();
      
      const recordId = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payload = {
        id: recordId,
        provider_id: provider.id,
        provider_name: provider.name,
        type: 'check_in',
        timestamp: checkInTime,
        check_in: checkInTime,
        check_out: checkOutTime,
        location: '0,0|0,0',
        photo_url: '|'
      };

      const { data, error } = await supabase.from('time_records').insert([payload]);

      if (error) {
        console.error(`Error inserting for ${provider.name} - ${shift.name}:`, error);
      } else {
        console.log(`Successfully inserted ${shift.name} for ${provider.name}`);
      }
    }
  }
}
run();
