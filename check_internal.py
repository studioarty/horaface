import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname='192.168.10.100', username='root', password='IB@Vschool123')
cmd = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker exec pontoface_frontend curl -s -I http://localhost\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("FRONTEND:\\n", stdout.read().decode())
cmd2 = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker exec pontoface_backend curl -s -I http://localhost:3005/api/\""
stdin, stdout, stderr = ssh.exec_command(cmd2)
print("BACKEND:\\n", stdout.read().decode())
