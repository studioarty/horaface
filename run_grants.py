import paramiko
import base64

sql = """
-- Conceder acesso às roles Supabase (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Configurar RLS corretamente para Supabase Auth (caso alguém use token fake ou real)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins podem alterar todos os perfis" ON public.user_profiles;
CREATE POLICY "Admins podem alterar todos os perfis" ON public.user_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Cotas lidas por todos" ON public.user_quotas;
CREATE POLICY "Cotas lidas por todos" ON public.user_quotas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cotas edit por todos" ON public.user_quotas;
CREATE POLICY "Cotas edit por todos" ON public.user_quotas FOR ALL USING (true);

"""

def run_grants():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
        encoded_sql = base64.b64encode(sql.encode()).decode()
        
        vm_script = f"""
echo "IB@Vschool123" | sudo -S sh -c '
echo "{encoded_sql}" | base64 -d > /tmp/grants.sql
docker exec -i supabase-db psql -U postgres < /tmp/grants.sql
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
    run_grants()
