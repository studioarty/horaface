import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname='192.168.10.100', username='root', password='IB@Vschool123')

script = """
docker rm -f pontoface-web 
docker run -d --name pontoface-web --restart unless-stopped --network coolify \\
  -l 'traefik.enable=true' \\
  -l 'traefik.http.routers.pontoface-web-http.rule=Host(`ibavkiosk.com`)' \\
  -l 'traefik.http.routers.pontoface-web-http.entrypoints=web' \\
  -l 'traefik.http.routers.pontoface-web-http.middlewares=redirect-to-https' \\
  -l 'traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https' \\
  -l 'traefik.http.routers.pontoface-web-https.rule=Host(`ibavkiosk.com`)' \\
  -l 'traefik.http.routers.pontoface-web-https.entrypoints=websecure' \\
  -l 'traefik.http.routers.pontoface-web-https.tls=true' \\
  -l 'traefik.http.routers.pontoface-web-https.tls.certresolver=letsencrypt' \\
  -l 'traefik.http.services.pontoface-web.loadbalancer.server.port=80' \\
  -v /data/pontoface:/usr/share/nginx/html:ro \\
  -v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro \\
  nginx:alpine
"""

b64_script = base64.b64encode(script.encode()).decode()
cmd = f"ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S bash -c \\\"echo {b64_script} | base64 -d | bash\\\"\""

stdin, stdout, stderr = ssh.exec_command(cmd)
print("OUT:", stdout.read().decode())
