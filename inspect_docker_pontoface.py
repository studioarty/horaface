import paramiko

def run_investigation():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")
        
        cmd = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo docker inspect pontoface-web'"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        out = stdout.read().decode('utf-8')
        print(out)
                
        ssh.close()
    except Exception as e:
        print("Erro de conexao:", e)

if __name__ == "__main__":
    run_investigation()
