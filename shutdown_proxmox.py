import paramiko

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def shutdown():
    print(f"[*] Conectando a {host} via SSH para enviar comando de desligamento...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        print("[*] Enviando sinal de Desligamento Seguro (ACPI Shutdown) para o Proxmox...")
        
        # O comando poweroff fara o proxmox iniciar o powerdown de todas as VMs seguras
        stdin, stdout, stderr = ssh.exec_command("poweroff")
        
        print("[*] Comando 'poweroff' enviado! O servidor físico será desligado em instantes.")
        ssh.close()
        
    except Exception as e:
        print(f"\n[X] Falha na conexão ou servidor já está offline: {str(e)}")

if __name__ == "__main__":
    shutdown()
