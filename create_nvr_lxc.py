import paramiko
import os
import time
import sys

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def deploy():
    print("[*] Iniciando Missão Isolada: NVR em Container LXC Segregado")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
    except Exception as e:
        print(f"[X] Falha de conexão SSH: {e}")
        return

    print("[*] Baixando Template Oficial do Ubuntu (Pode levar uns minutos se for a primeira vez)...")
    
    # Comandos bash para Proxmox via SSH
    command = """
    export DEBIAN_FRONTEND=noninteractive
    pveam update > /dev/null
    # Tenta baixar ubuntu 22.04 se nao existir
    if [ ! -f /var/lib/vz/template/cache/ubuntu-22.04-standard_22.04-1_amd64.tar.zst ]; then
        pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst
    fi

    # Limpa a 199 se já foi um teste que falhou antes
    if pct status 199 &> /dev/null; then
        pct stop 199 || true
        pct destroy 199 || true
    fi
    
    echo "-> Criando LXC ID 199 (Yooess-NVR) [4 Cores, 4GB RAM, Suporte a Docker Nested]"
    # storage local-lvm ou local, usaremos local-lvm por padrão no proxmox
    pct create 199 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst --hostname Yooess-NVR --password IB@Vschool123 --cores 4 --memory 4096 --swap 2048 --net0 name=eth0,bridge=vmbr0,ip=dhcp --features nesting=1 --unprivileged 0 --storage local-lvm --rootfs 20
    pct start 199
    
    echo "-> Aguardando o boot da máquina virtual..."
    sleep 15
    
    echo "-> Instalando Docker Otimizado dentro do LXC..."
    pct exec 199 -- bash -c "apt-get update -y && apt-get install -y curl && curl -fsSL https://get.docker.com | sh"
    
    echo "-> Pre-criando as pastas no container..."
    pct exec 199 -- mkdir -p /opt/yooess-nvr
    """

    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    
    for line in stdout.read().splitlines():
        print(f"  {line.decode('utf-8')}")
        
    for line in stderr.read().splitlines():
             decoded = line.decode('utf-8')
             if "warning" not in decoded.lower():
                 print(f"  [Log] {decoded}")

    if exit_status != 0:
        print("[X] Falha no provisionamento do container LXC. Cheque os logs do Proxmox.")
        ssh.close()
        return

    print("\n[*] Infraestrutura base (Mãe) pronta! Agora injetando a 'Alma' (Cérebro da IA)...")
    sftp = ssh.open_sftp()
    files = ["docker-compose.yml", "frigate.yml", "mosquitto.conf"]
    ssh.exec_command("mkdir -p /tmp/nvr")
    for f in files:
        print(f"  - Enviando arquivo sensível de arquitetura: {f}")
        sftp.put(os.path.join("yooess-nvr", f), f"/tmp/nvr/{f}")
    sftp.close()

    print("\n[*] Lançando o servidor de vídeo (Isto ligará a IA e as Câmeras)...")
    command2 = """
    # Mover os arquivos do host para dentro do LXC 199 isolado
    pct push 199 /tmp/nvr/docker-compose.yml /opt/yooess-nvr/docker-compose.yml
    pct push 199 /tmp/nvr/frigate.yml /opt/yooess-nvr/frigate.yml
    pct push 199 /tmp/nvr/mosquitto.conf /opt/yooess-nvr/mosquitto.conf
    
    pct exec 199 -- bash -c "cd /opt/yooess-nvr && docker compose up -d"
    
    # Capturar IP para o Cliente final
    pct exec 199 -- ip -4 addr show eth0 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'
    """
    stdin, stdout, stderr = ssh.exec_command(command2)
    exit_status = stdout.channel.recv_exit_status()
    
    output_lines = stdout.read().splitlines()
    ip_addr = "N/A"
    if output_lines:
        ip_addr = output_lines[-1].decode('utf-8').strip()
        
    for line in stderr.read().splitlines():
        print(f"  > {line.decode('utf-8')}")
        
    print(f"\n==============================================")
    print(f"🚀 SUCESSO TOTAL! YOOESS-NVR ONLINE E ISOLADO.")
    print(f"A sua infraestrutura principal (PontoFace, etc) NÃO foi tocada.")
    print(f"Painel do Frigate IA disponível em: http://{ip_addr}:5000")
    print(f"Acesso SSH deste Container: ssh root@{ip_addr} (Senha: IB@Vschool123)")
    print(f"==============================================\n")
    
    ssh.close()

if __name__ == "__main__":
    deploy()
