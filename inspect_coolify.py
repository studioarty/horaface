import paramiko

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        cmd_ssh = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S sh -c 'docker inspect coolify-proxy | grep -i entrypoint'\""
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        print("STDOUT:")
        for line in stdout.read().splitlines(): print("  ", line.decode('utf-8'))
        ssh.close()
    except Exception as e: print(e)

if __name__ == "__main__": deploy()
