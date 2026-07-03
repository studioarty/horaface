import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")

stdin, stdout, stderr = ssh.exec_command("ssh -o StrictHostKeyChecking=no ibav@192.168.10.113 \"docker ps -a; ps aux | grep docker\"")
print(stdout.read().decode())
print("ERR:", stderr.read().decode())
ssh.close()
