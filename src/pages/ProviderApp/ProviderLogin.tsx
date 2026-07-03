import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Lock, User, Download, Camera, CameraOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';
import { useProviderStore } from '@/stores/useProviderStore';
import { useWebcam } from '@/hooks/useWebcam';
import ScanOverlay from '@/components/features/ScanOverlay';
import { loadModels, detectFace, drawDetection, matchFace } from '@/lib/faceApi';

export default function ProviderLogin() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const login = useProviderAuthStore((s) => s.login);
  const loginWithFace = useProviderAuthStore((s) => s.loginWithFace);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Facial Recognition States
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const { videoRef, isActive, isLoading: camLoading, error: camError, start, stop } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providerStore = useProviderStore();
  
  const [modelsReady, setModelsReady] = useState(false);
  const [modelStatus, setModelStatus] = useState('Iniciando...');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'detected' | 'matched' | 'error'>('idle');
  const [matchedProvider, setMatchedProvider] = useState<{ id: string; name: string; distance: number; } | null>(null);

  useEffect(() => {
    localStorage.setItem('pwaMode', 'provider');
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  // Auto-redirect se já estiver logado
  useEffect(() => {
    const session = localStorage.getItem('providerUserSession');
    if (session) {
      navigate('/parceiro');
    }
  }, [navigate]);

  useEffect(() => {
    if (!showFaceLogin) return;
    let cancelled = false;
    (async () => {
      try {
        await loadModels((stage) => {
          if (!cancelled) setModelStatus(stage);
        });
        if (!cancelled) {
          setModelsReady(true);
          await start();
        }
      } catch (err) {
        if (!cancelled) setModelStatus('Erro ao carregar modelos');
      }
    })();
    return () => { 
      cancelled = true; 
      stop(); 
    };
  }, [showFaceLogin]);

  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelsReady || !isActive) return;
    try {
      const result = await detectFace(videoRef.current);
      if (result) {
        const knownFaces = providerStore.getKnownFaces();
        const match = matchFace(result.descriptor, knownFaces);
        if (canvasRef.current && videoRef.current) {
          drawDetection(canvasRef.current, videoRef.current, result, !!match);
        }
        if (match) {
          setMatchedProvider(match);
          setScanStatus('matched');
          
          // Auto-login upon recognized face
          const provider = providerStore.getProvider(match.id);
          if (provider && !loading) {
            setLoading(true); // Lock to prevent multiple calls
            stop();
            toast({ title: "Bia! Reconhecimento Exato.", description: `Bem-vindo de volta, ${provider.name}` });
            await loginWithFace(provider.id, provider.name, provider.hourlyRate);
            navigate('/parceiro');
          }
        } else {
          setMatchedProvider(null);
          setScanStatus('detected');
        }
      } else {
        setMatchedProvider(null);
        setScanStatus('scanning');
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) { }
  }, [modelsReady, isActive, videoRef, providerStore, loginWithFace, navigate, stop, loading, toast]);

  useEffect(() => {
    if (!modelsReady || !isActive || !showFaceLogin) return;
    let isRunning = true;
    const loop = async () => {
      if (!isRunning) return;
      await runDetection();
      if (isRunning) intervalRef.current = setTimeout(loop, 700);
    };
    loop();
    return () => {
      isRunning = false;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [modelsReady, isActive, showFaceLogin, runDetection]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pin) {
      toast({ variant: 'destructive', title: 'Preencha Nome e PIN' });
      return;
    }
    setLoading(true);
    const res = await login(name, pin);
    setLoading(false);
    
    if (res.success) {
      navigate('/parceiro');
    } else {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: res.error });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4" style={{ background: 'var(--color-bg-base)' }}>
      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-emerald-500/10 mb-6 relative overflow-hidden ring-1 ring-emerald-500/30">
            <div className="absolute inset-x-0 -bottom-2 h-10 bg-emerald-500/20 blur-xl" />
            <ScanFace className="size-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-text-primary">
            Portal do Parceiro
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Acompanhe seu histórico e medições do mês.
          </p>
        </div>

        {showFaceLogin ? (
           <div className="space-y-4 hud-card p-6 rounded-2xl border-emerald-900/40 animate-in fade-in zoom-in-95">
             <div className="relative aspect-[4/3] bg-black overflow-hidden rounded-lg">
                <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />
                <canvas ref={canvasRef} className="absolute inset-0 size-full" />
                <ScanOverlay
                  status={!isActive ? 'idle' : scanStatus}
                  label={!modelsReady ? modelStatus : matchedProvider ? `Identificado: ${matchedProvider.name}` : undefined}
                />
                
                {camError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95">
                    <CameraOff className="size-12 text-red-500" />
                    <p className="font-mono text-sm text-red-400 text-center max-w-sm px-4">{camError}</p>
                    <Button onClick={() => start()} className="gap-2 bg-slate-800"><Camera className="size-4" />Tentar novamente</Button>
                  </div>
                )}
                
                {!isActive && !camError && (camLoading || !modelsReady) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90">
                    <Loader2 className="size-10 animate-spin text-emerald-500" />
                    <p className="font-mono text-sm text-emerald-300">{camLoading ? 'Acessando câmera...' : modelStatus}</p>
                  </div>
                )}
             </div>
             
             <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-bold border-border bg-transparent text-emerald-400 hover:bg-emerald-900/20"
                onClick={() => {
                  stop();
                  setShowFaceLogin(false);
                }}
             >
                Voltar para Login Manual
             </Button>
           </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6 hud-card p-6 rounded-2xl border-emerald-900/40 animate-in fade-in zoom-in-95">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <User className="size-4" /> Nome (Completo ou Primeiro Nome)
                </label>
                <Input
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 border-emerald-900/50 bg-slate-950 text-slate-200 focus-visible:ring-emerald-500 font-mono text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Lock className="size-4" /> PIN (Senha Numérica)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="h-12 border-emerald-900/50 bg-slate-950 text-emerald-400 font-bold focus-visible:ring-emerald-500 text-center tracking-widest text-2xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={loading}
            >
              {loading ? 'Validando...' : 'Acessar com PIN'}
            </Button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-slate-500">Ou</span></div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-bold border-emerald-900/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/40 flex gap-2 items-center justify-center"
              onClick={() => setShowFaceLogin(true)}
              disabled={loading}
            >
               <ScanFace className="size-5" />
               Entrar com Biometria Facial
            </Button>
          </form>
        )}
      </div>
      
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {deferredPrompt && (
        <div className="fixed bottom-6 inset-x-4 z-50 animate-in slide-in-from-bottom-5">
          <Button
            onClick={handleInstallClick}
            className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] rounded-2xl flex items-center justify-center gap-2 font-bold text-base"
          >
            <Download className="size-5" />
            Instalar Aplicativo Oficial
          </Button>
        </div>
      )}
    </div>
  );
}
