import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    cmd = ("ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
           "\"echo 'IB@Vschool123' | sudo -S docker logs coolify-proxy --tail 30\"")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    print("[*] TRAEFIK LOGS:")
    print(stdout.read().decode().strip())
    print(stderr.read().decode().strip())
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
