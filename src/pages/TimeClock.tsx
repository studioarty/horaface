import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Timer,
  User,
  Camera,
  CameraOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWebcam } from '@/hooks/useWebcam';
import { useProviderStore } from '@/stores/useProviderStore';
import { useTimeStore } from '@/stores/useTimeStore';
import {
  loadModels,
  detectFace,
  drawDetection,
  matchFace,
} from '@/lib/faceApi';
import { DETECTION_INTERVAL_MS, MIN_EXIT_MINUTES } from '@/constants/config';
import { useShiftStore } from '@/stores/useShiftStore';
import ScanOverlay from '@/components/features/ScanOverlay';
import { useNavigate } from 'react-router-dom';

export default function TimeClock() {
  const { videoRef, isActive, isLoading, error: camError, start, stop } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const store = useProviderStore();
  const timeStore = useTimeStore();
  const shiftStore = useShiftStore();

  const [modelsReady, setModelsReady] = useState(false);
  const [modelStatus, setModelStatus] = useState('Iniciando...');
  const [matchedProvider, setMatchedProvider] = useState<{
    id: string;
    name: string;
    distance: number;
  } | null>(null);
  const [scanStatus, setScanStatus] = useState<
    'idle' | 'scanning' | 'detected' | 'matched' | 'error'
  >('idle');
  const [processing, setProcessing] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
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
        console.error('Erro ao carregar modelos:', err);
        if (!cancelled) setModelStatus('Erro ao carregar modelos');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelsReady || !isActive) return;
    try {
      const result = await detectFace(videoRef.current);
      if (result) {
        const knownFaces = store.getKnownFaces();
        const match = matchFace(result.descriptor, knownFaces);
        if (canvasRef.current && videoRef.current) {
          drawDetection(canvasRef.current, videoRef.current, result, !!match);
        }
        if (match) {
          setMatchedProvider(match);
          setScanStatus('matched');
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
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [modelsReady, isActive, videoRef, store]);

  useEffect(() => {
    if (!modelsReady || !isActive) return;
    const loop = () => {
      runDetection();
      intervalRef.current = setTimeout(loop, DETECTION_INTERVAL_MS);
    };
    loop();
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [modelsReady, isActive, runDetection]);

  useEffect(() => {
    if (!matchedProvider) return;
    const activeRec = timeStore.getActiveRecord(matchedProvider.id);
    if (!activeRec) { setRemainingTime(0); return; }
    const update = () => {
      const check = timeStore.canCheckOut(activeRec.id);
      setRemainingTime(check.remainingMinutes);
    };
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, [matchedProvider, timeStore]);

  const handleCheckIn = async () => {
    if (!matchedProvider) return;
    setProcessing(true);
    const existing = timeStore.getActiveRecord(matchedProvider.id);
    if (existing) {
      toast({ variant: 'destructive', title: 'Já registrado', description: `${matchedProvider.name} já possui entrada ativa.` });
      setProcessing(false);
      return;
    }
    try {
      await timeStore.addCheckIn(matchedProvider.id);
      toast({ title: 'Entrada registrada!', description: `${matchedProvider.name} — ${new Date().toLocaleTimeString('pt-BR')}` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar entrada.' });
    }
    setProcessing(false);
  };

  const handleCheckOut = async () => {
    if (!matchedProvider) return;
    setProcessing(true);
    const activeRec = timeStore.getActiveRecord(matchedProvider.id);
    if (!activeRec) {
      toast({ variant: 'destructive', title: 'Sem registro ativo', description: `${matchedProvider.name} não possui entrada ativa.` });
      setProcessing(false);
      return;
    }
    try {
      const result = await timeStore.addCheckOut(activeRec.id);
      if (result.success) {
        toast({ title: 'Saída registrada!', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Saída bloqueada', description: result.message });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar saída.' });
    }
    setProcessing(false);
  };

  const activeRecord = matchedProvider ? timeStore.getActiveRecord(matchedProvider.id) : null;
  const provider = matchedProvider ? store.getProvider(matchedProvider.id) : null;
  const providerShiftIds = provider?.shiftIds && provider.shiftIds.length > 0 ? provider.shiftIds : provider?.shiftId ? [provider.shiftId] : [];
  const providerShifts = providerShiftIds.map((id) => shiftStore.getShift(id)).filter(Boolean);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">Ponto Eletrônico</h1>
          <p className="text-xs sm:text-sm text-text-secondary">Reconhecimento facial em tempo real via webcam</p>
        </div>
        <button
          onClick={() => navigate('/quiosque')}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors self-start sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          Modo Quiosque
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="hud-card relative overflow-hidden rounded-lg">
            <div className="relative aspect-[4/3] bg-black">
              <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />
              <canvas ref={canvasRef} className="absolute inset-0 size-full" />
              <ScanOverlay
                status={!isActive ? 'idle' : scanStatus}
                label={!modelsReady ? modelStatus : matchedProvider ? `Identificado: ${matchedProvider.name}` : undefined}
              />
              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95">
                  <CameraOff className="size-12 text-error" />
                  <p className="font-mono text-sm text-error text-center max-w-sm px-4">{camError}</p>
                  <Button onClick={() => start()} className="gap-2"><Camera className="size-4" />Tentar novamente</Button>
                </div>
              )}
              {!isActive && !camError && (isLoading || !modelsReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90">
                  <Loader2 className="size-10 animate-spin text-primary" />
                  <p className="font-mono text-sm text-text-secondary">{isLoading ? 'Acessando câmera...' : modelStatus}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-border p-3 sm:p-4">
              <Button onClick={handleCheckIn} disabled={!matchedProvider || processing || !!activeRecord} className="flex-1 gap-2 bg-success text-white hover:bg-success/90" size="lg">
                <LogIn className="size-4" /><span className="hidden sm:inline">Registrar</span> Entrada
              </Button>
              <Button onClick={handleCheckOut} disabled={!matchedProvider || processing || !activeRecord || remainingTime > 0} className="flex-1 gap-2 bg-error text-white hover:bg-error/90" size="lg">
                <LogOut className="size-4" /><span className="hidden sm:inline">Registrar</span> Saída
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="hud-card rounded-lg p-4 sm:p-5">
            <h3 className="mb-3 font-heading text-sm font-semibold uppercase text-text-muted">Status do Sistema</h3>
            <div className="space-y-2.5">
              <StatusItem label="Câmera" active={isActive} activeText="Ativa" inactiveText={camError ? 'Erro' : 'Inativa'} />
              <StatusItem label="Modelos IA" active={modelsReady} activeText="Carregados" inactiveText="Carregando..." />
              <StatusItem label="Detecção" active={scanStatus !== 'idle' && scanStatus !== 'scanning'} activeText="Rosto detectado" inactiveText="Aguardando" />
              <StatusItem label="Identificação" active={!!matchedProvider} activeText="Confirmada" inactiveText="Aguardando" />
            </div>
          </div>

          {matchedProvider && provider ? (
            <div className="hud-card animate-fade-up rounded-lg p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-5 text-success" />
                <h3 className="font-heading text-sm font-semibold uppercase text-success">Prestador Identificado</h3>
              </div>
              <div className="flex items-center gap-3">
                {provider.photo ? (
                  <img src={provider.photo} alt={provider.name} className="size-14 rounded-lg border border-success/30 object-cover" />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-lg bg-elevated"><User className="size-6 text-text-muted" /></div>
                )}
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold text-text-primary truncate">{provider.name}</p>
                  <p className="text-xs text-text-secondary">{provider.role}</p>
                  {providerShifts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {providerShifts.map((s) => s && (<span key={s.id} className="text-xs font-medium" style={{ color: s.color }}>{s.name}</span>))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-elevated/50 p-2.5">
                <p className="font-mono text-xs text-text-muted">
                  Confiança: <span className="text-success">{((1 - matchedProvider.distance) * 100).toFixed(1)}%</span>
                </p>
              </div>
              {activeRecord && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">● Turno em andamento</p>
                  <p className="mt-1 font-mono text-xs text-text-secondary">Entrada: {new Date(activeRecord.checkIn).toLocaleTimeString('pt-BR')}</p>
                  {remainingTime > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Timer className="size-3 text-warning" />
                      <p className="font-mono text-xs text-warning">Saída liberada em {remainingTime} min</p>
                    </div>
                  )}
                  {remainingTime === 0 && <p className="mt-1 font-mono text-xs text-success">✓ Saída liberada</p>}
                </div>
              )}
            </div>
          ) : scanStatus === 'detected' ? (
            <div className="hud-card animate-fade-up rounded-lg p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-warning" />
                <h3 className="font-heading text-sm font-semibold text-warning">Rosto Não Reconhecido</h3>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                A face detectada não corresponde a nenhum prestador cadastrado. Cadastre na seção &quot;Prestadores&quot;.
              </p>
            </div>
          ) : null}

          <div className="hud-card rounded-lg p-4 sm:p-5">
            <h3 className="mb-2 font-heading text-sm font-semibold uppercase text-text-muted">Instruções</h3>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex gap-2"><span className="text-primary">01</span>Posicione o rosto na câmera</li>
              <li className="flex gap-2"><span className="text-primary">02</span>Aguarde a identificação automática</li>
              <li className="flex gap-2"><span className="text-primary">03</span>Clique em Entrada ou Saída</li>
              <li className="flex gap-2"><span className="text-primary">04</span>Saída somente após {MIN_EXIT_MINUTES} minutos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, active, activeText, inactiveText }: { label: string; active: boolean; activeText: string; inactiveText: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono text-xs ${active ? 'text-success' : 'text-text-muted'}`}>
        <span className={`size-1.5 rounded-full ${active ? 'bg-success' : 'bg-text-muted'}`} />
        {active ? activeText : inactiveText}
      </span>
    </div>
  );
}
