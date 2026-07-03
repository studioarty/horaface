import paramiko

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        sftp = ssh.open_sftp()
        
        script_content = """#!/bin/bash
docker stop pontoface-web || true
docker rm pontoface-web || true
docker run -d --name pontoface-web --restart unless-stopped \\
  --network coolify \\
  -l "traefik.enable=true" \\
  -l "traefik.http.routers.pontoface.rule=Host(\\`ibavkiosk.com\\`)" \\
  -l "traefik.http.routers.pontoface.entrypoints=https" \\
  -l "traefik.http.routers.pontoface.tls=true" \\
  -l "traefik.http.routers.pontoface.tls.certresolver=letsencrypt" \\
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \\
  -v /data/pontoface:/usr/share/nginx/html:ro \\
  nginx:alpine
"""
        with open("remote_run2.sh", "w", newline="\n") as f:
            f.write(script_content)
        
        print("[*] Upload do script para a VM 100...")
        sftp.put("remote_run2.sh", "/tmp/remote_run2.sh")
        sftp.close()
        
        print("[*] Enviando script da VM 100 para a VM 113...")
        cmd_scp = "scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/remote_run2.sh ibav@192.168.10.113:/tmp/run2.sh"
        ssh.exec_command(cmd_scp)[1].channel.recv_exit_status()
        
        print("[*] Executando script na VM 113 como root...")
        cmd_ssh = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S bash /tmp/run2.sh\""
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_status = stdout.channel.recv_exit_status()
        
        for line in stdout.read().splitlines():
            print(f"  > {line.decode('utf-8')}")
        for line in stderr.read().splitlines():
            print(f"  > [ERRO] {line.decode('utf-8')}")
            
        print(f"[*] SUCESSO. Code: {exit_status}")
        ssh.close()
        
    except Exception as e:
        print(f"[X] Excecao: {e}")

if __name__ == "__main__":
    deploy()
