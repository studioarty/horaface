import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")

script = """
ssh -o StrictHostKeyChecking=no -i /root/.ssh/id_ed25519 ibav@192.168.10.113 "echo 'IB@Vschool123' | sudo -S sh -c 'docker ps -a | grep pontocloud; docker logs --tail 50 pontocloud_frontend'"
"""

stdin, stdout, stderr = ssh.exec_command(script)
print(stdout.read().decode())
print("ERR:", stderr.read().decode())
ssh.close()
