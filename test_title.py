import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    stdin, stdout, stderr = ssh.exec_command("curl -s -H 'Host: ibavkiosk.com' http://192.168.10.113 | grep -i '<title>'")
    print("TITLE ATUAL:", stdout.read().decode().strip())
    ssh.close()
except Exception as e:
    print("Erro:", e)
