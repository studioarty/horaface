import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    # 1. Check UFW
    stdin, stdout, stderr = ssh.exec_command(
        "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
        "\"echo 'IB@Vschool123' | sudo -S ufw status\""
    )
    print("UFW STATUS:")
    print(stdout.read().decode().strip())
    
    # 2. Curl test inside VM
    stdin, stdout, stderr = ssh.exec_command(
        "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
        "\"curl -I http://localhost\""
    )
    print("\nCURL LOCALHOST:")
    print(stdout.read().decode().strip())
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
