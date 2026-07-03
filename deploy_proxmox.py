import paramiko
import os
import sys
import time

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

frontend_tar = "frontend.tar"
backend_tar = "backend-lite.tar"

def deploy():
    print(f"[*] Conectando a {host} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        
        print("[*] Conectado. Iniciando envio dos arquivos (Isto pode levar 1-2 minutos)...")
        sftp = ssh.open_sftp()
        
        # Upload
        print(f"  - Enviando {frontend_tar}...")
        sftp.put(frontend_tar, f"/tmp/{frontend_tar}")
        
        sftp.close()
        
        print("[*] Arquivos enviados com sucesso! Aplicando na VM 102...")
        
        command = """
        pct push 102 /tmp/frontend.tar /tmp/frontend.tar && \
        pct exec 102 -- bash -c 'rm -rf /var/www/pontoface/* && tar -xf /tmp/frontend.tar -C /var/www/pontoface/'
        """
        
        stdin, stdout, stderr = ssh.exec_command(command)
        
        # Read build output
        exit_status = stdout.channel.recv_exit_status()
        
        for line in stdout.read().splitlines():
            print(f"  > {line.decode('utf-8')}")
            
        for line in stderr.read().splitlines():
            print(f"  > [ERRO] {line.decode('utf-8')}")
            
        if exit_status == 0:
            print(f"\n[*] SUCESSO: PontoFace (Frontend) atualizado na VM 102.")
        else:
            print(f"\n[!] AVISO: O comando retornou código {exit_status}.")
            
        ssh.close()
        
    except Exception as e:
        print(f"\n[X] Falha na conexão ou envio: {str(e)}")

if __name__ == "__main__":
    deploy()
