import paramiko

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")
        cmd = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'cat /data/spa.conf'"
        _, stdout, _ = ssh.exec_command(cmd)
        print("SPA.CONF:\n", stdout.read().decode())
        ssh.close()
    except Exception as e:
        pass

if __name__ == "__main__":
    check()
