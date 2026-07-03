import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    stdin, stdout, stderr = ssh.exec_command("ss -tulpn | grep -E ':80\\s|:443\\s'")
    print("SERVICOS PORTA 80/443 (Proxmox):", stdout.read().decode().strip() or "NENHUM")
    
    stdin, stdout, stderr = ssh.exec_command("systemctl status nginx --no-pager")
    out = stdout.read().decode().strip()
    print("NGINX STATUS:", out[:200] if out else "Nao instalado/encontrado")
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
