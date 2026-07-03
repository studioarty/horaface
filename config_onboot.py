import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("[*] Conectando ao Proxmox 192.168.10.100...")
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=10)
    
    # Obter lista de VMs
    stdin, stdout, stderr = ssh.exec_command("qm list | awk '$3 != \"template\" && NR>1 {print $1}'")
    vms = [v.strip() for v in stdout.read().decode().strip().split('\n') if v.strip()]
    
    for vmid in vms:
        ssh.exec_command(f"qm set {vmid} --onboot 1")
        print(f"  [+] VM {vmid}: Autostart (onboot=1) habilitado.")
        
    # Obter lista de LXCs
    stdin, stdout, stderr = ssh.exec_command("pct list | awk '$3 != \"template\" && NR>1 {print $1}'")
    lxcs = [v.strip() for v in stdout.read().decode().strip().split('\n') if v.strip()]
    
    for vmid in lxcs:
        ssh.exec_command(f"pct set {vmid} --onboot 1")
        print(f"  [+] LXC {vmid}: Autostart (onboot=1) habilitado.")
        
    # Ligar VM 200 agora para testar o dominio
    print("\n[*] Ligar a VM 200 (Coolify) para restaurar os servicos...")
    ssh.exec_command("qm start 200")
    print("  [+] Comando 'qm start 200' enviado.")

    ssh.close()
    print("[*] Configuracao concluida com sucesso!")
    
except Exception as e:
    print(f"[ERROR] Falha ao configurar: {e}")
