import paramiko
import os
import time

host = '147.93.37.32'
port = 65002
user = 'u407222665'
pw = 'IB@Vschool123'

print(f"[*] Conectando ao Hostinger SFTP ({host}:{port})...")

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port=port, username=user, password=pw, timeout=10)
    
    print("[+] SSH Conectado perfeitamente! Abrindo canal SFTP...")
    sftp = ssh.open_sftp()
    
    local_file = "DEPLOY_PONTOFACE.zip"
    remote_file = "domains/compositor.sbs/DEPLOY_PONTOFACE.zip"
    
    print(f"[*] Fazendo upload de {local_file} para {remote_file}...")
    sftp.put(local_file, remote_file)
    print("[+] Upload de FTP concluído!")
    
    sftp.close()
    
    print("[*] Extraindo os arquivos no servidor...")
    commands = """
    cd domains/compositor.sbs/public_html && \
    rm -rf * && \
    mv ../DEPLOY_PONTOFACE.zip . && \
    unzip -o DEPLOY_PONTOFACE.zip && \
    rm DEPLOY_PONTOFACE.zip
    """
    
    stdin, stdout, stderr = ssh.exec_command(commands)
    
    # Aguardar finalizar
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())
    
    ssh.close()
    print("[+] Deploy completo e finalizado com sucesso no Hostinger!!!")
    
except Exception as e:
    print(f"[X] Falha Crítica de Conexão: {e}")
