import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TEST MODE: Check for admin/admin credentials
      if (email === 'admin' && password === 'admin') {
        console.log('Using test credentials admin/admin');
        login({
          id: 'test-admin-id',
          email: 'admin@pontocloud.com',
          username: 'Administrador',
          role: 'admin',
          department: 'TI',
          avatar: null,
        });
        toast.success('Login de teste realizado!');
        navigate('/');
        return;
      }

      console.log('Attempting login for:', email);
      const user = await authService.signInWithPassword(email, password);
      
      // Fetch user profile
      const { supabase } = await import('@/lib/supabase');
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      login({
        id: user.id,
        email: user.email!,
        username: profile?.username || user.email!.split('@')[0],
        role: profile?.role || 'user',
        department: profile?.department,
        avatar: profile?.avatar,
      });

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erro ao fazer login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">PontoCloud</h1>
          </div>
          <p className="text-muted-foreground">Plataforma de Gestão Documental</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-border p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Entrar na Plataforma</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="seu@email.com ou admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium">MODO DE TESTE</p>
              <p className="text-xs text-amber-600 mt-1">
                Use <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin</span> para entrar
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-primary font-medium hover:underline"
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
