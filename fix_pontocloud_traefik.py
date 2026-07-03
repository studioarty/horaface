import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    compose_file = """services:
  pontocloud-web:
    image: nginx:alpine
    container_name: pontocloud_frontend
    restart: unless-stopped
    ports:
      - 8085:80
    volumes:
      - /data/pontocloud/html:/usr/share/nginx/html:ro
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontocloud-http.rule=Host(`cloud.ibavkiosk.com`)"
      - "traefik.http.routers.pontocloud-http.entrypoints=http"
      - "traefik.http.routers.pontocloud-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.routers.pontocloud-https.rule=Host(`cloud.ibavkiosk.com`)"
      - "traefik.http.routers.pontocloud-https.entrypoints=https"
      - "traefik.http.routers.pontocloud-https.tls=true"
      - "traefik.http.routers.pontocloud-https.tls.certresolver=letsencrypt"
      - "traefik.http.services.pontocloud.loadbalancer.server.port=80"
      - "traefik.http.routers.pontocloud-http.service=pontocloud"
      - "traefik.http.routers.pontocloud-https.service=pontocloud"
      - "traefik.docker.network=coolify"

networks:
  coolify:
    external: true
"""
    b64_compose = base64.b64encode(compose_file.encode()).decode()
    
    commands = f"""
    sudo -S sh -c '
    echo "{b64_compose}" | base64 -d > /data/pontocloud/docker-compose.yml
    cd /data/pontocloud
    docker compose up -d --force-recreate
    '
    """
    
    cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | {commands}\""
    stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
    
    print("[*] OUTPUT:", stdout.read().decode().strip())
    print("[*] ERROS:", stderr.read().decode().strip())
    
    # TESTE
    import time
    time.sleep(3)
    stdin, stdout, stderr = ssh.exec_command("curl -k -s -I -H 'Host: cloud.ibavkiosk.com' https://192.168.10.113")
    print("\nHTTP RESULT [HTTPS]:")
    print(stdout.read().decode().strip())

    ssh.close()
except Exception as e:
    print("Erro:", e)
