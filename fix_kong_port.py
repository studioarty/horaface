import paramiko
import base64
import sys

def fix_port():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
        
        vm_script = """
echo "IB@Vschool123" | sudo -S sh -c '
cd /opt/supabase/docker

# Mudar portas do KONG
sed -i "s/KONG_HTTP_PORT=8000/KONG_HTTP_PORT=8001/g" .env
sed -i "s/KONG_HTTPS_PORT=8443/KONG_HTTPS_PORT=8444/g" .env

# Reiniciar o supabase-kong
docker compose up -d
'
"""
        encoded_vm_script = base64.b64encode(vm_script.encode()).decode()
        
        pve_script = f"""
ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "echo '{encoded_vm_script}' | base64 -d | sh"
"""
        stdin, stdout, stderr = ssh.exec_command(pve_script)
        
        out = stdout.read().decode('utf-8')
        print(out)
        err = stderr.read().decode('utf-8')
        if err:
            print("--- STDERR ---")
            print(err)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    fix_port()
