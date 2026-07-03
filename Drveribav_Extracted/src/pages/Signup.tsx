import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Mail, Lock, User, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Sending OTP to:', email);
      await authService.sendOtp(email);
      toast.success('Código OTP enviado! Verifique seu e-mail.');
      setStep('otp');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast.error(error.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Verifying OTP and creating account');
      const user = await authService.verifyOtpAndSetPassword(email, otp, password, username);
      
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
        username: profile?.username || username,
        role: profile?.role || 'user',
        department: profile?.department,
        avatar: profile?.avatar,
      });

      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Erro ao criar conta');
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

        {/* Signup Form */}
        <div className="bg-white rounded-xl shadow-lg border border-border p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Criar Conta</h2>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome de Usuário
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="seu_usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mínimo de 6 caracteres</p>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Código OTP'}
                <Send className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Um código de verificação foi enviado para <strong>{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Código OTP
                </label>
                <Input
                  type="text"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={4}
                  required
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Criar Conta'}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Voltar
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-medium hover:underline"
              >
                Fazer login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
