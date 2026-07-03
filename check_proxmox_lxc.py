import paramiko

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        print("[*] Conectado ao Proxmox.")
        stdin, stdout, stderr = ssh.exec_command("pct list")
        output = stdout.read().decode('utf-8')
        print(output)
        
        # also check for VMs
        stdin, stdout, stderr = ssh.exec_command("qm list")
        output = stdout.read().decode('utf-8')
        print(output)
        
        ssh.close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check()
