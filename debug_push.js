import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected');
  conn.exec('curl -s -o /dev/null -w "%{http_code}" "https://compositor.sbs/push_alarm.php?token=hf_push_2026_x9k4m"', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => {
      console.log('HTTP status: ' + out);
      conn.end();
    });
  });
}).connect({
  host: '147.93.37.32',
  port: 65002,
  username: 'u407222665',
  password: 'IB@Vschool123'
});
