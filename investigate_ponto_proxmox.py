import paramiko

def run_investigation():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")
        
        commands = [
            "echo '--- Servicos e portas escutando ---'",
            "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo ss -tuln'",
            "echo '--- Containers Docker Ativos ---'",
            "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo docker ps'",
            "echo '--- Processos Nginx ---'",
            "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo systemctl status nginx --no-pager'",
            "echo '--- Arquivos do PontoFace ---'",
            "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'ls -la /data/pontoface/ | head -n 5'",
            "echo '--- Logs do sistema ---'",
            "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'sudo tail -n 20 /var/log/syslog'"
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8', errors='ignore')
            err = stderr.read().decode('utf-8', errors='ignore')
            if out:
                print(out)
            if err and "Warning: Permanently added" not in err:
                print(f"Erro: {err}")
                
        ssh.close()
    except Exception as e:
        print("Erro de conexao:", e)

if __name__ == "__main__":
    run_investigation()
