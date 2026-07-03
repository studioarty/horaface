import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Monitor,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import { useToast } from '@/hooks/use-toast';
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
  fetchAllKiosks,
  fetchProviderRecords,
  calculateMonthHours,
  fetchHolidays,
} from '@/lib/api';
import {
  loadModels,
  detectFace,
  drawDetection,
  matchFace,
  capturePhoto,
} from '@/lib/faceApi';
import { greetCollaborator } from '@/lib/azureTTS';
import { DETECTION_INTERVAL_MS } from '@/constants/config';
import type { Provider, Shift, TimeRecord } from '@/types';
import type { KioskSettings } from '@/lib/api';
import KioskScreenSaver from '@/components/features/KioskScreenSaver';
import { ThermalReceipt, type ReceiptData } from '@/components/features/ThermalReceipt';
import { getSyncQueue } from '@/lib/syncWorker';
import { useSearchParams } from 'react-router-dom';

type ScanStatus = 'idle' | 'scanning' | 'detected' | 'matched' | 'error';

interface MatchedProvider {
  id: string;
  name: string;
  distance: number;
}

function useKioskId() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const name = searchParams.get('name') || '';
  const location = searchParams.get('location') || '';
  return { id, defaultName: name, defaultLocation: location };
}

// Resgate puramente Síncrono (Vanilla JS) para ler o ID antes do componente piscar na tela
function getKioskIdSync() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

const spokenGreetings = new Set<string>();

function getGreetingHasBeenSpoken(providerId: string) {
  return spokenGreetings.has(providerId);
}

function setGreetingHasBeenSpoken(providerId: string) {
  spokenGreetings.add(providerId);
  setTimeout(() => spokenGreetings.delete(providerId), 10000); // 10s debounce
}

const AI_PHRASES_IN = [
  "Um ótimo dia de trabalho! Seu esforço de hoje constrói a base para um amanhã brilhante.",
  "Bem-vindo(a) ao turno! Que suas horas hoje sejam repletas de foco e alta produtividade.",
  "Comece com garra! Cada atitude positiva conta para transformar coisas comuns em histórias extraordinárias.",
  "Hora do show! Mais um dia para provar sua competência e energia a todos.",
  "Que bom que chegou! Respire fundo, trace metas mentais e devore os seus objetivos diários."
];

const AI_PHRASES_OUT = [
  "Missão cumprida com excelência! Vá descansar, seu corpo e mente merecem a recompensa que conquistaram.",
  "Mais um dia fechado na história! Aproveite sua família, recarregue as baterias e até logo.",
  "A satisfação de um dia bem trabalhado repousará nos seus ombros esta noite. Bom descanso!",
  "Turno finalizado! Deixe as preocupações do trabalho aqui e viva cada momento lá fora.",
  "Ótimo trabalho hoje. O sucesso contínuo precisa de uma noite limpa, tranquila e restauradora."
];

// Componente principal do Quiosque

export default function Kiosk() {
  const { id: kioskId, defaultName, defaultLocation } = useKioskId();
  if (!kioskId) {
    return <KioskSetup />;
  }
  const { videoRef, isActive, isLoading, error: camError, start, stop } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
    library: [],
    campaigns: [],
    idleTimeoutSec: 30,
    slideIntervalSec: 8,
    showClock: true,
    message: 'Toque na tela para registrar suas horas',
    minCheckoutMinutes: 15,
    newsTickerSpeed: 50,
    enableNewsTicker: true,
    newsTickerUrl: 'https://g1.globo.com/rss/g1/',
    rssLayout: '3d',
    rssSources: ['g1'],
  });
  const [monitorCameraActive, setMonitorCameraActive] = useState(false);

  // Confiança Síncrona Hot-Cache (Mata o problema do F5 e a latência Reativa)
  const syncId = getKioskIdSync();
  const TRUSTED_KEY = `PONTOFACE_KIOSK_TRUSTED_${syncId || kioskId}`;

  const getInitialApproval = () => {
    if (!syncId && !kioskId) return null;
    return window.localStorage.getItem(TRUSTED_KEY) === 'true' ? true : null;
  };
  const [isApproved, setIsApproved] = useState<boolean | null>(getInitialApproval());

  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  // const { toggleMute, isMuted } = useThemeStore(); // This line was not in the original code, so I'm not adding it.

  const isLite = useMemo(() => {
    return kioskSettings.liteTargetKiosks?.includes(kioskId || "") || false;
  }, [kioskSettings.liteTargetKiosks, kioskId]);

  // Video Constraints (Otimizado V19)
  // PCs fracos puxarão SD (640) da WebCam. PCs fortes puxam HD (1280).
  const videoConstraints = useMemo(() => ({
    width: { ideal: isLite ? 640 : 1280 },
    height: { ideal: isLite ? 480 : 720 },
    facingMode: "user"
  }), [isLite]);

  const [monitorStreamUrl, setMonitorStreamUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fallbackQueue, setFallbackQueue] = useState<{ text: string, type: 'in' | 'out' } | null>(null);
  const { toast } = useToast();

  const [modelsReady, setModelsReady] = useState(false);
  const [modelStatus, setModelStatus] = useState('Iniciando...');
  const [matchedProvider, setMatchedProvider] = useState<MatchedProvider | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [processing, setProcessing] = useState(false);
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // States for collaborator's month accumulated hours view
  const [providerMonthHours, setProviderMonthHours] = useState<number | null>(null);
  const [loadingHours, setLoadingHours] = useState(false);

  useEffect(() => {
    if (!matchedProvider) {
      setProviderMonthHours(null);
      return;
    }
    
    let active = true;
    setLoadingHours(true);
    
    const loadProviderHours = async () => {
      try {
        const [records, holidays] = await Promise.all([
          fetchProviderRecords(matchedProvider.id),
          fetchHolidays()
        ]);
        if (active) {
          const totalHours = calculateMonthHours(records, holidays);
          setProviderMonthHours(totalHours);
        }
      } catch (err) {
        console.error("Error loading provider month hours:", err);
      } finally {
        if (active) {
          setLoadingHours(false);
        }
      }
    };
    
    loadProviderHours();
    
    return () => {
      active = false;
    };
  }, [matchedProvider]);

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

  // Print Logic State
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Monitor Offline
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const updateQueue = () => setPendingSyncCount(getSyncQueue().length);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncWorkerUpdate', updateQueue);
    updateQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncWorkerUpdate', updateQueue);
    };
  }, []);

  // Clock e Pre-load de vozes
  useEffect(() => {
    // Força o carregador de vozes a disparar
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    const iv = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Register this kiosk on mount
  useEffect(() => {
    if (!kioskId) return;
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

  // Load data from API - initial throw and polling
  useEffect(() => {
    let cancelled = false;
    const loadAllData = async () => {
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
          console.log(`Kiosk Sync: ${provs.length} prestadores recebidos.`);
        }
      } catch (err) {
        console.error('Kiosk: erro ao carregar dados:', err);
        if (!cancelled) {
          setPanelConnected(false);
          setDataLoaded(true); // Evitar tela branca eterna
        }
      }
    };

    loadAllData(); // Carga inicial a quente
    const pollInterval = setInterval(loadAllData, 10000); // 10s Reload 

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, []);

  // Força Fullscreen invisível no primeiro toque da tela (único jeito de contornar Google Chrome)
  useEffect(() => {
    const forceFullscreen = () => {
      const el = document.documentElement as any;
      const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (requestFS && !document.fullscreenElement) {
        requestFS.call(el).catch(() => { });
      }
    };
    document.addEventListener('click', forceFullscreen, { once: true });
    document.addEventListener('touchstart', forceFullscreen, { once: true });
    return () => {
      document.removeEventListener('click', forceFullscreen);
      document.removeEventListener('touchstart', forceFullscreen);
    };
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
          kioskOnline: true,
          lastHeartbeat: new Date().toISOString(),
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
      updateKioskMonitorDB(kioskId, { kioskOnline: false }).catch(() => { });
    };
  }, [kioskId]);

  // Poll admin commands (camera toggle) and Absolute Kill-Switch
  useEffect(() => {
    if (!kioskId) return;
    const poll = async () => {
      try {
        const monitor = await fetchKioskMonitor(kioskId);
        if (monitor) {
          setMonitorCameraActive(monitor.cameraActive);

          // A regra de Ouro do Anti-F5: Jamais sobrescreva a confiança local com 'falso'
          // a menos que o Banco (monitor.isApproved) seja explicitamente BOOLEAN FALSE (Admin negou).
          // Retornos 'null' ou 'undefined' durante o Boot/Registro não podem apagar a Câmera aberta.
          if (monitor.isApproved === true) {
            setIsApproved(true);
            localStorage.setItem(TRUSTED_KEY, 'true');
          } else if (monitor.isApproved === false) {
            setIsApproved(false);
            localStorage.removeItem(TRUSTED_KEY);
          }
        }
      } catch { }
    };
    poll();
    monitorPollRef.current = setInterval(poll, 3000);
    return () => {
      if (monitorPollRef.current) clearInterval(monitorPollRef.current);
    };
  }, [kioskId, TRUSTED_KEY]);

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
          await updateKioskMonitorDB(kioskId, { snapshotUrl: url });
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
      if (p.faceDescriptors && Array.isArray(p.faceDescriptors) && p.faceDescriptors.length > 0) {
        for (const desc of p.faceDescriptors) {
          if (Array.isArray(desc) && desc.length > 0) {
            faces.push({ id: p.id, name: p.name, descriptor: desc });
          }
        }
      } else if (p.faceDescriptor && Array.isArray(p.faceDescriptor) && p.faceDescriptor.length > 0) {
        faces.push({ id: p.id, name: p.name, descriptor: p.faceDescriptor });
      }
    }
    console.log(`[Reconhecimento] Faces catalogadas na memória local: ${faces.length}`);
    return faces;
  })();

  const handleKioskDownloadExtract = () => {
    if (!matchedProvider || providerMonthHours === null) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const currentMonthYear = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

    const text = `==================================================
        COMPROVANTE DE HORAS REGISTRADAS
==================================================
COLABORADOR: ${matchedProvider.name}
REGISTRO (CPF): ${matchedProvider.cpf || 'N/A'}
PERÍODO: ${currentMonthYear}
--------------------------------------------------
TOTAL DE HORAS DE SERVIÇOS: ${providerMonthHours.toFixed(1)} hrs
--------------------------------------------------
GERADO EM: ${dateStr} às ${timeStr}

Este extrato parcial contém apenas o cálculo das
horas de serviço acumuladas e registradas até o 
momento informado. Não possui validade como 
documento financeiro ou holerite oficial.
==================================================
`;
    const blob = new Blob(["\uFEFF" + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato-horas-${matchedProvider.name.toLowerCase().replace(/\s+/g, '-')}-${now.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Extrato baixado com sucesso!", description: `Arquivo gerado para ${matchedProvider.name}` });
  };

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
      const result = await detectFace(videoRef.current, { isLite });
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
  }, [modelsReady, isActive, isIdle, videoRef, knownFaces, isLite]);

  useEffect(() => {
    if (!modelsReady || !isActive || isIdle) return;

    // Redução de processamento caso Kiosk esteja marcado como LITE
    const intervalMs = isLite ? 2000 : DETECTION_INTERVAL_MS;
    let isRunning = true;

    const loop = async () => {
      if (!isRunning) return;
      await runDetection();
      if (isRunning) {
        intervalRef.current = setTimeout(loop, intervalMs);
      }
    };
    
    loop();
    
    return () => { 
      isRunning = false;
      if (intervalRef.current) clearTimeout(intervalRef.current); 
    };
  }, [modelsReady, isActive, isIdle, runDetection, isLite]);

  // Remaining time
  useEffect(() => {
    if (!activeRecord) { setRemainingTime(0); return; }
    const update = () => {
      const diff = (Date.now() - new Date(activeRecord.checkIn).getTime()) / 60000;
      setRemainingTime(Math.max(0, Math.ceil(kioskSettings.minCheckoutMinutes - diff)));
    };
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, [activeRecord, kioskSettings.minCheckoutMinutes]);

  // Feedback auto-dismiss
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleRetryCamera = useCallback(async () => {
    setCameraStarting(true);
    try { await start(); } catch { } finally { setCameraStarting(false); }
  }, [start]);


  const handleCheckIn = async () => {
    if (!matchedProvider) return;
    setProcessing(true);
    resetIdleTimer();
    if (activeRecord) {
      setFeedback({ type: 'warning', title: 'Já registrado', message: `${matchedProvider.name} já possui entrada ativa.` });
      setProcessing(false);
      return;
    }
    // Validate shift hours
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const hasOpenShift = providerShifts.some((s) => {
      if (!s || !s.startTime || !s.endTime) return false;
      
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const [ch, cm] = currentTimeStr.split(':').map(Number);
      
      const currentMin = ch * 60 + cm;
      let startMin = sh * 60 + sm - 60; // 60 minutes tolerance
      let endMin = eh * 60 + em;
      
      if (startMin < 0) startMin += 24 * 60;
      
      if (startMin <= endMin) {
        return currentMin >= startMin && currentMin <= endMin;
      } else {
        return currentMin >= startMin || currentMin <= endMin;
      }
    });

    if (providerShifts.length > 0 && !hasOpenShift) {
      const allowedShiftsText = providerShifts
        .map((s) => `${s.name} (${s.startTime}–${s.endTime})`)
        .join(', ');
      
      setFeedback({
        type: 'warning',
        title: 'Fora do Horário do Turno',
        message: `Não há nenhum turno aberto para você no momento. Turnos permitidos: ${allowedShiftsText}`
      });
      toast({
        variant: 'destructive',
        title: 'Entrada bloqueada',
        description: 'Você está fora do horário dos seus turnos permitidos.'
      });
      setProcessing(false);
      
      // Auto close/reset profile after warning so next person can scan
      setTimeout(() => {
        setMatchedProvider(null);
        setActiveRecord(null);
        setScanStatus('scanning');
        setIsIdle(true);
      }, 5000);

      return;
    }

    try {
      let photoBase64 = "";
      if (videoRef.current && isActive) {
        try {
          photoBase64 = capturePhoto(videoRef.current);
        } catch (captureErr) {
          console.error("Failed to capture check-in photo:", captureErr);
        }
      }
      const record = await insertCheckIn(matchedProvider.id, photoBase64);
      setActiveRecord(record);
      setLastActivity({ type: 'in', name: matchedProvider.name, time: new Date().toLocaleTimeString('pt-BR') });
      toast({ title: 'Entrada registrada com sucesso!', description: `${matchedProvider.name} — ${new Date().toLocaleTimeString('pt-BR')}` });

      const randIdx = Math.floor(Math.random() * AI_PHRASES_IN.length);
      const randomMSG = AI_PHRASES_IN[randIdx];

      setReceiptData({
        providerName: matchedProvider.name,
        type: 'in',
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR'),
        kioskName: kioskId || "Terminal Padrão",
        customMessage: randomMSG
      });
      // Delay so React state can render the ThermalReceipt div natively into the Hidden DOM
      // setTimeout(() => { window.print(); }, 250);

      greetCollaborator('in', matchedProvider.name);
      
      // V20: Forçar o Kiosk a fechar o perfil do usuário em tela 2.5s após o bip
      // Liberando a máquina imediatamente para o colega de fila atrás dele.
      setTimeout(() => {
        setMatchedProvider(null);
        setActiveRecord(null);
        setScanStatus('scanning');
        setIsIdle(true);
      }, 2500);

    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar entrada' });
    }
    setProcessing(false);
  };

  const handleCheckOut = async () => {
    if (!matchedProvider || !activeRecord) return;
    setProcessing(true);
    resetIdleTimer();
    try {
      let photoBase64 = "";
      if (videoRef.current && isActive) {
        try {
          photoBase64 = capturePhoto(videoRef.current);
        } catch (captureErr) {
          console.error("Failed to capture checkout photo:", captureErr);
        }
      }
      const result = await insertCheckOut(
        activeRecord.id,
        activeRecord.checkIn,
        kioskSettings.minCheckoutMinutes,
        matchedProvider.id,
        photoBase64,
        "Quiosque"
      );
      if (result.success) {
        setActiveRecord(null);
        setLastActivity({ type: 'out', name: matchedProvider.name, time: new Date().toLocaleTimeString('pt-BR') });
        toast({ title: 'Saída registrada!', description: result.message });

        const randIdx = Math.floor(Math.random() * AI_PHRASES_OUT.length);
        const randomMSG = AI_PHRASES_OUT[randIdx];

        setReceiptData({
          providerName: matchedProvider.name,
          type: 'out',
          date: new Date().toLocaleDateString('pt-BR'),
          time: new Date().toLocaleTimeString('pt-BR'),
          kioskName: kioskId || "Terminal Padrão",
          customMessage: randomMSG
        });
        // setTimeout(() => { window.print(); }, 250);

        greetCollaborator('out', matchedProvider.name);
        
        // V20: Fechamento ágil.
        setTimeout(() => {
          setMatchedProvider(null);
          setActiveRecord(null);
          setScanStatus('scanning');
          setIsIdle(true);
        }, 2500);

      } else {
        toast({ variant: 'destructive', title: 'Saída bloqueada', description: result.message });
        
        // Fechar também em caso de erro, porém esperando um pouco mais para a pessoa ler
        setTimeout(() => {
          setMatchedProvider(null);
          setActiveRecord(null);
          setScanStatus('scanning');
          setIsIdle(true);
        }, 4000);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar saída' });
    }
    setProcessing(false);
  };

  const provider = matchedProvider ? providers.find((p) => p.id === matchedProvider.id) : null;
  const providerShiftIds = provider?.shiftIds && provider.shiftIds.length > 0 ? provider.shiftIds : provider?.shiftId ? [provider.shiftId] : [];
  const providerShifts = providerShiftIds.map((id) => getShift(id)).filter(Boolean);

  const statusColor =
    scanStatus === 'matched' ? 'border-emerald-500'
      : scanStatus === 'detected' ? 'border-teal-400'
        : scanStatus === 'scanning' ? 'border-teal-400/40'
          : 'border-slate-700';

  const statusGlow =
    scanStatus === 'matched' ? 'shadow-[0_0_60px_rgba(16,185,129,0.25)]'
      : scanStatus === 'detected' ? 'shadow-[0_0_40px_rgba(45,212,191,0.15)]'
        : '';

  const feedbackBg =
    feedback?.type === 'success' ? 'bg-emerald-500/90'
      : feedback?.type === 'error' ? 'bg-red-500/90'
        : 'bg-amber-500/90';

  const showLoadingOverlay = isLoading || cameraStarting || (!modelsReady && !camError);

  if (isApproved === false) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#020617] text-center p-6 touch-manipulation">
        <ShieldCheck className="size-20 text-emerald-500 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Aguardando Aprovação do Administrador
        </h1>
        <p className="text-slate-400 max-w-md mb-8">
          Este terminal ({kioskId}) foi registrado. Para liberar a Biometria, solicite no Painel Admin.
        </p>
        <div className="size-10 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#020617] overflow-hidden select-none touch-manipulation font-sans print:static print:block print:h-auto print:bg-white print:overflow-visible">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-900/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-teal-900/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none print:hidden"></div>

      {/* Screensaver Sobreposto */}
      {isIdle && (
        <div className="absolute inset-0 z-[500]">
          <KioskScreenSaver onWake={handleWake} kioskId={kioskId} />
        </div>
      )}

      {receiptData && <ThermalReceipt data={receiptData} ref={receiptRef} />}

      {/* Top Bar Glassmorphism */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/40 backdrop-blur-md border-b border-emerald-500/10 shadow-[0_4px_30px_rgba(16,185,129,0.05)] print:hidden">
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer"
            onDoubleClick={() => {
              toast({ title: "Sair do Totem", description: "Pressione ALT + F4" });
            }}
          >
            <ShieldCheck className="size-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm font-sans">
              HoraFace UI
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500/60 font-mono font-bold">
              Quiosque: {kioskId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            {isOffline && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-500">
                <WifiOff className="size-3" />
                <span className="hidden sm:inline">Offline</span>
                {pendingSyncCount > 0 && <span>({pendingSyncCount})</span>}
              </div>
            )}
            {!isOffline && panelConnected && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <Server className="size-3" />
                <span className="hidden sm:inline">Conectado</span>
              </div>
            )}
            {!isOffline && !panelConnected && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">
                <Server className="size-3" />
                <span className="hidden sm:inline">BD Offline</span>
              </div>
            )}
            {monitorCameraActive && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">
                <Camera className="size-3" />
                <span className="hidden sm:inline">AO VIVO</span>
                <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${dataLoaded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="font-mono text-[10px] text-slate-500">{dataLoaded ? `${providers.length} pessoas` : 'Carregando...'}</span>
            </div>
          </div>

          <div className="text-center">
            <p className="font-mono text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-100 to-teal-100 tabular-nums leading-none drop-shadow-sm">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="font-mono text-[10px] sm:text-[11px] text-emerald-400/60 mt-0.5 hidden sm:block">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFullscreen} className="flex size-10 items-center justify-center rounded-xl bg-slate-900/50 border border-white/5 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all">
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Oculto na Impressão */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row print:hidden z-10">
        {/* Camera area */}
        <div className="flex-1 relative flex items-center justify-center p-2 sm:p-6 lg:p-12">
          <div className={`relative w-full max-w-[1000px] aspect-[16/10] bg-[#05080f] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.1)] ring-1 ring-white/5 transition-all duration-500`}>
            <video ref={videoRef} className="size-full object-cover brightness-110 contrast-110" muted playsInline autoPlay />
            <canvas ref={canvasRef} className="absolute inset-0 size-full" />
            <audio
              ref={audioRef}
              src={audioUrl || ''}
              className="hidden"
              onEnded={() => setAudioUrl(null)}
              onError={(e) => {
                console.error("DOM Audio Source Error:", e);
                if (fallbackQueue) playFallbackTTS(fallbackQueue.text);
              }}
            />

            {/* High-Tech HUD Overlay */}
            <div className="pointer-events-none absolute inset-0">
               {/* Dark Vignette */}
               <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] mix-blend-multiply"></div>
               
               {/* Advanced Corner Target Brackets, inheriting statusColor */}
               <div className={`absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 ${statusColor} rounded-tl-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors duration-500`}></div>
               <div className={`absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 ${statusColor} rounded-tr-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors duration-500`}></div>
               <div className={`absolute bottom-16 left-8 w-16 h-16 border-b-2 border-l-2 ${statusColor} rounded-bl-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors duration-500`}></div>
               <div className={`absolute bottom-16 right-8 w-16 h-16 border-b-2 border-r-2 ${statusColor} rounded-br-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors duration-500`}></div>
               
               {scanStatus === 'scanning' && isActive && (
                 <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 opacity-80 shadow-[0_0_30px_3px_rgba(52,211,153,0.9)] animate-[scan_3s_ease-in-out_infinite]">
                    <div className="absolute inset-0 bg-white/50 blur-[2px]"></div>
                 </div>
               )}

               {/* Center Face Guide Overlay */}
               {isActive && scanStatus !== 'matched' && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-[3/4] border border-dashed border-emerald-400/20 rounded-[120px] opacity-50"></div>
               )}
            </div>

            {camError && !showLoadingOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020617]/95 backdrop-blur-md">
                <CameraOff className="size-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <p className="font-mono text-sm text-red-400 text-center max-w-sm px-4">{camError}</p>
                <button onClick={handleRetryCamera} className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20 active:scale-95 transition-all touch-manipulation">
                  <Camera className="size-4" />
                  Reiniciar Hardware
                </button>
              </div>
            )}

            {showLoadingOverlay && !camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#020617]/95 backdrop-blur-md">
                <div className="relative">
                  <div className="size-16 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                </div>
                <div className="space-y-1 text-center">
                  <p className="font-mono text-sm text-emerald-400 uppercase tracking-widest">{cameraStarting || isLoading ? 'Acessando Câmera...' : modelStatus}</p>
                  <p className="text-xs text-slate-500 animate-pulse">Estabelecendo conexão neural segura</p>
                </div>
                <div className="w-64 h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full animate-pulse transition-all duration-1000" style={{ width: modelsReady ? '90%' : '50%' }} />
                </div>
              </div>
            )}

            {!isActive && !isLoading && !cameraStarting && !camError && modelsReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#020617]/95 backdrop-blur-md">
                <Camera className="size-16 text-emerald-500/30" />
                <p className="font-mono text-sm text-slate-500 uppercase tracking-widest">Câmera Suspensa</p>
                <button onClick={handleRetryCamera} className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all touch-manipulation">
                  <Camera className="size-4" />
                  Ativar Biometria
                </button>
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent px-6 sm:px-8 pb-4 pt-20 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${scanStatus === 'matched' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                    : scanStatus === 'detected' || scanStatus === 'scanning' ? 'bg-teal-400 animate-pulse shadow-[0_0_12px_rgba(45,212,191,0.8)]'
                      : 'bg-slate-700'
                    }`} />
                  <span className="font-mono text-[13px] font-semibold text-white tracking-wide drop-shadow-md">
                    {!isActive
                      ? cameraStarting ? 'INICIANDO MALHA...' : 'DESATIVADO'
                      : scanStatus === 'matched'
                        ? `IDENTIFICADO: ${matchedProvider?.name.toUpperCase()}`
                        : scanStatus === 'detected'
                          ? 'ROSTO DESCONHECIDO NO RADAR'
                          : scanStatus === 'scanning'
                            ? 'PROCURANDO...'
                            : 'MODO DE ESPERA'}
                  </span>
                </div>
                {matchedProvider && (
                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-lg backdrop-blur-md">
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      MATCH: {((1 - matchedProvider.distance) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div >

        {/* Side panel */}
        <aside className="w-full lg:w-[360px] flex flex-col bg-slate-950/40 backdrop-blur-3xl border-t lg:border-t-0 lg:border-l border-white/5 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20">
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            {matchedProvider && provider ? (
              <div className="w-full space-y-5 sm:space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
                <div className="flex flex-col items-center text-center gap-4">
                  {provider.photo ? (
                    <img src={provider.photo} alt={provider.name} className="size-24 sm:size-28 rounded-3xl border-2 border-emerald-500/40 object-cover shadow-[0_0_40px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10" />
                  ) : (
                    <div className="size-24 sm:size-28 rounded-3xl bg-slate-900/80 flex items-center justify-center border-2 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10">
                      <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-emerald-300 to-teal-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{provider.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-md" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{provider.name}</h2>
                    <p className="text-sm font-medium text-emerald-400/80 uppercase tracking-widest mt-1">{provider.role}</p>
                    {providerShifts.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-3">
                        {providerShifts.map((s) => s && (
                          <span key={s.id} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5 border border-white/10" style={{ color: s.color }}>
                            {s.name} ({s.startTime}–{s.endTime})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Parcial de Horas Acumuladas */}
                <div className="rounded-xl lg:rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 sm:p-4 space-y-1.5 backdrop-blur-md relative overflow-hidden animate-fade-up">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Parcial de Horas (Mês Atual)</p>
                      <p className="font-mono text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                        {loadingHours ? (
                          <span className="text-sm font-sans font-normal text-slate-400 animate-pulse">Carregando parcial...</span>
                        ) : providerMonthHours !== null ? (
                          <>
                            {providerMonthHours.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">horas acumuladas</span>
                          </>
                        ) : (
                          <span className="text-sm font-sans font-normal text-slate-400">Sem registros</span>
                        )}
                      </p>
                    </div>
                    {providerMonthHours !== null && !loadingHours && (
                      <button
                        type="button"
                        onClick={handleKioskDownloadExtract}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/35 px-3 py-2 rounded-xl transition-all active:scale-[0.95] cursor-pointer"
                      >
                        📥 Baixar Extrato
                      </button>
                    )}
                  </div>
                </div>

                {activeRecord && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Turno em andamento</p>
                    <p className="font-mono text-lg font-medium text-slate-200">
                      Entrada: {new Date(activeRecord.checkIn).toLocaleTimeString('pt-BR')}
                    </p>
                    {remainingTime > 0 ? (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                        <Timer className="size-4 text-amber-400 animate-pulse" />
                        <p className="font-mono text-xs text-amber-400 font-semibold">Saída em {remainingTime} min</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                        <CheckCircle className="size-4 text-emerald-400" />
                        <p className="font-mono text-xs text-emerald-400 font-semibold">Saída liberada</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleCheckIn}
                      disabled={processing || !!activeRecord}
                      className="w-full flex items-center justify-center gap-3 h-16 rounded-2xl text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 active:scale-[0.97] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_25px_rgba(16,185,129,0.4)] touch-manipulation hover:shadow-[0_4px_35px_rgba(16,185,129,0.6)]"
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    >
                      <LogIn className="size-6 drop-shadow-md" />
                      REGISTRAR ENTRADA
                    </button>
                    <button
                      onClick={handleCheckOut}
                      disabled={processing || !activeRecord}
                      className="w-full flex items-center justify-center gap-3 h-16 rounded-2xl text-lg font-bold bg-gradient-to-r from-red-600 to-rose-500 text-white hover:from-red-500 hover:to-rose-400 active:scale-[0.97] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_25px_rgba(239,68,68,0.4)] touch-manipulation hover:shadow-[0_4px_35px_rgba(239,68,68,0.6)]"
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    >
                      <LogOut className="size-6 drop-shadow-md" />
                      REGISTRAR SAÍDA
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMatchedProvider(null);
                      setActiveRecord(null);
                      setScanStatus('scanning');
                      setIsIdle(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-300 active:scale-[0.98]"
                  >
                    <span>VOLTAR AO INÍCIO</span>
                  </button>
                </div>
              </div>
            ) : scanStatus === 'detected' ? (
              <div className="text-center space-y-4 px-4 animate-in zoom-in-95 duration-300">
                <div className="mx-auto flex size-24 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <AlertTriangle className="size-10 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-400 drop-shadow-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    Rosto Não Cadastrado
                  </h3>
                  <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">Solicite o cadastro de biometria na administração do sistema.</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-5 px-4">
                <div className="mx-auto flex size-28 items-center justify-center rounded-full border border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                  <div className="size-20 rounded-full border-2 border-dashed border-emerald-500/30 flex items-center justify-center animate-[spin_8s_linear_infinite]">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-emerald-500/50">
                      <circle cx="20" cy="15" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {isActive ? 'Posicione o Rosto' : cameraStarting ? 'Iniciando Matriz...' : 'Aguardando Câmera...'}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-2 leading-relaxed px-2">
                    {isActive ? 'Aproxime-se do terminal e olhe diretamente para o leitor óptico.' : 'A lente será ativada automaticamente pelo painel'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Last activity on kiosk */}
          {lastActivity && (
            <div className={`mx-6 mb-4 rounded-xl border px-4 py-3 backdrop-blur-md shadow-lg ${lastActivity.type === 'in'
              ? 'border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              : 'border-red-500/20 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }`}>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Último Registro</p>
              <div className="flex items-center gap-2">
                {lastActivity.type === 'in' ? (
                  <LogIn className="size-4 text-emerald-400" />
                ) : (
                  <LogOut className="size-4 text-red-400" />
                )}
                <span className="text-[13px] font-bold text-slate-200 truncate pr-2">{lastActivity.name}</span>
                <span className="font-mono text-[11px] font-medium text-slate-400 ml-auto bg-slate-950/50 px-2 py-0.5 rounded-md border border-white/5">{lastActivity.time}</span>
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t border-white/5 bg-slate-950/30">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              <span>Saída mínima: {kioskSettings.minCheckoutMinutes}m</span>
              <span className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${isActive && modelsReady ? 'bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : camError ? 'bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-amber-400 animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.8)]'}`} />
                {isActive && modelsReady ? 'ATIVO' : camError ? 'ERRO NA CÂMERA' : cameraStarting ? 'BOOT...' : 'CARREGANDO'}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Feedback toast - Oculto na Impressora */}
      {
        feedback && (
          <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-[110] print:hidden">
            <div className={`${feedbackBg} backdrop-blur-md rounded-2xl px-6 sm:px-8 py-4 text-center shadow-2xl min-w-[280px] sm:min-w-[320px]`}>
              <p className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{feedback.title}</p>
              <p className="text-sm text-white/80 mt-0.5">{feedback.message}</p>
            </div>
          </div>
        )
      }
    </div >
  );
}

function KioskSetup() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("O nome é obrigatório");
    setLoading(true);

    // Slugify the name to use as a recognizable ID instead of a random string
    const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const newId = safeName ? `kiosk-${safeName}` : crypto.randomUUID().split('-')[0];

    try {
      // Pré-validação de Nomes e IDs Existentes no Banco
      const allKiosks = await fetchAllKiosks();
      const duplicateExists = allKiosks.some(
        (k) => k.id.toLowerCase() === newId.toLowerCase() ||
          k.name.trim().toLowerCase().replace(/^\[ok\]/i, '') === name.trim().toLowerCase()
      );

      if (duplicateExists) {
        alert(`Já existe um quiosque registrado com o nome "${name.trim()}". Por favor, escolha um nome diferente (Ex: ${name.trim()} 2) para prosseguir.`);
        setLoading(false);
        return;
      }

      await registerKiosk(newId, name.trim(), location.trim());
      window.location.href = `/quiosque?id=${newId}`;
    } catch (err) {
      alert("Erro ao registrar quiosque.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030712] p-6 touch-manipulation">
      <form onSubmit={handleSetup} className="hud-card w-full max-w-md p-8 rounded-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-500 fade-in">
        <div className="flex flex-col items-center text-center mb-2">
          <Monitor className="size-16 text-cyan-400 mb-4" />
          <h1 className="text-2xl font-bold text-white font-heading">Novo Quiosque</h1>
          <p className="text-sm text-slate-400 mt-2">Configure este dispositivo para utilizá-lo como um terminal HoraFace.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nome de Exibição *</label>
            <input
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Tablet Portaria"
              className="w-full h-12 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Localização (opcional)</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ex: Térreo"
              className="w-full h-12 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full h-12 bg-cyan-500 text-slate-950 font-bold rounded-xl hover:bg-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-5 animate-spin border-slate-900" /> : "Vincular Este Aparelho"}
        </button>
      </form>
    </div>
  );
}
