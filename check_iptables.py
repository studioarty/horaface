import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    cmd = ("ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
           "\"echo 'IB@Vschool123' | sudo -S iptables -n -L INPUT; "
           "echo '-------------'; "
           "sudo -S iptables -n -L DOCKER-USER; "
           "echo '-------------'; "
           "sudo -S iptables -n -t nat -L PREROUTING; "
           "echo '-------------'; "
           "ip a\"")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    print("IPTABLES & IP VM 200:\n\n" + out)
    ssh.close()
except Exception as e:
    print("Erro:", e)
