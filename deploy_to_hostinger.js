import fs from 'fs';
import { Client } from 'ssh2';
import { execSync } from 'child_process';

const ZIP_PATH = 'DEPLOY_PONTOFACE.zip';
const DIST_DIR = 'dist';

// ── 1. Recriar zip a partir de dist/ ──────────────────────────────────────
function createZip() {
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  const py = [
    `import zipfile, os`,
    `skip_ext = {'.exe','.bat','.sh','.tar','.img','.msi','.dmg'}`,
    `z = zipfile.ZipFile('${ZIP_PATH}', 'w', zipfile.ZIP_DEFLATED)`,
    `for root, dirs, files in os.walk('${DIST_DIR}'):`,
    `    for f in files:`,
    `        ext = os.path.splitext(f)[1].lower()`,
    `        if ext in skip_ext: continue`,
    `        full = os.path.join(root, f)`,
    `        z.write(full, os.path.relpath(full, '${DIST_DIR}'))`,
    `z.close()`,
    `print('Zip OK:', round(os.path.getsize('${ZIP_PATH}')/(1024*1024),1), 'MB')`
  ].join('; ');
  execSync(`python -c "${py}"`, { stdio: 'inherit' });
}

// ── 2. Enviar e extrair no servidor ───────────────────────────────────────
async function deploy() {
  console.log('📦 Recriando zip do dist/...');
  createZip();

  console.log('Connecting to Hostinger SSH...');

  await new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('Connection successful!');
      console.log('Starting SFTP transfer...');

      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const readStream = fs.createReadStream(ZIP_PATH);
        const writeStream = sftp.createWriteStream('./domains/compositor.sbs/DEPLOY_PONTOFACE.zip');

        writeStream.on('close', () => {
          console.log('Upload completed.');
          console.log('Extracting on server...');

          const commands = [
            'cd domains/compositor.sbs/public_html',
            'rm -rf assets media models',
            'mv ../DEPLOY_PONTOFACE.zip .',
            'unzip -o DEPLOY_PONTOFACE.zip',
            'rm DEPLOY_PONTOFACE.zip'
          ].join(' && ');

          conn.exec(commands, (err, stream) => {
            if (err) return reject(err);
            stream
              .on('close', () => {
                console.log('Deployment completed successfully! Exiting.');
                conn.end();
                resolve();
              })
              .on('data', (data) => console.log('STDOUT: ' + data))
              .stderr.on('data', (data) => console.error('STDERR: ' + data));
          });
        });

        readStream.pipe(writeStream);
      });
    }).on('error', reject).connect({
      host: '147.93.37.32',
      port: 65002,
      username: 'u407222665',
      password: 'IB@Vschool123'
    });
  });
}

deploy().catch(console.error);
