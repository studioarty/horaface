import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, User, Loader2, KeyRound, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/hooks/use-toast";

type Step = "login" | "register-email" | "register-otp" | "register-password";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuthStore();

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }
    setIsLoading(true);
    try {
      await auth.signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no login", description: err.message });
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Informe o e-mail" });
      return;
    }
    setIsLoading(true);
    try {
      await auth.sendOtp(email);
      toast({ title: "Código enviado!", description: `Verifique ${email}` });
      setStep("register-otp");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar código", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otp || !password || !username) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }
    setIsLoading(true);
    try {
      await auth.verifyOtpAndSetPassword(email, otp, password, username);
      navigate("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no registro", description: err.message });
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl" style={{ background: "var(--color-primary-dim)" }}>
            <ShieldCheck className="size-9 text-cyan-400" />
          </div>
          <h1
            className="mt-4 text-3xl font-bold text-cyan-400"
            style={{ fontFamily: "Rajdhani, sans-serif" }}
          >
            PontoFace
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-500">
            Painel Administrativo
          </p>
        </div>

        {/* Login Form */}
        {step === "login" && (
          <div className="hud-card rounded-xl p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Acesso do Administrador
              </h2>
              <p className="text-sm text-slate-400">Entre com suas credenciais</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
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
                  placeholder="Senha"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{ fontFamily: "Rajdhani, sans-serif" }}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              ENTRAR
            </button>

            <div className="text-center">
              <button
                onClick={() => setStep("register-email")}
                className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
              >
                Primeiro acesso? Criar conta de administrador
              </button>
            </div>
          </div>
        )}

        {/* Register - Email Step */}
        {step === "register-email" && (
          <div className="hud-card rounded-xl p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Criar Conta Admin
              </h2>
              <p className="text-sm text-slate-400">Enviaremos um código de verificação</p>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail do administrador"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{ fontFamily: "Rajdhani, sans-serif" }}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              ENVIAR CÓDIGO
            </button>

            <button
              onClick={() => setStep("login")}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        )}

        {/* Register - OTP + Password Step */}
        {step === "register-otp" && (
          <div className="hud-card rounded-xl p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Verificar e Configurar
              </h2>
              <p className="text-sm text-slate-400">Código enviado para {email}</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Código de 4 dígitos"
                  maxLength={4}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white text-center tracking-[0.5em] font-mono placeholder:text-slate-500 placeholder:tracking-normal focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome do administrador"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Criar senha (mín. 6 caracteres)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyAndRegister()}
                />
              </div>
            </div>

            <button
              onClick={handleVerifyAndRegister}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{ fontFamily: "Rajdhani, sans-serif" }}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              CRIAR CONTA E ENTRAR
            </button>

            <button
              onClick={() => setStep("register-email")}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Reenviar código
            </button>
          </div>
        )}

        <p className="text-center font-mono text-[10px] text-slate-600 uppercase tracking-wider">
          Sistema de Ponto Facial — Acesso Restrito
        </p>
      </div>
    </div>
  );
}
