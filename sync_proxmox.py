import os
import subprocess
import paramiko
import sys
import shutil

HOST_PROXMOX = "192.168.10.100"
USER_PROXMOX = "root"
PASS_PROXMOX = "IB@Vschool123"
VM_IP = "192.168.10.113"

def run_cmd(cmd, cwd):
    print(f"[*] Executando: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"[!] ERRO: Comando falhou com código {result.returncode}")
        sys.exit(1)

def deploy():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_folder = os.path.join(base_dir, "dist")
    tar_path = os.path.join(base_dir, "dist.tar.gz")
    
    if not os.path.exists(dist_folder):
        print("[*] Pasta dist não encontrada. Gerando o build agora...")
        run_cmd("npm run build", cwd=base_dir)
        
    if os.path.exists(tar_path):
        os.remove(tar_path)
        
    print("[*] Compactando pasta dist em dist.tar.gz...")
    run_cmd("tar -czf dist.tar.gz dist", cwd=base_dir)
    
    print(f"[*] Conectando ao host Proxmox ({HOST_PROXMOX}) via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=HOST_PROXMOX, username=USER_PROXMOX, password=PASS_PROXMOX, timeout=10)
        sftp = ssh.open_sftp()
        
        print("[*] Fazendo upload do pacote dist.tar.gz para o Proxmox /tmp/...")
        sftp.put(tar_path, "/tmp/dist.tar.gz")
        sftp.close()
        
        print(f"[*] Proxmox: Enviando pacote para a VM {VM_IP}...")
        cmd_scp = f"scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/dist.tar.gz ibav@{VM_IP}:/tmp/dist.tar.gz"
        stdin, stdout, stderr = ssh.exec_command(cmd_scp)
        if stdout.channel.recv_exit_status() != 0:
            print("[!] Erro no SCP interno:", stderr.read().decode())
            sys.exit(1)
            
        print("[*] Proxmox: Extraindo e atualizando /data/pontoface/ na VM...")
        cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@{VM_IP} \"echo '{PASS_PROXMOX}' | sudo -S sh -c 'rm -rf /data/pontoface/* && tar -xzf /tmp/dist.tar.gz -C /tmp/ && mv /tmp/dist/* /data/pontoface/ && rm -rf /tmp/dist /tmp/dist.tar.gz'\""
        
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            print("[*] DEPLOY PARA PROXMOX FINALIZADO COM SUCESSO!")
        else:
            print(f"[!] Erro no SSH interno (código {exit_status}):")
            print(stderr.read().decode())
        
        ssh.close()
        os.remove(tar_path)
        
    except Exception as e:
        print(f"[!] Erro durante o deploy SSH: {e}")
        sys.exit(1)

if __name__ == "__main__":
    deploy()
