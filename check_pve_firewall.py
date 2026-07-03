import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    stdin, stdout, stderr = ssh.exec_command("qm config 200 | grep net0")
    config = stdout.read().decode().strip()
    print("VM 200 NET0:", config)
    
    if "firewall=1" in config:
        print("\n[!] FIREWALL DETECTADO! Desativando firewall na net0 da VM 200...")
        new_config = config.replace("firewall=1", "firewall=0")
        if new_config.startswith("net0: "):
            val = new_config.split("net0: ")[1]
            ssh.exec_command(f"qm set 200 -net0 {val}")
            print("  -> Firewall da VM 200 desativado.")
        else:
            print("  -> N" + "ao foi possivel parsear a config")
    else:
        print("\n[*] Firewall nao esta ativo no net0.")
        
    ssh.close()
except Exception as e:
    print("Erro:", e)
