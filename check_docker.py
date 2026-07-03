import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=10)
    print("[*] Conectado ao Proxmox (Jump Host)")
    
    cmd = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker ps -a\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    print("[*] DOCKER PS NA VM 200:")
    print(stdout.read().decode().strip())
    err = stderr.read().decode().strip()
    if err and "sudo: a password is required" not in err.lower():
        print("[*] STDERR:", err)

    ssh.close()
except Exception as e:
    print("Erro:", e)
