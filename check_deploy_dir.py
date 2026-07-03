import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    cmd = ("ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
           "\"sudo -S ls -la /data/pontoface\"")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    print("[*] LS /data/pontoface na VM 200:")
    print(stdout.read().decode().strip() or "Diretório Vazio ou Inexistente")
    print(stderr.read().decode().strip())
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
