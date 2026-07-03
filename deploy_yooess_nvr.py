import paramiko
import os

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def deploy():
    print(f"[*] Conectando a {host} via SSH para deploy do Frigate NVR...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        
        print("[*] Verificando Docker no Proxmox...")
        _, stdout_docker, _ = ssh.exec_command("docker --version")
        docker_version = stdout_docker.read().decode('utf-8').strip()
        if not docker_version:
            print("[X] Docker não encontrado no Host Proxmox. O deploy direto no host falhará.")
            # Vamos tentar mesmo assim, talvez seja podman ou docker compose no path
        else:
            print(f"[*] Encontrado: {docker_version}")

        print("[*] Criando diretório /opt/yooess-nvr...")
        ssh.exec_command("mkdir -p /opt/yooess-nvr/storage")
        
        print("[*] Transferindo Stack do Frigate...")
        sftp = ssh.open_sftp()
        
        files = ["docker-compose.yml", "frigate.yml", "mosquitto.conf"]
        for f in files:
            local_path = os.path.join("yooess-nvr", f)
            remote_path = f"/opt/yooess-nvr/{f}"
            print(f"  - Enviando {f}...")
            sftp.put(local_path, remote_path)
            
        sftp.close()
        
        print("[*] Arquivos transferidos com sucesso. Executando docker compose up -d...")
        
        # Pode ser que esteja no PATH padrão, ou precise de docker-compose
        command = "cd /opt/yooess-nvr && (docker compose up -d || docker-compose up -d)"
        stdin, stdout, stderr = ssh.exec_command(command)
        
        exit_status = stdout.channel.recv_exit_status()
        
        for line in stdout.read().splitlines():
            print(f"  > {line.decode('utf-8')}")
            
        for line in stderr.read().splitlines():
            print(f"  > [LOG] {line.decode('utf-8')}")
            
        if exit_status == 0:
            print(f"\n[*] SUCESSO: O Cérebro do Frigate NVR foi ligado no Proxmox ({host})!")
        else:
            print(f"\n[!] AVISO: Código de erro {exit_status}.")
            
        ssh.close()
        
    except Exception as e:
        print(f"\n[X] Falha Crítica: {str(e)}")

if __name__ == "__main__":
    deploy()
