import { Client } from 'ssh2';
const conn = new Client();
conn.on('ready', () => {
    console.log('Connected');
    conn.exec('ls -la && ps aux | grep node', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
              .on('data', data => console.log('STDOUT: ' + data))
              .stderr.on('data', data => console.error('STDERR: ' + data));
    });
}).on('error', (err) => console.log(err))
.connect({ host: '147.93.37.32', port: 65002, username: 'u407222665', password: 'IB@Vschool123' });
