import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected');
  conn.exec('php /home/u407222665/domains/compositor.sbs/public_html/push_alarm.php 2>&1', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
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
