import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    # Check directly on mapping
    stdin, stdout, stderr = ssh.exec_command("curl -I -s http://192.168.10.113:8085")
    print("RESULTADO DIRETO NA PORTA 8085:")
    print(stdout.read().decode().strip() or "Falha/Timeout")
    
    # Check Traefik mapping if applicable
    stdin, stdout, stderr = ssh.exec_command("curl -I -s -H 'Host: cloud.ibavkiosk.com' http://192.168.10.113")
    print("\nRESULTADO TRAEFIK (cloud.ibavkiosk.com):")
    print(stdout.read().decode().strip() or "Falha/Timeout")
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
