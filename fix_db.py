import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
cmd = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker exec pontoface_backend npx prisma db push --force-reset --accept-data-loss && echo 'IB@Vschool123' | sudo -S docker exec pontoface_backend node setup-admins-db.mjs\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
