import paramiko
import base64

def check_keys():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
        
        vm_script = """
echo "IB@Vschool123" | sudo -S cat /opt/supabase/docker/.env | grep "_KEY="
echo "--- PS ---"
echo "IB@Vschool123" | sudo -S docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
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
    check_keys()
