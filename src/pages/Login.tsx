import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, User, Lock, Loader2, ArrowRight, Mail, Key } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // This useEffect handles redirection if already logged in or for kiosk mode
  useEffect(() => {
    if (auth.initialized && auth.user) {
      if (auth.user.role === 'kiosk') {
        navigate('/quiosque', { replace: true });
      } else {
        // Assuming admin or other roles go to '/'
        navigate('/', { replace: true });
      }
    }
  }, [auth.initialized, auth.user, navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }
    setIsLoading(true);
    try {
      await auth.signIn(username, password);
      localStorage.setItem('pwaMode', 'admin'); // Set pwaMode to 'admin' on successful login
      navigate("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no login", description: err.message });
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const res = await auth.setupRoot();
      if (res.error) throw new Error(res.error);
      toast({ title: "Sucesso!", description: res.message || "Conta admin/admin criada. Faça login." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Aviso", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Digite um e-mail válido para recuperação." });
      return;
    }
    setIsLoading(true);
    // Simulating email send API
    setTimeout(() => {
      toast({ title: "Enviado", description: "Se o e-mail existir na base, você receberá um link de redefinição de segurança em breve." });
      setIsRecovery(false);
      setRecoveryEmail("");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl" style={{ background: "var(--color-primary-dim)" }}>
            <ShieldCheck className="size-9 text-cyan-400" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-cyan-400" style={{ fontFamily: "Rajdhani, sans-serif" }}>HoraFace</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-500">Painel Administrativo - Medição PJ</p>
        </div>

        <div className="hud-card rounded-xl p-6 space-y-5 transition-all">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>
              {isRecovery ? "Recuperação de Acesso" : "Acesso de Segurança"}
            </h2>
            <p className="text-sm text-slate-400">
              {isRecovery ? "Enviaremos um link seguro para o seu e-mail" : "Entre com as credenciais do administrador local"}
            </p>
          </div>

          {!isRecovery ? (
            <>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Usuário (ex: admin)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha criptografada"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 transition-all font-bold"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                AUTENTICAR E ENTRAR
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSetup}
                  className="text-xs text-cyan-400/50 hover:text-cyan-400 transition-colors"
                >
                  Primeira Instalação?
                </button>
                <button
                  onClick={() => setIsRecovery(true)}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Esqueci minha senha
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Seu E-mail Administrativo"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleRecovery()}
                  />
                </div>
              </div>

              <button
                onClick={handleRecovery}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 transition-all"
                style={{ fontFamily: "Rajdhani, sans-serif" }}
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
                ENVIAR CÓDIGO DE RECUPERAÇÃO
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => setIsRecovery(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Voltar ao Login Principal
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-slate-600 uppercase tracking-wider">
          SQLite Local • Protegido por Bcrypt e JWT
        </p>
      </div>
    </div>
  );
}
