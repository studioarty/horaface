import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { throw new Error("Missing vars."); }

const supabase = createClient(supabaseUrl, supabaseKey);

const feriados = [
  // 2026
  { name: "Confraternização Universal (2026)", target_date: "2026-01-01" },
  { name: "Carnaval (2026)", target_date: "2026-02-16" },
  { name: "Carnaval (2026)", target_date: "2026-02-17" },
  { name: "Paixão de Cristo (2026)", target_date: "2026-04-03" },
  { name: "Tiradentes (2026)", target_date: "2026-04-21" },
  { name: "Dia do Trabalhador (2026)", target_date: "2026-05-01" },
  { name: "Independência do Brasil (2026)", target_date: "2026-09-07" },
  { name: "Nossa Sra. Aparecida (2026)", target_date: "2026-10-12" },
  { name: "Finados (2026)", target_date: "2026-11-02" },
  { name: "Proclamação da República (2026)", target_date: "2026-11-15" },
  { name: "Dia da Consciência Negra (2026)", target_date: "2026-11-20" },
  { name: "Natal (2026)", target_date: "2026-12-25" },

  // 2027
  { name: "Confraternização Universal (2027)", target_date: "2027-01-01" },
  { name: "Carnaval (2027)", target_date: "2027-02-08" },
  { name: "Carnaval (2027)", target_date: "2027-02-09" },
  { name: "Paixão de Cristo (2027)", target_date: "2027-03-26" },
  { name: "Tiradentes (2027)", target_date: "2027-04-21" },
  { name: "Dia do Trabalhador (2027)", target_date: "2027-05-01" },
  { name: "Independência do Brasil (2027)", target_date: "2027-09-07" },
  { name: "Nossa Sra. Aparecida (2027)", target_date: "2027-10-12" },
  { name: "Finados (2027)", target_date: "2027-11-02" },
  { name: "Proclamação da República (2027)", target_date: "2027-11-15" },
  { name: "Dia da Consciência Negra (2027)", target_date: "2027-11-20" },
  { name: "Natal (2027)", target_date: "2027-12-25" }
];

async function seed() {
  for (const f of feriados) {
    const { data, error } = await supabase.from('holidays').insert(f);
    if (error) {
      console.log(`Error on ${f.name}: ${error.message} - it might already exist`);
    } else {
      console.log(`Inserted: ${f.name}`);
    }
  }
}
seed();
