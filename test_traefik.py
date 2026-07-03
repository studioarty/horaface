import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    stdin, stdout, stderr = ssh.exec_command("curl -I -H 'Host: ibavkiosk.com' http://192.168.10.113")
    print("HTTP RESULT [HTTP]:")
    print(stdout.read().decode().strip())
    
    stdin, stdout, stderr = ssh.exec_command("curl -I -k -H 'Host: ibavkiosk.com' https://192.168.10.113")
    print("\nHTTP RESULT [HTTPS]:")
    print(stdout.read().decode().strip())
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
