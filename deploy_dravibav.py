import os
import tarfile
import paramiko
import base64
import sys

SOURCE_DIR = "Dravibav6_Extracted"
TAR_FILE = "dravibav_src.tar"
PVE_HOST = "192.168.10.100"
VM_IP = "192.168.10.113"
PVE_USER = "root"
PVE_PASS = "IB@Vschool123"
VM_USER = "ibav"
VM_PASS = "IB@Vschool123"

def make_tarfile():
    print(f"[*] Compactando {SOURCE_DIR} (ignorando node_modules)...")
    with tarfile.open(TAR_FILE, "w") as tar:
        for root, dirs, files in os.walk(SOURCE_DIR):
            if "node_modules" in root or ".git" in root or "dist" in root:
                continue
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, SOURCE_DIR)
                tar.add(full_path, arcname=arcname)
    print(f"[*] Compactação concluída: {TAR_FILE}")

compose_yml = """services:
  dravibav-app:
    build: .
    container_name: dravibav_frontend
    restart: unless-stopped
    ports:
      - 8086:80
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontocloud.rule=Host(`cloud.ibavkiosk.com`)"
      - "traefik.http.routers.pontocloud.entrypoints=http,https"
      - "traefik.http.services.pontocloud.loadbalancer.server.port=80"
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
        
        print(f"[*] Fazendo Upload de {TAR_FILE} para o Proxmox...")
        sftp = ssh.open_sftp()
        sftp.put(TAR_FILE, f"/tmp/{TAR_FILE}")
        sftp.close()
        
        encoded_compose = base64.b64encode(compose_yml.encode()).decode()
        
        vm_script = f"""
echo "{VM_PASS}" | sudo -S sh -c '
mkdir -p /data/dravibav
cd /data/dravibav

mv /tmp/{TAR_FILE} . 2>/dev/null || true
tar -xf {TAR_FILE}

echo "{encoded_compose}" | base64 -d > docker-compose.yml

# Derruba o PontoCloud antigo (Next.js) que ocupava a Traefik Label pontocloud
docker stop pontocloud_frontend 2>/dev/null || true
docker rm pontocloud_frontend 2>/dev/null || true

docker compose stop dravibav-app 2>/dev/null || true
docker compose rm -f dravibav-app 2>/dev/null || true

echo "[*] Iniciando Build da Imagem Docker Dravibav (React Vite)..."
docker compose build --no-cache
docker compose up -d

rm -f {TAR_FILE}
docker image prune -af
'
        """
        encoded_vm_script = base64.b64encode(vm_script.encode()).decode()
        
        pve_script = f"""
scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/{TAR_FILE} {VM_USER}@{VM_IP}:/tmp/{TAR_FILE}
ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no {VM_USER}@{VM_IP} "echo '{encoded_vm_script}' | base64 -d | sh"
"""
        
        print("[*] Building Dravibav6...")
        stdin, stdout, stderr = ssh.exec_command(pve_script)
        
        for line in iter(lambda: stdout.readline(2048), ""):
            print(line, end="")
            sys.stdout.flush()
            
        exit_code = stdout.channel.recv_exit_status()
        err = stderr.read().decode()
        if err:
            print(f"[!] Aviso:\n{err}")
            
        if exit_code == 0:
            print("\\n[*] DEPLOY FULLSTACK CONCLUÍDO! Dravibav6 Independente Online!")
        else:
            print(f"\\n[!] Falha no Build. Código: {exit_code}")
        
    except Exception as e:
        print("[!] ERRO:", e)
    finally:
        ssh.close()
        if os.path.exists(TAR_FILE):
            os.remove(TAR_FILE)

if __name__ == '__main__':
    deploy()
