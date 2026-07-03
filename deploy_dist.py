import paramiko
import sys

host = "192.168.10.100"
username = "root"
password = "IB@Vschool123"

def deploy():
    print(f"[*] Conectando a {host} via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(hostname=host, username=username, password=password, timeout=10)
        sftp = ssh.open_sftp()
        
        print("[*] Uploading dist.tar.gz to Proxmox Host (/tmp/dist.tar.gz)...")
        sftp.put("dist.tar.gz", "/tmp/dist.tar.gz")
        sftp.close()
        
        print("[*] Copying dist.tar.gz to VM 113...")
        cmd_scp = "scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/dist.tar.gz ibav@192.168.10.113:/tmp/dist.tar.gz"
        ssh.exec_command(cmd_scp)[1].channel.recv_exit_status()
        
        print("[*] Extracting dist.tar.gz on VM 113 and removing old files...")
        cmd_ssh = "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S sh -c 'rm -rf /data/pontoface/*; tar -xzf /tmp/dist.tar.gz -C /tmp/; mv /tmp/dist/* /data/pontoface/; rm -rf /tmp/dist /tmp/dist.tar.gz'\""
        stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
        exit_status = stdout.channel.recv_exit_status()
        
        for line in stdout.read().splitlines():
            print(f"  > {line.decode('utf-8')}")
        for line in stderr.read().splitlines():
            print(f"  > [ERRO] {line.decode('utf-8')}")
            
        print(f"[*] SUCESSO. Code: {exit_status}")
        ssh.close()
        
    except Exception as e:
        print(f"[X] Excecao: {e}")

if __name__ == "__main__":
    deploy()
