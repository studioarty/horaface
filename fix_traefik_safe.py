import paramiko

bash_script = """#!/bin/bash
docker rm -f pontoface-web
docker run -d --name pontoface-web \\
  --network coolify \\
  --restart unless-stopped \\
  -v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro \\
  -v /data/pontoface:/usr/share/nginx/html:ro \\
  -l "traefik.enable=true" \\
  -l "traefik.docker.network=coolify" \\
  -l "traefik.http.routers.pontoface-http.entrypoints=http" \\
  -l "traefik.http.routers.pontoface-http.middlewares=redirect-to-https" \\
  -l "traefik.http.routers.pontoface-http.rule=Host(\\`ibavkiosk.com\\`)" \\
  -l "traefik.http.routers.pontoface-http.service=pontoface" \\
  -l "traefik.http.routers.pontoface-https.entrypoints=https" \\
  -l "traefik.http.routers.pontoface-https.rule=Host(\\`ibavkiosk.com\\`)" \\
  -l "traefik.http.routers.pontoface-https.service=pontoface" \\
  -l "traefik.http.routers.pontoface-https.tls=true" \\
  -l "traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt" \\
  -l "traefik.http.routers.pontoface-local.rule=Host(\\`192.168.10.113\\`)" \\
  -l "traefik.http.routers.pontoface-local.entrypoints=http" \\
  -l "traefik.http.routers.pontoface-local.service=pontoface" \\
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \\
  nginx:alpine
"""

with open("fix_traefik.sh", "wb") as f:
    f.write(bash_script.replace('\r\n', '\n').encode('utf-8'))

def fix():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")
        sftp = ssh.open_sftp()
        sftp.put("fix_traefik.sh", "/tmp/fix_traefik.sh")
        sftp.close()
        
        # Copia do proxmox para a VM e executa nativamente
        cmd = """
        scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/fix_traefik.sh ibav@192.168.10.113:/tmp/fix.sh && \\
        ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo bash /tmp/fix.sh'
        """
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        print("STDOUT:", stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print("STDERR:", err)
        
        print("[*] Script executado.")
        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    fix()
