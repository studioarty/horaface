import paramiko
import base64
import sys

sql = """
-- 1. Garante que a tabela user_profiles existe com os campos corretos
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  username text NOT NULL,
  role text DEFAULT 'user',
  department text,
  avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de cotas (visto no useUsers.ts)
CREATE TABLE IF NOT EXISTS public.user_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  quota_limit bigint DEFAULT 10737418240, -- 10GB padrão
  used_bytes bigint DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.user_profiles FOR SELECT
USING ( true ); -- Vamos deixar todos lerem para simplificar a UI local

DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.user_profiles;
CREATE POLICY "Admins podem alterar todos os perfis"
ON public.user_profiles FOR ALL
USING ( true ); 

DROP POLICY IF EXISTS "Cotas lidas por todos" ON public.user_quotas;
CREATE POLICY "Cotas lidas por todos" ON public.user_quotas FOR ALL USING (true);


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, role, department)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    new.raw_user_meta_data->>'department'
  );
  
  INSERT INTO public.user_quotas (user_id) VALUES (new.id);
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

"""

def run_schema():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.10.100', username='root', password='IB@Vschool123')
        
        encoded_sql = base64.b64encode(sql.encode()).decode()
        
        vm_script = f"""
echo "IB@Vschool123" | sudo -S sh -c '
echo "{encoded_sql}" | base64 -d > /tmp/schema.sql
docker exec -i supabase-db psql -U postgres < /tmp/schema.sql
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
    run_schema()
