import paramiko
import base64
import sys

def install_supabase():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print("[*] Conectando ao Proxmox 192.168.10.100...")
        ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
        
        vm_script = """
echo "IB@Vschool123" | sudo -S sh -c '
# Instalar git e curl se não tiver
apt-get update && apt-get install -y git curl

# Baixar o repositório oficial do Supabase
if [ ! -d "/opt/supabase" ]; then
    git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
fi

cd /opt/supabase/docker
cp -n .env.example .env

# Vamos alterar as portas padrão se houver conflito, mas Supabase tem API na porta 8000
docker compose pull
echo "[*] Iniciando containers do Supabase na VM 113. Isso pode levar alguns minutos..."
docker compose up -d

# Mostrar as chaves geradas
echo "--- SUPABASE_KEYS ---"
grep "ANON_KEY=" .env
grep "SERVICE_ROLE_KEY=" .env
'
"""
        encoded_vm_script = base64.b64encode(vm_script.encode()).decode()
        
        pve_script = f"""
ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "echo '{encoded_vm_script}' | base64 -d | sh"
"""
        print("[*] Repassando script p/ VM 113 e iniciando deploy do Supabase...")
        stdin, stdout, stderr = ssh.exec_command(pve_script)
        
        for line in iter(lambda: stdout.readline(2048), ""):
            print(line, end="")
            sys.stdout.flush()
            
        err = stderr.read().decode('utf-8')
        if err:
            print("--- STDERR ---")
            print(err)
            
        print("[*] Processo de Instalação Finalizado.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    install_supabase()
