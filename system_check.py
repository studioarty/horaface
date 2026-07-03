import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
# Check running containers
cmd = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker ps -a | grep pontoface\""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("CONTAINERS:\\n", stdout.read().decode())
# Check traefik logs for errors
cmd_logs = "ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S docker logs --tail 20 coolify-proxy\""
stdin, stdout, stderr = ssh.exec_command(cmd_logs)
print("TRAEFIK LOGS:\\n", stdout.read().decode())
