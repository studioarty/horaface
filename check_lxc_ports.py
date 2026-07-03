import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    print("[*] Checking LXC 101...")
    stdin, stdout, stderr = ssh.exec_command("pct exec 101 -- ss -tulpn | grep ':80\\s|:443\\s'")
    print(stdout.read().decode().strip() or "Nenhuma porta 80/443")
    
    print("\n[*] Checking LXC 104...")
    stdin, stdout, stderr = ssh.exec_command("pct exec 104 -- ss -tulpn | grep ':80\\s|:443\\s'")
    print(stdout.read().decode().strip() or "Nenhuma porta 80/443")
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
