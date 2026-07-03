import paramiko
import base64
import sys

# The docker compose that hooks automatically and opens port 8085!
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
      - "traefik.http.routers.pontocloud.rule=Host(`cloud.ibavkiosk.com`)"
      - "traefik.http.routers.pontocloud.entrypoints=web,websecure"
      - "traefik.http.services.pontocloud.loadbalancer.server.port=80"

networks:
  coolify:
    external: true
"""

def deploy():
    print("[*] Conectando a 192.168.10.100 via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname="192.168.10.100", username="root", password="IB@Vschool123", timeout=10)
        encoded_compose = base64.b64encode(compose_file.encode()).decode()
        
        commands = f"""
        sudo -S sh -c '
        echo "{encoded_compose}" | base64 -d > /data/pontocloud/docker-compose.yml
        cd /data/pontocloud
        docker compose up -d --force-recreate
        '
        """
        
        print("[*] Reconfigurando Docker no Servidor 113 para liberar Porta 8085...")
        cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | {commands}\""
        
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_code = stdout.channel.recv_exit_status()
        print(stdout.read().decode())
        
        if exit_code == 0:
            print("[*] SUCESSO! O PontoCloud agora responde publicamente em http://ibavkiosk.com:8085")
        ssh.close()
    except Exception as e:
        print("[!] ERRO:", e)

if __name__ == '__main__':
    deploy()
