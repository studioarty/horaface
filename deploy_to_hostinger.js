import fs from 'fs';
import { Client } from 'ssh2';

const conn = new Client();

console.log('Connecting to Hostinger SSH...');

conn.on('ready', () => {
  console.log('Connection successful!');
  console.log('Starting SFTP transfer...');
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const readStream = fs.createReadStream('DEPLOY_PONTOFACE.zip');
    const writeStream = sftp.createWriteStream('./domains/compositor.sbs/DEPLOY_PONTOFACE.zip');
    
    writeStream.on('close', () => {
      console.log('Upload completed.');
      console.log('Extracting on server...');
      
      const commands = [
        'cd domains/compositor.sbs/public_html',
        'rm -rf *',
        'mv ../DEPLOY_PONTOFACE.zip .',
        'unzip -o DEPLOY_PONTOFACE.zip',
        'rm DEPLOY_PONTOFACE.zip'
      ].join(' && ');

      conn.exec(commands, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code, signal) => {
          console.log('Deployment completed successfully! Exiting.');
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.error('STDERR: ' + data);
        });
      });
    });

    readStream.pipe(writeStream);
  });
}).on('error', (err) => {
    console.error('SSH Connection Error: ', err.message);
}).connect({
  host: '147.93.37.32',
  port: 65002,
  username: 'u407222665',
  password: 'IB@Vschool123'
});
