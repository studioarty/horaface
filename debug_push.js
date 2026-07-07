import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const phpTest = `
<?php
require_once __DIR__ . '/push_alarm.php';

echo "Test 1: select=id,name (No quotes)\\n";
print_r(supabaseGet('/rest/v1/providers?id=in.(prov-1774544879693)&select=id,name'));

echo "\\nTest 2: select=id,name,shift_id (No quotes)\\n";
print_r(supabaseGet('/rest/v1/providers?id=in.(prov-1774544879693)&select=id,name,shift_id'));

echo "\\nTest 3: select=id,name,shift_ids (No quotes)\\n";
print_r(supabaseGet('/rest/v1/providers?id=in.(prov-1774544879693)&select=id,name,shift_ids'));
?>
`;
  
  conn.exec(`echo "${phpTest.replace(/"/g, '\\"')}" > /home/u407222665/domains/compositor.sbs/public_html/test_supabase.php && php /home/u407222665/domains/compositor.sbs/public_html/test_supabase.php`, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: '147.93.37.32',
  port: 65002,
  username: 'u407222665',
  password: 'IB@Vschool123'
});
