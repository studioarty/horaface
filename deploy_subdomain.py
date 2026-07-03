import os
import sys
import subprocess
import paramiko

HOST_PROXMOX = "192.168.10.100"
USER_PROXMOX = "root"
PASS_PROXMOX = "IB@Vschool123"
VM_IP = "192.168.10.113"
DOMAIN = "cloud.ibavkiosk.com"

# The docker compose that hooks automatically into Coolify's Traefik network
# We use the 'coolify' network assuming Traefik is running on it.
compose_file = f"""services:
  pontocloud-web:
    image: nginx:alpine
    container_name: pontocloud_frontend
    restart: unless-stopped
    volumes:
      - /data/pontocloud/html:/usr/share/nginx/html:ro
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontocloud.rule=Host(`{DOMAIN}`)"
      - "traefik.http.routers.pontocloud.entrypoints=web,websecure"
      - "traefik.http.services.pontocloud.loadbalancer.server.port=80"

networks:
  coolify:
    external: true
"""

def deploy():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    tar_path = os.path.join(base_dir, "dist.tar.gz")
    
    if not os.path.exists(tar_path):
        print("[!] dist.tar.gz não encontrado. Execute o fast_deploy primeiro.")
        sys.exit(1)

    print(f"[*] Conectando a {HOST_PROXMOX} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=HOST_PROXMOX, username=USER_PROXMOX, password=PASS_PROXMOX, timeout=10)
        sftp = ssh.open_sftp()
        print("[*] Transferindo dist.tar.gz para a nuvem PROXMOX (/tmp)...")
        sftp.put(tar_path, "/tmp/dist.tar.gz")
        sftp.close()
        
        print(f"[*] Remetendo pacote para a VM {VM_IP}...")
        ssh.exec_command(f"scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/dist.tar.gz ibav@{VM_IP}:/tmp/dist.tar.gz")[1].channel.recv_exit_status()
        
        # Build the remote shell commands
        import base64
        encoded_compose = base64.b64encode(compose_file.encode()).decode()
        
        commands = f"""
        sudo -S sh -c '
        mkdir -p /data/pontocloud/html
        tar -xzf /tmp/dist.tar.gz -C /tmp/
        rm -rf /data/pontocloud/html/*
        mv /tmp/dist/* /data/pontocloud/html/
        echo "{encoded_compose}" | base64 -d > /data/pontocloud/docker-compose.yml
        cd /data/pontocloud
        docker compose up -d --force-recreate
        rm -rf /tmp/dist /tmp/dist.tar.gz
        '
        """
        
        print(f"[*] Provisionando o container {DOMAIN} via Docker Traefik no Servidor 113...")
        cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@{VM_IP} \"echo '{PASS_PROXMOX}' | {commands}\""
        
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_code = stdout.channel.recv_exit_status()
        
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err: print("WARNING:", err)
            
        print(f"[*] DEPLOY DE SUBDOMINIO {DOMAIN} CONCLUIDO! (Code: {exit_code})")
        ssh.close()
    except Exception as e:
        print("[!] ERRO FATAL:", e)

if __name__ == '__main__':
    deploy()
