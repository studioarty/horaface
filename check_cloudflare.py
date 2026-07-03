import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    # 1. Check Cloudflared process on Proxmox
    stdin, stdout, stderr = ssh.exec_command("ps aux | grep cloudflared | grep -v grep")
    print("CLOUDFLARED [Proxmox]:", stdout.read().decode().strip() or "(Nao rodando)")
    
    # 2. Check iptables NAT
    stdin, stdout, stderr = ssh.exec_command("iptables -t nat -L PREROUTING -n -v | grep -E 'dpt:80|dpt:443'")
    print("IPTABLES NAT [Proxmox]:\n" + (stdout.read().decode().strip() or "(Nenhuma regra na porta 80/443)"))
    
    # 3. Check Cloudflared on VM 200
    stdin, stdout, stderr = ssh.exec_command(
        "ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
        "\"echo 'IB@Vschool123' | sudo -S ps aux | grep cloudflared | grep -v grep\""
    )
    print("\nCLOUDFLARED [VM 200]:", stdout.read().decode().strip() or "(Nao rodando)")
    
    ssh.close()
except Exception as e:
    print("Erro:", e)
