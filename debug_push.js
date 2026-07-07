import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const url1 = 'https://oagobzccstjswhftshmw.supabase.co/rest/v1/providers?id=in.(prov-1774544879693,prov-1773107081259)&select=id,name';
  const url2 = 'https://oagobzccstjswhftshmw.supabase.co/rest/v1/providers?id=in.(%22prov-1774544879693%22,%22prov-1773107081259%22)&select=id,name';
  
  const cmd = `
    echo "TEST 1 (No quotes):"
    curl -s -H "apikey: \${SUPABASE_KEY}" -H "Authorization: Bearer \${SUPABASE_KEY}" "${url1}" | head -c 200
    echo "\\nTEST 2 (URL Encoded quotes):"
    curl -s -H "apikey: \${SUPABASE_KEY}" -H "Authorization: Bearer \${SUPABASE_KEY}" "${url2}" | head -c 200
  `;
  
  // Need to read the key from the env or file. Let's just use php to execute the request since it has the key.
  const phpTest = `
<?php
require_once __DIR__ . '/push_alarm.php';
$url1 = '/rest/v1/providers?id=in.(prov-1774544879693,prov-1773107081259)&select=id,name';
$url2 = '/rest/v1/providers?id=in.(%22prov-1774544879693%22,%22prov-1773107081259%22)&select=id,name';
echo "URL1:\\n";
print_r(supabaseGet($url1));
echo "\\nURL2:\\n";
print_r(supabaseGet($url2));
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
