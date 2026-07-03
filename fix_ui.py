import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname='192.168.10.100', username='root', password='IB@Vschool123')
cmd = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker rm -f pontoface-web pontoface_backend pontoface_frontend ; echo 'IB@Vschool123' | sudo -S docker run -d --name pontoface-web --restart unless-stopped --network coolify -l 'traefik.enable=true' -l 'traefik.http.routers.pontoface-http.rule=Host(\\`ibavkiosk.com\\`)' -l 'traefik.http.routers.pontoface-http.entrypoints=web' -l 'traefik.http.routers.pontoface-http.middlewares=redirect-to-https' -l 'traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https' -l 'traefik.http.routers.pontoface-https.rule=Host(\\`ibavkiosk.com\\`)' -l 'traefik.http.routers.pontoface-https.entrypoints=websecure' -l 'traefik.http.routers.pontoface-https.tls=true' -l 'traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt' -v /data/pontoface:/usr/share/nginx/html:ro -v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("OUT:", stdout.read().decode())
print("ERR:", stderr.read().decode())
