import os
import tarfile
import paramiko
import base64
import sys

SOURCE_DIR = "ponto-cloud"
TAR_FILE = "pontocloud_src.tar"
PVE_HOST = "192.168.10.100"
VM_IP = "192.168.10.113"
PVE_USER = "root"
PVE_PASS = "IB@Vschool123"
VM_USER = "ibav"
VM_PASS = "IB@Vschool123"

def make_tarfile():
    print(f"[*] Compactando {SOURCE_DIR} (ignorando node_modules e .next)...")
    with tarfile.open(TAR_FILE, "w") as tar:
        for root, dirs, files in os.walk(SOURCE_DIR):
            if "node_modules" in root or ".next" in root:
                continue
            
            for file in files:
                if file == "dev.db":
                    continue
                
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, SOURCE_DIR)
                tar.add(full_path, arcname=arcname)
    print(f"[*] Compactação concluída: {TAR_FILE}")

compose_yml = """services:
  pontocloud-app:
    build: .
    container_name: pontocloud_frontend
    restart: unless-stopped
    ports:
      - 8085:3000
    volumes:
      - /data/pontocloud/db/dev.db:/app/prisma/dev.db
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontocloud.rule=Host(`cloud.ibavkiosk.com`)"
      - "traefik.http.routers.pontocloud.entrypoints=http,https"
      - "traefik.http.services.pontocloud.loadbalancer.server.port=3000"
      - "traefik.http.routers.pontocloud.tls=true"
      - "traefik.http.routers.pontocloud.tls.certresolver=letsencrypt"

networks:
  coolify:
    external: true
"""

def deploy():
    make_tarfile()
    print(f"[*] Conectando ao Proxmox ({PVE_HOST})...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=PVE_HOST, username=PVE_USER, password=PVE_PASS, timeout=10)
        
        print(f"[*] Fazendo Upload de {TAR_FILE} para o Proxmox temporário...")
        sftp = ssh.open_sftp()
        sftp.put(TAR_FILE, f"/tmp/{TAR_FILE}")
        sftp.close()
        
        encoded_compose = base64.b64encode(compose_yml.encode()).decode()
        
        # Script que vai rodar dentro da VM 113
        vm_script = f"""
echo "{VM_PASS}" | sudo -S sh -c '
mkdir -p /data/pontocloud/src
mkdir -p /data/pontocloud/db
cd /data/pontocloud/src

mv /tmp/{TAR_FILE} . 2>/dev/null || true
tar -xf {TAR_FILE}

echo "{encoded_compose}" | base64 -d > docker-compose.yml

if [ ! -f /data/pontocloud/db/dev.db ]; then
    touch /data/pontocloud/db/dev.db
fi

docker compose down
echo "[*] Iniciando Build da Imagem Docker Node.js (Isso pode demorar alguns minutos)..."
docker compose build --no-cache
docker compose up -d

rm -f {TAR_FILE}
docker image prune -af
'
        """
        encoded_vm_script = base64.b64encode(vm_script.encode()).decode()
        
        # Comandos que rodam no PVE para enviar o tar pra VM 113 e executar o script usando KEY
        pve_script = f"""
scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/{TAR_FILE} {VM_USER}@{VM_IP}:/tmp/{TAR_FILE}
ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no {VM_USER}@{VM_IP} "echo '{encoded_vm_script}' | base64 -d | sh"
        """
        
        print("[*] Iniciando processo de Build na VM 113. Aguarde...")
        stdin, stdout, stderr = ssh.exec_command(pve_script)
        
        for line in iter(lambda: stdout.readline(2048), ""):
            print(line, end="")
            sys.stdout.flush()
            
        exit_code = stdout.channel.recv_exit_status()
        err = stderr.read().decode()
        if err:
            print(f"[!] Erros/Avisos:\n{err}")
            
        if exit_code == 0:
            print("\\n[*] DEPLOY FULLSTACK CONCLUÍDO! O PontoCloud agora em Node.js está Online em cloud.ibavkiosk.com")
        else:
            print(f"\\n[!] Falha no Build. Código: {exit_code}")
        
        ssh.close()
        os.remove(TAR_FILE)
    except Exception as e:
        print("[!] ERRO CRITICO:", e)

if __name__ == '__main__':
    deploy()
