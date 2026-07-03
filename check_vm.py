import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    print("[*] Conectado ao Proxmox.")
    stdin, stdout, stderr = ssh.exec_command('qm status 200')
    print("Status 200:", stdout.read().decode().strip())
    stdin, stdout, stderr = ssh.exec_command("ip neigh | grep 192.168.10.113")
    print("ARP Neigh:", stdout.read().decode().strip())
    ssh.close()
except Exception as e:
    print("Erro:", e)
