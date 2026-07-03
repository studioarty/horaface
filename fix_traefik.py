import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    script = """#!/bin/bash
docker rm -f pontoface-web || true
docker run -d --name pontoface-web --restart unless-stopped \\
  --network coolify \\
  -l "traefik.enable=true" \\
  -l "traefik.http.routers.pontoface-http.rule=Host(\\`ibavkiosk.com\\`)" \\
  -l "traefik.http.routers.pontoface-http.entrypoints=web" \\
  -l "traefik.http.routers.pontoface-http.middlewares=redirect-to-https" \\
  -l "traefik.http.routers.pontoface-http.service=pontoface" \\
  -l "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https" \\
  -l "traefik.http.routers.pontoface-https.rule=Host(\\`ibavkiosk.com\\`)" \\
  -l "traefik.http.routers.pontoface-https.entrypoints=websecure" \\
  -l "traefik.http.routers.pontoface-https.tls=true" \\
  -l "traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt" \\
  -l "traefik.http.routers.pontoface-https.service=pontoface" \\
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \\
  -l "traefik.docker.network=coolify" \\
  -v /data/pontoface:/usr/share/nginx/html:ro \\
  -v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro \\
  nginx:alpine
"""
    b64_script = base64.b64encode(script.encode()).decode()
    
    upload = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S bash -c 'echo {b64_script} | base64 -d > /data/run_nginx.sh && chmod +x /data/run_nginx.sh'\""
    ssh.exec_command(upload)[1].read()
    
    run = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S bash /data/run_nginx.sh\""
    stdin, stdout, stderr = ssh.exec_command(run)
    
    print("[*] OUTPUT:", stdout.read().decode().strip())
    print("[*] ERR:", stderr.read().decode().strip())
    ssh.close()
except Exception as e:
    print("Erro:", e)
