import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  Loader2,
  Timer,
  Minimize2,
  Maximize2,
  ShieldCheck,
  Camera,
  CameraOff,
  WifiOff,
  Server,
} from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import {
  fetchProviders,
  fetchShifts,
  fetchActiveRecord,
  insertCheckIn,
  insertCheckOut,
  fetchKioskSettings,
  fetchKioskMonitor,
  updateKioskMonitorDB,
  registerKiosk,
  uploadSnapshot,
} from '@/lib/api';
import {
  loadModels,
  detectFace,
  drawDetection,
  matchFace,
  capturePhoto,
} from '@/lib/faceApi';
import { DETECTION_INTERVAL_MS, MIN_EXIT_MINUTES } from '@/constants/config';
import type { Provider, Shift, TimeRecord } from '@/types';
import type { KioskSettings } from '@/lib/api';
import KioskScreenSaver from '@/components/features/KioskScreenSaver';
import { useSearchParams } from 'react-router-dom';

type ScanStatus = 'idle' | 'scanning' | 'detected' | 'matched' | 'error';

interface MatchedProvider {
  id: string;
  name: string;
  distance: number;
}

function useKioskId() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || 'default';
  const name = searchParams.get('name') || '';
  const location = searchParams.get('location') || '';
  return { id, defaultName: name, defaultLocation: location };
}

export default function Kiosk() {
  const { id: kioskId, defaultName, defaultLocation } = useKioskId();
  const { videoRef, isActive, isLoading, error: camError, start, stop } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monitorPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hidden video element for background monitoring when in screensaver
  const monitorVideoRef = useRef<HTMLVideoElement | null>(null);
  const monitorStreamRef = useRef<MediaStream | null>(null);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>({
    images: [],
    idleTimeoutSec: 30,
    slideIntervalSec: 8,
    showClock: true,
    message: 'Toque na tela para registrar seu ponto',
  });
  const [monitorCameraActive, setMonitorCameraActive] = useState(false);

  const [modelsReady, setModelsReady] = useState(false);
  const [modelStatus, setModelStatus] = useState('Iniciando...');
  const [matchedProvider, setMatchedProvider] = useState<MatchedProvider | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [processing, setProcessing] = useState(false);
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isIdle, setIsIdle] = useState(true);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [panelConnected, setPanelConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<{ type: 'in' | 'out'; name: string; time: string } | null>(null);

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Register this kiosk on mount
  useEffect(() => {
    const name = defaultName || `Quiosque ${kioskId}`;
    const location = defaultLocation || '';
    console.log(`Kiosk: registrando como "${name}" (id: ${kioskId})`);
    registerKiosk(kioskId, name, location)
      .then(() => setPanelConnected(true))
      .catch((err) => {
        console.error('Kiosk: erro ao registrar:', err);
        setPanelConnected(false);
      });
  }, [kioskId, defaultName, defaultLocation]);

  // Load data from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [provs, shs, settings] = await Promise.all([
          fetchProviders(),
          fetchShifts(),
          fetchKioskSettings(),
        ]);
        if (!cancelled) {
          setProviders(provs);
          setShifts(shs);
          setKioskSettings(settings);
          setDataLoaded(true);
          setPanelConnected(true);
          console.log('Kiosk: dados carregados — prestadores:', provs.length, 'turnos:', shs.length);
        }
      } catch (err) {
        console.error('Kiosk: erro ao carregar dados:', err);
        if (!cancelled) {
          setDataLoaded(true);
          setPanelConnected(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Refresh providers/shifts periodically
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [provs, shs] = await Promise.all([fetchProviders(), fetchShifts()]);
        setProviders(provs);
        setShifts(shs);
        setPanelConnected(true);
      } catch {
        setPanelConnected(false);
      }
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // Heartbeat — tell admin we're online (using kioskId)
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await updateKioskMonitorDB(kioskId, {
          kiosk_online: true,
          last_heartbeat: new Date().toISOString(),
        });
        setPanelConnected(true);
      } catch {
        setPanelConnected(false);
      }
    };
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      updateKioskMonitorDB(kioskId, { kiosk_online: false }).catch(() => {});
    };
  }, [kioskId]);

  // Poll admin commands (camera toggle)
  useEffect(() => {
    const poll = async () => {
      try {
        const monitor = await fetchKioskMonitor(kioskId);
        setMonitorCameraActive(monitor.cameraActive);
      } catch {}
    };
    poll();
    monitorPollRef.current = setInterval(poll, 3000);
    return () => {
      if (monitorPollRef.current) clearInterval(monitorPollRef.current);
    };
  }, [kioskId]);

  // ===== BACKGROUND MONITOR CAMERA =====
  // When admin activates camera monitoring, start a separate hidden camera stream
  // that works even when the kiosk is in screensaver mode
  const startMonitorStream = useCallback(async () => {
    // If main camera is active, don't need a separate stream
    if (isActive && videoRef.current && videoRef.current.videoWidth > 0) {
      return;
    }

    // If we already have a monitor stream, skip
    if (monitorStreamRef.current) {
      const tracks = monitorStreamRef.current.getTracks();
      if (tracks.length > 0 && tracks.every(t => t.readyState === 'live')) {
        return;
      }
    }

    try {
      console.log('Kiosk: iniciando stream de monitoramento em background...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      monitorStreamRef.current = stream;

      // Create or reuse hidden video element
      if (!monitorVideoRef.current) {
        monitorVideoRef.current = document.createElement('video');
        monitorVideoRef.current.muted = true;
        monitorVideoRef.current.playsInline = true;
        monitorVideoRef.current.style.position = 'absolute';
        monitorVideoRef.current.style.width = '1px';
        monitorVideoRef.current.style.height = '1px';
        monitorVideoRef.current.style.opacity = '0';
        monitorVideoRef.current.style.pointerEvents = 'none';
        document.body.appendChild(monitorVideoRef.current);
      }

      monitorVideoRef.current.srcObject = stream;
      await new Promise<void>((resolve) => {
        const vid = monitorVideoRef.current!;
        if (vid.readyState >= 1) { resolve(); return; }
        vid.addEventListener('loadedmetadata', () => resolve(), { once: true });
      });
      await monitorVideoRef.current.play();
      console.log('Kiosk: monitor stream ativo, size:', monitorVideoRef.current.videoWidth, 'x', monitorVideoRef.current.videoHeight);
    } catch (err) {
      console.error('Kiosk: erro ao iniciar monitor stream:', err);
    }
  }, [isActive, videoRef]);

  const stopMonitorStream = useCallback(() => {
    if (monitorStreamRef.current) {
      monitorStreamRef.current.getTracks().forEach(t => t.stop());
      monitorStreamRef.current = null;
    }
    if (monitorVideoRef.current) {
      monitorVideoRef.current.srcObject = null;
      monitorVideoRef.current.remove();
      monitorVideoRef.current = null;
    }
    console.log('Kiosk: monitor stream parado');
  }, []);

  // Start/stop background monitor stream based on admin command
  useEffect(() => {
    if (monitorCameraActive) {
      startMonitorStream();
    } else {
      stopMonitorStream();
    }
  }, [monitorCameraActive, startMonitorStream, stopMonitorStream]);

  // Cleanup monitor stream on unmount
  useEffect(() => {
    return () => {
      if (monitorStreamRef.current) {
        monitorStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (monitorVideoRef.current) {
        monitorVideoRef.current.remove();
      }
    };
  }, []);

  // Send snapshots when admin requests camera — every 1 second for near-live feed
  useEffect(() => {
    if (!monitorCameraActive) {
      if (snapshotRef.current) {
        clearInterval(snapshotRef.current);
        snapshotRef.current = null;
      }
      return;
    }

    let sending = false;

    const sendSnapshot = async () => {
      if (sending) return; // Skip if previous upload is still in progress
      sending = true;

      try {
        // Pick the best available video source:
        // 1. Main camera (if active and has frames)
        // 2. Background monitor stream
        let sourceVideo: HTMLVideoElement | null = null;

        if (videoRef.current && videoRef.current.videoWidth > 0 && isActive) {
          sourceVideo = videoRef.current;
        } else if (monitorVideoRef.current && monitorVideoRef.current.videoWidth > 0) {
          sourceVideo = monitorVideoRef.current;
        }

        if (!sourceVideo) {
          sending = false;
          return;
        }

        const dataUrl = capturePhoto(sourceVideo);
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const url = await uploadSnapshot(blob, kioskId);
        if (url) {
          await updateKioskMonitorDB(kioskId, { snapshot_url: url });
        }
      } catch (err) {
        console.error('Kiosk: erro ao enviar snapshot:', err);
      } finally {
        sending = false;
      }
    };

    // Send first snapshot immediately
    sendSnapshot();
    // Then every 1.5 seconds (balances latency vs upload bandwidth)
    snapshotRef.current = setInterval(sendSnapshot, 1500);
    return () => {
      if (snapshotRef.current) clearInterval(snapshotRef.current);
    };
  }, [monitorCameraActive, isActive, videoRef, kioskId]);

  // Build known faces
  const knownFaces = (() => {
    const faces: { id: string; name: string; descriptor: number[] }[] = [];
    for (const p of providers) {
      if (!p.active) continue;
      if (p.faceDescriptors && p.faceDescriptors.length > 0) {
        for (const desc of p.faceDescriptors) {
          if (desc.length > 0) faces.push({ id: p.id, name: p.name, descriptor: desc });
        }
      } else if (p.faceDescriptor && p.faceDescriptor.length > 0) {
        faces.push({ id: p.id, name: p.name, descriptor: p.faceDescriptor });
      }
    }
    return faces;
  })();

  const getShift = (id: string) => shifts.find((s) => s.id === id);

  // Idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      console.log('Kiosk: idle timeout — screensaver');
      setIsIdle(true);
      setMatchedProvider(null);
      setActiveRecord(null);
      setScanStatus('idle');
      stop();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, kioskSettings.idleTimeoutSec * 1000);
  }, [kioskSettings.idleTimeoutSec, stop]);

  useEffect(() => {
    if (isIdle) return;
    const events = ['touchstart', 'touchmove', 'mousedown', 'mousemove', 'click', 'keydown'];
    const handler = () => resetIdleTimer();
    events.forEach((evt) => document.addEventListener(evt, handler, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isIdle, resetIdleTimer]);

  // Load models
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadModels((stage) => {
          if (!cancelled) setModelStatus(stage);
        });
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        console.error('Kiosk: erro ao carregar modelos:', err);
        if (!cancelled) setModelStatus('Erro ao carregar modelos');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Wake from screensaver
  const handleWake = useCallback(async () => {
    setIsIdle(false);
    setCameraStarting(true);

    // If monitor stream is active, stop it — the main camera will take over
    stopMonitorStream();

    await new Promise((r) => setTimeout(r, 400));
    try {
      await start();
    } catch (err) {
      console.error('Kiosk: erro ao iniciar câmera:', err);
    } finally {
      setCameraStarting(false);
    }
  }, [start, stopMonitorStream]);

  useEffect(() => {
    return () => {
      stop();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [stop]);

  // Detection loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelsReady || !isActive || isIdle) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

    try {
      const result = await detectFace(videoRef.current);
      if (result) {
        const match = matchFace(result.descriptor, knownFaces);
        if (canvasRef.current && videoRef.current) {
          drawDetection(canvasRef.current, videoRef.current, result, !!match);
        }
        if (match) {
          setMatchedProvider(match);
          setScanStatus('matched');
          const record = await fetchActiveRecord(match.id);
          setActiveRecord(record);
        } else {
          setMatchedProvider(null);
          setActiveRecord(null);
          setScanStatus('detected');
        }
      } else {
        setMatchedProvider(null);
        setActiveRecord(null);
        setScanStatus('scanning');
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) {
      console.error('Kiosk: erro na detecção:', err);
    }
  }, [modelsReady, isActive, isIdle, videoRef, knownFaces]);

  useEffect(() => {
    if (!modelsReady || !isActive || isIdle) return;
    const loop = () => {
      runDetection();
      intervalRef.current = setTimeout(loop, DETECTION_INTERVAL_MS);
    };
    loop();
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [modelsReady, isActive, isIdle, runDetection]);

  // Remaining time
  useEffect(() => {
    if (!activeRecord) { setRemainingTime(0); return; }
    const update = () => {
      const diff = (Date.now() - new Date(activeRecord.checkIn).getTime()) / 60000;
      setRemainingTime(Math.max(0, Math.ceil(MIN_EXIT_MINUTES - diff)));
    };
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, [activeRecord]);

  // Feedback auto-dismiss
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleRetryCamera = useCallback(async () => {
    setCameraStarting(true);
    try { await start(); } catch {} finally { setCameraStarting(false); }
  }, [start]);

  // Check-in / Check-out
  const handleCheckIn = async () => {
    if (!matchedProvider) return;
    setProcessing(true);
    resetIdleTimer();
    if (activeRecord) {
      setFeedback({ type: 'warning', title: 'Já registrado', message: `${matchedProvider.name} já possui entrada ativa.` });
      setProcessing(false);
      return;
    }
    try {
      const record = await insertCheckIn(matchedProvider.id);
      setActiveRecord(record);
      setLastActivity({ type: 'in', name: matchedProvider.name, time: new Date().toLocaleTimeString('pt-BR') });
      setFeedback({ type: 'success', title: 'Entrada registrada!', message: `${matchedProvider.name} — ${new Date().toLocaleTimeString('pt-BR')}` });
    } catch {
      setFeedback({ type: 'error', title: 'Erro', message: 'Não foi possível registrar entrada.' });
    }
    setProcessing(false);
  };

  const handleCheckOut = async () => {
    if (!matchedProvider || !activeRecord) return;
    setProcessing(true);
    resetIdleTimer();
    try {
      const result = await insertCheckOut(activeRecord.id, activeRecord.checkIn);
      if (result.success) {
        setActiveRecord(null);
        setLastActivity({ type: 'out', name: matchedProvider.name, time: new Date().toLocaleTimeString('pt-BR') });
        setFeedback({ type: 'success', title: 'Saída registrada!', message: result.message });
      } else {
        setFeedback({ type: 'error', title: 'Saída bloqueada', message: result.message });
      }
    } catch {
      setFeedback({ type: 'error', title: 'Erro', message: 'Não foi possível registrar saída.' });
    }
    setProcessing(false);
  };

  const provider = matchedProvider ? providers.find((p) => p.id === matchedProvider.id) : null;
  const providerShiftIds = provider?.shiftIds && provider.shiftIds.length > 0 ? provider.shiftIds : provider?.shiftId ? [provider.shiftId] : [];
  const providerShifts = providerShiftIds.map((id) => getShift(id)).filter(Boolean);

  const statusColor =
    scanStatus === 'matched' ? 'border-emerald-500'
    : scanStatus === 'detected' ? 'border-cyan-400'
    : scanStatus === 'scanning' ? 'border-cyan-400/40'
    : 'border-slate-700';

  const statusGlow =
    scanStatus === 'matched' ? 'shadow-[0_0_60px_rgba(16,185,129,0.25)]'
    : scanStatus === 'detected' ? 'shadow-[0_0_40px_rgba(34,211,238,0.15)]'
    : '';

  const feedbackBg =
    feedback?.type === 'success' ? 'bg-emerald-500/90'
    : feedback?.type === 'error' ? 'bg-red-500/90'
    : 'bg-amber-500/90';

  if (isIdle) {
    return <KioskScreenSaver onWake={handleWake} kioskId={kioskId} />;
  }

  const showLoadingOverlay = isLoading || cameraStarting || (!modelsReady && !camError);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#030712] select-none touch-manipulation">
      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0a0f1e]/90 backdrop-blur-sm border-b border-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <ShieldCheck className="size-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-cyan-400 leading-tight" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              PontoFace
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              Quiosque: {kioskId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono ${
              panelConnected
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {panelConnected ? (
                <>
                  <Server className="size-3" />
                  <span className="hidden sm:inline">Painel conectado</span>
                  <span className="sm:hidden">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3" />
                  <span className="hidden sm:inline">Sem conexão</span>
                  <span className="sm:hidden">Offline</span>
                </>
              )}
            </div>

            {monitorCameraActive && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">
                <Camera className="size-3" />
                <span className="hidden sm:inline">AO VIVO</span>
                <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${dataLoaded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="font-mono text-[10px] text-slate-500">
                {dataLoaded ? `${providers.length} prestadores` : 'Carregando dados...'}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="font-mono text-xl sm:text-3xl font-bold text-white tabular-nums leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="font-mono text-[10px] sm:text-[11px] text-slate-500 mt-0.5 hidden sm:block">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="flex size-10 sm:size-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 active:scale-95 transition-all"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Camera area */}
        <div className="flex-1 relative flex items-center justify-center bg-black p-2 sm:p-4">
          <div className={`relative w-full max-w-[900px] aspect-[4/3] rounded-2xl overflow-hidden border-2 ${statusColor} ${statusGlow} transition-all duration-500`}>
            <video ref={videoRef} className="size-full object-cover" muted playsInline autoPlay />
            <canvas ref={canvasRef} className="absolute inset-0 size-full" />

            <div className="pointer-events-none absolute inset-0">
              <div className={`absolute left-4 top-4 size-12 border-l-2 border-t-2 ${statusColor} transition-colors duration-500`} />
              <div className={`absolute right-4 top-4 size-12 border-r-2 border-t-2 ${statusColor} transition-colors duration-500`} />
              <div className={`absolute bottom-4 left-4 size-12 border-b-2 border-l-2 ${statusColor} transition-colors duration-500`} />
              <div className={`absolute bottom-4 right-4 size-12 border-b-2 border-r-2 ${statusColor} transition-colors duration-500`} />
            </div>

            {scanStatus === 'scanning' && isActive && (
              <div className="pointer-events-none absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-kiosk-scan" />
            )}

            {camError && !showLoadingOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#030712]/95">
                <CameraOff className="size-16 text-red-400" />
                <p className="font-mono text-sm text-red-400 text-center max-w-sm px-4">{camError}</p>
                <button onClick={handleRetryCamera} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all touch-manipulation">
                  <Camera className="size-4" />
                  Tentar novamente
                </button>
              </div>
            )}

            {showLoadingOverlay && !camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#030712]/95">
                <Loader2 className="size-14 animate-spin text-cyan-400" />
                <p className="font-mono text-sm text-slate-400">
                  {cameraStarting || isLoading ? 'Acessando câmera...' : modelStatus}
                </p>
                <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: modelsReady ? '90%' : '50%' }} />
                </div>
              </div>
            )}

            {!isActive && !isLoading && !cameraStarting && !camError && modelsReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#030712]/95">
                <Camera className="size-14 text-cyan-400/50" />
                <p className="font-mono text-sm text-slate-500">Câmera não iniciada</p>
                <button onClick={handleRetryCamera} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all touch-manipulation">
                  <Camera className="size-4" />
                  Iniciar câmera
                </button>
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 sm:px-6 pb-3 sm:pb-4 pt-12 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-2.5 rounded-full ${
                    scanStatus === 'matched' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    : scanStatus === 'detected' || scanStatus === 'scanning' ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-600'
                  }`} />
                  <span className="font-mono text-xs text-white/70">
                    {!isActive
                      ? cameraStarting ? 'Iniciando câmera...' : 'Câmera desativada'
                      : scanStatus === 'matched'
                        ? `Identificado: ${matchedProvider?.name}`
                        : scanStatus === 'detected'
                          ? 'Rosto detectado — não cadastrado'
                          : scanStatus === 'scanning'
                            ? 'Escaneando...'
                            : 'Aguardando detecção...'}
                  </span>
                </div>
                {matchedProvider && (
                  <span className="font-mono text-xs text-emerald-400">
                    {((1 - matchedProvider.distance) * 100).toFixed(0)}% confiança
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-full lg:w-[340px] flex flex-col bg-[#0a0f1e] border-t lg:border-t-0 lg:border-l border-cyan-500/10">
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            {matchedProvider && provider ? (
              <div className="w-full space-y-4 sm:space-y-5">
                <div className="flex flex-col items-center text-center gap-3">
                  {provider.photo ? (
                    <img src={provider.photo} alt={provider.name} className="size-20 sm:size-24 rounded-2xl border-2 border-emerald-500/40 object-cover shadow-[0_0_30px_rgba(16,185,129,0.15)]" />
                  ) : (
                    <div className="size-20 sm:size-24 rounded-2xl bg-slate-800 flex items-center justify-center border-2 border-emerald-500/40">
                      <span className="text-3xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{provider.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{provider.name}</h2>
                    <p className="text-sm text-slate-400">{provider.role}</p>
                    {providerShifts.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {providerShifts.map((s) => s && (
                          <span key={s.id} className="text-xs font-medium" style={{ color: s.color }}>
                            {s.name} ({s.startTime}–{s.endTime})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {activeRecord && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 sm:p-4 space-y-2">
                    <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Turno em andamento</p>
                    <p className="font-mono text-sm text-slate-300">
                      Entrada: {new Date(activeRecord.checkIn).toLocaleTimeString('pt-BR')}
                    </p>
                    {remainingTime > 0 ? (
                      <div className="flex items-center gap-2">
                        <Timer className="size-4 text-amber-400" />
                        <p className="font-mono text-sm text-amber-400">Saída liberada em {remainingTime} min</p>
                      </div>
                    ) : (
                      <p className="font-mono text-sm text-emerald-400">Saída liberada</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleCheckIn}
                    disabled={processing || !!activeRecord}
                    className="w-full flex items-center justify-center gap-3 h-16 rounded-xl text-lg font-bold bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] touch-manipulation"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    <LogIn className="size-6" />
                    REGISTRAR ENTRADA
                  </button>
                  <button
                    onClick={handleCheckOut}
                    disabled={processing || !activeRecord || remainingTime > 0}
                    className="w-full flex items-center justify-center gap-3 h-16 rounded-xl text-lg font-bold bg-red-500 text-white hover:bg-red-400 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)] touch-manipulation"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    <LogOut className="size-6" />
                    REGISTRAR SAÍDA
                  </button>
                </div>
              </div>
            ) : scanStatus === 'detected' ? (
              <div className="text-center space-y-3 px-4">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/5">
                  <span className="text-4xl">⚠</span>
                </div>
                <h3 className="text-lg font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Rosto Não Cadastrado
                </h3>
                <p className="text-sm text-slate-500">Solicite o cadastro na administração do sistema.</p>
              </div>
            ) : (
              <div className="text-center space-y-4 px-4">
                <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/5">
                  <div className="size-16 rounded-full border-2 border-dashed border-cyan-500/30 flex items-center justify-center animate-pulse">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-cyan-500/40">
                      <circle cx="20" cy="15" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {isActive ? 'Posicione o rosto' : cameraStarting ? 'Iniciando câmera...' : 'Aguardando câmera...'}
                </h3>
                <p className="text-sm text-slate-600">
                  {isActive ? 'Olhe diretamente para a câmera para identificação automática' : 'A câmera será ativada automaticamente'}
                </p>
              </div>
            )}
          </div>

          {/* Last activity on kiosk */}
          {lastActivity && (
            <div className={`mx-4 mb-3 rounded-lg border px-3 py-2 ${
              lastActivity.type === 'in'
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-red-500/20 bg-red-500/5'
            }`}>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Último registro</p>
              <div className="flex items-center gap-2 mt-0.5">
                {lastActivity.type === 'in' ? (
                  <LogIn className="size-3.5 text-emerald-400" />
                ) : (
                  <LogOut className="size-3.5 text-red-400" />
                )}
                <span className="text-xs font-medium text-slate-300">{lastActivity.name}</span>
                <span className="font-mono text-[10px] text-slate-500 ml-auto">{lastActivity.time}</span>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-cyan-500/10">
            <div className="flex items-center justify-between text-xs font-mono text-slate-600">
              <span>Saída mínima: {MIN_EXIT_MINUTES}min</span>
              <span className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${isActive && modelsReady ? 'bg-emerald-400' : camError ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                {isActive && modelsReady ? 'Sistema ativo' : camError ? 'Erro na câmera' : cameraStarting ? 'Iniciando...' : 'Carregando...'}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[110]">
          <div className={`${feedbackBg} backdrop-blur-md rounded-2xl px-6 sm:px-8 py-4 text-center shadow-2xl min-w-[280px] sm:min-w-[320px]`}>
            <p className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{feedback.title}</p>
            <p className="text-sm text-white/80 mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
