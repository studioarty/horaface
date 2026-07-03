import paramiko

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # Tunnel via proxmox is usually easy if we use proxmox as jump host
        # or we can just ssh into proxmox and run ssh there
        ssh.connect("192.168.10.100", username="root", password="IB@Vschool123")
        
        # Run command on VM 113 via ssh from proxmox
        cmd = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'ls -la /data/pontoface'"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        print("STDOUT:", stdout.read().decode())
        print("STDERR:", stderr.read().decode())
        
        # also check docker
        cmd2 = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 'docker ps'"
        stdin, stdout, stderr = ssh.exec_command(cmd2)
        print("DOCKER PS:", stdout.read().decode())

        ssh.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check()
