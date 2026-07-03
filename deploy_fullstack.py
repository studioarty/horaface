import os
import tarfile
import paramiko
import base64
import sys
import subprocess

TAR_FILE = "pontocore_super.tar"
PVE_HOST = "192.168.10.100"
VM_IP = "192.168.10.113"
PVE_USER = "root"
PVE_PASS = "IB@Vschool123"
VM_USER = "ibav"
VM_PASS = "IB@Vschool123"

def build_dist():
    print("[*] Recompilando frontend pelo Vite...")
    result = subprocess.run("npm run build", shell=True)
    if result.returncode != 0:
        print("[!] Falha no build Vite!")
        sys.exit(1)

def make_tarfile():
    print(f"[*] Compactando pastas dist e backend (ignorando node_modules e dev.db)...")
    if os.path.exists(TAR_FILE):
        os.remove(TAR_FILE)
        
    with tarfile.open(TAR_FILE, "w") as tar:
        # 1. Dist Folder
        if os.path.exists("dist"):
            for root, dirs, files in os.walk("dist"):
                for file in files:
                    fp = os.path.join(root, file)
                    tar.add(fp, arcname=os.path.join("frontend", os.path.relpath(fp, "dist")))

        # 2. Backend Folder
        if os.path.exists("backend"):
            for root, dirs, files in os.walk("backend"):
                if "node_modules" in root or "backups" in root:
                    continue
                for file in files:
                    if file == "dev.db" or file.endswith(".tar") or file.endswith(".zip"):
                        continue
                    fp = os.path.join(root, file)
                    tar.add(fp, arcname=os.path.join("backend", os.path.relpath(fp, "backend")))
                    
    print(f"[*] Compactação concluída: {TAR_FILE}")


# Configuration Strings
dockerfile = """FROM node:20-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3005
CMD ["npx", "ts-node", "server.ts"]
"""

nginx_conf = """server {
    listen       80;
    server_name  localhost;
    client_max_body_size 500M;
    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
"""

compose_yml = """services:
  pontoface-web:
    image: nginx:alpine
    container_name: pontoface_frontend
    restart: unless-stopped
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
      - ./spa.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontoface-http.rule=Host(`ibavkiosk.com`)"
      - "traefik.http.routers.pontoface-http.entrypoints=http"
      - "traefik.http.routers.pontoface-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.routers.pontoface-https.rule=Host(`ibavkiosk.com`)"
      - "traefik.http.routers.pontoface-https.entrypoints=https"
      - "traefik.http.routers.pontoface-https.tls=true"
      - "traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt"
      - "traefik.http.routers.pontoface-https.service=pontoface-web"
      - "traefik.http.services.pontoface-web.loadbalancer.server.port=80"

  pontoface-api:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: pontoface_backend
    restart: unless-stopped
    volumes:
      - /data/pontoface/db/dev.db:/app/prisma/dev.db
      - /data/pontoface/uploads:/app/uploads
      - /data/pontoface/backups:/app/backups
    networks:
      - coolify
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pontoface-api.rule=Host(`ibavkiosk.com`) && (PathPrefix(`/api`) || PathPrefix(`/uploads`))"
      - "traefik.http.routers.pontoface-api.entrypoints=https"
      - "traefik.http.routers.pontoface-api.tls=true"
      - "traefik.http.routers.pontoface-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.pontoface-api.service=pontoface-api"
      - "traefik.http.services.pontoface-api.loadbalancer.server.port=3005"

networks:
  coolify:
    external: true
"""

def deploy():
    build_dist()
    make_tarfile()
    print(f"[*] Conectando ao Proxmox ({PVE_HOST})...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=PVE_HOST, username=PVE_USER, password=PVE_PASS, timeout=10)
        
        print(f"[*] Upload de {TAR_FILE} para o Proxmox temporário...")
        sftp = ssh.open_sftp()
        sftp.put(TAR_FILE, f"/tmp/{TAR_FILE}")
        sftp.close()
        
        encoded_dockerfile = base64.b64encode(dockerfile.encode()).decode()
        encoded_nginx = base64.b64encode(nginx_conf.encode()).decode()
        encoded_compose = base64.b64encode(compose_yml.encode()).decode()
        
        # Script que vai rodar dentro da VM 113
        vm_script = f"""
echo "{VM_PASS}" | sudo -S sh -c '
mkdir -p /data/pontoface/src
mkdir -p /data/pontoface/db
mkdir -p /data/pontoface/uploads
mkdir -p /data/pontoface/backups
cd /data/pontoface/src

# Remove builds antigos para evitar conflitos nativos 
rm -rf frontend backend docker-compose.yml spa.conf

mv /tmp/{TAR_FILE} . 2>/dev/null || true
tar -xf {TAR_FILE}

echo "{encoded_dockerfile}" | base64 -d > backend/Dockerfile
echo "{encoded_nginx}" | base64 -d > spa.conf
echo "{encoded_compose}" | base64 -d > docker-compose.yml

# Inicializar Banco de dados SQLite virgem em caso de Deploy Fresh
if [ ! -f /data/pontoface/db/dev.db ]; then
    touch /data/pontoface/db/dev.db
    echo "[!] Criando dev.db em branco, migre o Schema via Prisma!"
fi

# Copiamos o prisma schema pro volume db para seguranca de mapeamento 
cp backend/prisma/schema.prisma /data/pontoface/db/ || true

echo "[*] Limpando Containers Antigos..."
sudo docker rm -f pontoface-web pontoface-web 2>/dev/null || true
sudo docker compose down 2>/dev/null || true

echo "[*] Iniciando Build da Imagem Docker Node.js API (Isso pode demorar alguns minutos)..."
sudo docker compose build --no-cache
sudo docker compose up -d

rm -f {TAR_FILE}
sudo docker image prune -af
'
        """
        encoded_vm_script = base64.b64encode(vm_script.encode()).decode()
        
        print(f"[*] Disparando orquestração interna no Container VM {VM_IP}...")
        scp_cmd = f"scp -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/{TAR_FILE} ibav@{VM_IP}:/tmp/"
        stdin, stdout, stderr = ssh.exec_command(scp_cmd)
        if stdout.channel.recv_exit_status() != 0:
            print("[!] ERRO SCP PVE -> VM:", stderr.read().decode())
        
        run_cmd = f"ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@{VM_IP} \"echo {encoded_vm_script} | base64 -d | bash\""
        stdin, stdout, stderr = ssh.exec_command(run_cmd)
        
        # Stream the output
        for line in iter(stdout.readline, ""):
            try:
                print(line, end="")
            except:
                pass
            
        print("\n[*] DEPLOY FULLSTACK CONCLUÍDO! O PontoFace Completo agora atende em ibavkiosk.com")
        
        ssh.close()
        os.remove(TAR_FILE)
        
    except Exception as e:
        print(f"[!] Erro Crítico durante o deploy SSH: {e}")
        sys.exit(1)

if __name__ == "__main__":
    deploy()
