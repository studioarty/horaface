import paramiko
import os
import sys

# Hostinger config
H_HOST = "147.93.37.32"
H_PORT = 65002
H_USER = "u407222665"
H_PASS = "IB@Vschool123"

# Proxmox config
P_HOST = "192.168.10.100"
P_USER = "root"
P_PASS = "IB@Vschool123"
VM_IP = "192.168.10.113"
VM_USER = "ibav"

LOCAL_ZIP = "compositor_clone.zip"

print("[*] Conectando à Hostinger...")
try:
    h_ssh = paramiko.SSHClient()
    h_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    h_ssh.connect(H_HOST, port=H_PORT, username=H_USER, password=H_PASS, timeout=10)
    
    print("[*] Compactando arquivos no compositor.sbs...")
    stdin, stdout, stderr = h_ssh.exec_command("cd domains/compositor.sbs/public_html && zip -r ../compositor_clone.zip .")
    print(stdout.read().decode())
    
    print("[*] Baixando compositor_clone.zip para máquina local...")
    sftp = h_ssh.open_sftp()
    sftp.get("domains/compositor.sbs/compositor_clone.zip", LOCAL_ZIP)
    sftp.close()
    
    # Cleanup on hostinger
    h_ssh.exec_command("rm domains/compositor.sbs/compositor_clone.zip")
    h_ssh.close()
    
except Exception as e:
    print(f"[X] Erro na Hostinger: {e}")
    sys.exit(1)

print("[*] Conectando ao Proxmox...")
try:
    p_ssh = paramiko.SSHClient()
    p_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    p_ssh.connect(P_HOST, username=P_USER, password=P_PASS, timeout=10)
    
    print("[*] Enviando ZIP para Proxmox...")
    sftp = p_ssh.open_sftp()
    sftp.put(LOCAL_ZIP, f"/tmp/{LOCAL_ZIP}")
    sftp.close()
    
    print("[*] Enviando do Proxmox para a VM 113 (ibavkiosk.com)...")
    cmd_scp = f"scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/{LOCAL_ZIP} {VM_USER}@{VM_IP}:/tmp/{LOCAL_ZIP}"
    stdin, stdout, stderr = p_ssh.exec_command(cmd_scp)
    out = stdout.read().decode()
    if stdout.channel.recv_exit_status() != 0:
        print("[X] Erro SCP:", stderr.read().decode())
        sys.exit(1)
        
    print("[*] Substituindo os arquivos na VM 113...")
    cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no {VM_USER}@{VM_IP} \"echo 'IB@Vschool123' | sudo -S sh -c 'rm -rf /data/pontoface/* && unzip -o /tmp/{LOCAL_ZIP} -d /data/pontoface/ && rm /tmp/{LOCAL_ZIP}'\""
    stdin, stdout, stderr = p_ssh.exec_command(cmd_ssh)
    if stdout.channel.recv_exit_status() == 0:
        print("[*] DEPLOY CONCLUIDO! Clonagem finalizada em ibavkiosk.com.")
    else:
        print("[X] Erro na extração:", stderr.read().decode())
        
    p_ssh.close()
    
    # Clean up local zip
    if os.path.exists(LOCAL_ZIP):
        os.remove(LOCAL_ZIP)
        
except Exception as e:
    print(f"[X] Erro no Proxmox: {e}")
    sys.exit(1)
