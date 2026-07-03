import os
import sys
import zipfile
import subprocess
import paramiko
import shutil
import time

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

def deploy_zip(zip_name):
    base_dir = os.path.abspath(os.path.dirname(__file__))
    zip_path = os.path.join(os.path.dirname(base_dir), zip_name) # Puxar do 'D:\pontoibav'
    
    if not os.path.exists(zip_path):
        # Tenta na propria pasta
        zip_path = os.path.join(base_dir, zip_name)
        if not os.path.exists(zip_path):
            print(f"[!] ERRO: Arquivo {zip_name} não encontrado em {base_dir} ou D:\\pontoibav.")
            sys.exit(1)

    extract_folder = os.path.join(base_dir, "temp_deploy_extract")
    
    # 1. Clean previous temp folder
    if os.path.exists(extract_folder):
        print(f"[*] Limpando pasta de build antiga...")
        shutil.rmtree(extract_folder, ignore_errors=True)
    
    # 2. Extract ZIP
    print(f"[*] Extraindo {zip_path}...")
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_folder)
        
    print("[*] Extração concluída.")

    # 3. Build Front-End
    print("[*] Iniciando motor de compilação NPM...")
    run_cmd("npm install", cwd=extract_folder)
    
    # Just to be safe with user's missing PDF dependencies in recent versions:
    print("[*] Garantindo dependências críticas (jsPDF)...")
    run_cmd("npm install jspdf jspdf-autotable", cwd=extract_folder)
    
    run_cmd("npm run build", cwd=extract_folder)

    # 4. Comprimir dist
    dist_folder = os.path.join(extract_folder, "dist")
    if not os.path.exists(dist_folder):
        print("[!] ERRO: Pasta dist não foi gerada pelo build!")
        sys.exit(1)

    tar_path = os.path.join(base_dir, "dist.tar.gz")
    if os.path.exists(tar_path):
        os.remove(tar_path)

    print("[*] Compactando pasta dist em dist.tar.gz...")
    run_cmd("tar -czf dist.tar.gz dist", cwd=extract_folder)
    shutil.move(os.path.join(extract_folder, "dist.tar.gz"), tar_path)

    # 5. SSH Proxmox Deployment
    print(f"[*] Conectando a {HOST_PROXMOX} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=HOST_PROXMOX, username=USER_PROXMOX, password=PASS_PROXMOX, timeout=10)
        sftp = ssh.open_sftp()
        
        print("[*] Enviando pacote dist.tar.gz para o Proxmox Host...")
        sftp.put(tar_path, "/tmp/dist.tar.gz")
        sftp.close()
        
        print(f"[*] Injetando pacote na VM {VM_IP}...")
        cmd_scp = f"scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/dist.tar.gz ibav@{VM_IP}:/tmp/dist.tar.gz"
        ssh.exec_command(cmd_scp)[1].channel.recv_exit_status()
        
        print("[*] Limpando diretório antigo e ativando nova versão na VM...")
        cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@{VM_IP} \"echo '{PASS_PROXMOX}' | sudo -S sh -c 'rm -rf /data/pontoface/*; tar -xzf /tmp/dist.tar.gz -C /tmp/; mv /tmp/dist/* /data/pontoface/; rm -rf /tmp/dist /tmp/dist.tar.gz'\""
        
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status == 0:
            print("[*] DEPLOY SUCESSO! A nova versão já está no ar.")
        else:
            print(f"[!] ERRO DEPLOY! Código: {exit_status}")
            print(stderr.read().decode())
            
        ssh.close()
        
        # 6. Clean up
        os.remove(tar_path)
        print("[*] Resíduos limpos localmente.")

    except Exception as e:
        print(f"[!] Exceção SSH: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python fast_deploy.py <NomeDoArquivoZip>")
        print("Ex: python fast_deploy.py Dravibav6.zip")
        sys.exit(1)
        
    target_zip = sys.argv[1]
    print(f"=============================================")
    print(f"   AUTO-DEPLOY PONTO-CLOUD / DRAVIBAV UI")
    print(f"   Alvo: {target_zip} -> VM: {VM_IP}")
    print(f"=============================================")
    deploy_zip(target_zip)
