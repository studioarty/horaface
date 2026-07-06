import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, UserCheck, HelpCircle, RefreshCw, Clock, FileText, BarChart3, TrendingUp, Calendar, ChevronLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import type { Provider, TimeRecord } from '@/types';
import { fetchProviders, insertCheckIn, insertCheckOut } from '@/lib/api';
import { fetchKioskSettings, fetchShifts, fetchRecordsByProvider, savePushSubscription, VAPID_PUBLIC_KEY } from '@/lib/api.supabase';
import { useTimeStore } from '@/stores/useTimeStore';
import { haversineDistance } from '@/lib/geoUtils';
import { detectFace, loadModels, matchFace, capturePhoto } from '@/lib/faceApi';
import { greetCollaborator } from '@/lib/azureTTS';

type ScanMode = 'checkin' | 'extrato' | 'resumo';

const MobileKiosk = () => {
  const timeStore = useTimeStore();

  // What the user intends to do when they scan
  const [scanMode, setScanMode] = useState<ScanMode>('checkin');

  // App States: 'loading' | 'idle' | 'ready' | 'confirm' | 'success' | 'gps_error' | 'shift_error'
  const [appState, setAppState] = useState<'loading' | 'idle' | 'ready' | 'confirm' | 'success' | 'gps_error' | 'shift_error'>('loading');
  const [loadingText, setLoadingText] = useState('Iniciando sistema...');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data
  const [providersList, setProvidersList] = useState<Provider[]>([]);
  const [shiftsList, setShiftsList] = useState<any[]>([]);
  const [liveSettings, setLiveSettings] = useState<any>(null);

  // Match / Result State
  const [matchedProvider, setMatchedProvider] = useState<Provider | null>(null);
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [lastOpType, setLastOpType] = useState<'in' | 'out'>('in');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedBiometricPhoto, setCapturedBiometricPhoto] = useState<string | undefined>(undefined);

  // History tab state
  const [historyProvider, setHistoryProvider] = useState<Provider | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TimeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'extrato' | 'resumo'>('extrato');

  // GPS State (Running in background)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

  // ── Alarm State ──────────────────────────────────────────────────────────
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmProviderName, setAlarmProviderName] = useState('');
  const [alarmSecondsLeft, setAlarmSecondsLeft] = useState(0);
  const alarmAudioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmBeepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const webcamRef = useRef<Webcam>(null);
  // Synchronous lock to prevent duplicate scans/clicks
  const processingRef = useRef(false);

  // 1. Start background GPS Watch immediately
  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn("Erro ao obter GPS em segundo plano:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      setGpsWatchId(id);
    }
    return () => {
      if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
    };
  }, []);

  // 2. Load Face Models & Database Data (Always fresh, bypassing local storage cache)
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingText('Carregando motor biométrico...');
        await loadModels();
        setModelsLoaded(true);

        setLoadingText('Sincronizando colaboradores...');
        const allProviders = await fetchProviders();
        setProvidersList(allProviders.filter(p => p.active && (p.faceDescriptor || p.faceDescriptors)));

        const allShifts = await fetchShifts();
        setShiftsList(allShifts);

        const freshSettings = await fetchKioskSettings();
        setLiveSettings(freshSettings);

        // Sincroniza a voz escolhida no painel para o localStorage local do celular
        // (azureTTS lê daqui como fallback quando o KioskStore ainda não foi populado)
        if (freshSettings.ttsVoice) {
          localStorage.setItem('horaface_tts_voice', freshSettings.ttsVoice);
        }

        await timeStore.loadRecords();

        setAppState('idle'); // Start on idle screen — camera only opens on button tap
      } catch (err) {
        console.error(err);
        toast.error("Erro crítico na inicialização do app.");
        setErrorMessage("Erro ao carregar dados do servidor. Tente atualizar a página.");
      }
    };
    init();
  }, []);

  // 2b. Refresh settings periodically (every 2 min) + on visibility change
  useEffect(() => {
    const refreshSettings = async () => {
      try {
        const fresh = await fetchKioskSettings();
        setLiveSettings(fresh);
      } catch { /* silent */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshSettings(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(refreshSettings, 30_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(interval); };
  }, []);

  // 3. Ultra-fast Face Scan Loop (With strict processingRef check)
  // Runs on both 'scan' tab (marcação) and 'history' tab (identify to view records)
  useEffect(() => {
    let isRunning = true;
    let scanTimer: NodeJS.Timeout;

    if (appState === 'ready' && modelsLoaded && providersList.length > 0 && webcamRef.current?.video) {
      const runScan = async () => {
        if (!isRunning || processingRef.current) return;

        const video = webcamRef.current?.video;
        if (!video || video.readyState !== 4) {
          scanTimer = setTimeout(runScan, 1000);
          return;
        }

        try {
          const detection = await detectFace(video, { isLite: true });
          if (detection && detection.descriptor) {
            const knownFaces = providersList.map(p => {
              const descriptor = (p.faceDescriptors && p.faceDescriptors.length > 0)
                ? p.faceDescriptors[0]
                : (p.faceDescriptor || []);
              return { id: p.id, name: p.name, descriptor };
            }).filter(f => f.descriptor.length === 128);

            const match = matchFace(detection.descriptor, knownFaces);
            if (match) {
              const guy = providersList.find(p => p.id === match.id);
              if (guy) {
                // Lock immediately!
                isRunning = false;
                processingRef.current = true;
                handleMatchedGuy(guy);
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Erro no frame de varredura:", e);
        }

        scanTimer = setTimeout(runScan, 800);
      };
      runScan();
    }

    return () => {
      isRunning = false;
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, [appState, modelsLoaded, providersList]);

  // 4. Handle Match: branches based on scanMode
  const handleMatchedGuy = async (guy: Provider) => {
    if (scanMode !== 'checkin') {
      // History mode: load records, show overlay
      setHistoryProvider(guy);
      setHistoryLoading(true);
      setAppState('confirm'); // pause the camera
      try {
        const recs = await fetchRecordsByProvider(guy.id);
        setHistoryRecords(recs);
      } catch {
        setHistoryRecords([]);
      } finally {
        setHistoryLoading(false);
      }
      return;
    }

    // Check-in/out mode: existing flow
    const photo = captureCurrentFrame();
    setCapturedBiometricPhoto(photo);
    setMatchedProvider(guy);
    setAppState('confirm');

    try {
      const openRecord = await timeStore.fetchActiveRecordFromDB(guy.id);
      setActiveRecord(openRecord || null);
      setLastOpType(openRecord ? 'out' : 'in');
    } catch {
      const openRecord = timeStore.records.find(
        (r) => r.providerId === guy.id && !r.checkOut
      );
      setActiveRecord(openRecord || null);
      setLastOpType(openRecord ? 'out' : 'in');
    }
  };

  // Helper: aguarda o vídeo estar pronto e captura a foto
  const captureCurrentFrame = (): string | undefined => {
    const video = webcamRef.current?.video;
    if (!video) return undefined;
    // Aceita readyState 2 (HAVE_CURRENT_DATA) ou superior
    if (video.readyState < 2 || video.videoWidth === 0) return undefined;
    try {
      return capturePhoto(video);
    } catch (e) {
      console.warn('capturePhoto failed:', e);
      return undefined;
    }
  };
  // ── ALARM FUNCTIONS (before confirmPonto so stopAlarm is accessible) ────
  const playAlarmBeep = useCallback(() => {
    try {
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600]);
      const ctx = alarmAudioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      alarmAudioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
      osc1.type = 'square'; osc1.frequency.value = 880; gain1.gain.value = 0.3;
      osc1.connect(gain1).connect(ctx.destination); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.2);
      const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
      osc2.type = 'square'; osc2.frequency.value = 1100; gain2.gain.value = 0.3;
      osc2.connect(gain2).connect(ctx.destination); osc2.start(ctx.currentTime + 0.3); osc2.stop(ctx.currentTime + 0.5);
      const osc3 = ctx.createOscillator(); const gain3 = ctx.createGain();
      osc3.type = 'square'; osc3.frequency.value = 1320; gain3.gain.value = 0.35;
      osc3.connect(gain3).connect(ctx.destination); osc3.start(ctx.currentTime + 0.6); osc3.stop(ctx.currentTime + 0.9);
    } catch (e) { console.warn('Alarm beep failed:', e); }
  }, []);

  const stopAlarm = useCallback(() => {
    setAlarmActive(false);
    if (alarmBeepRef.current) { clearInterval(alarmBeepRef.current); alarmBeepRef.current = null; }
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    localStorage.removeItem('horaface_alarm');
  }, []);

  // 5. Confirm and execute check-in / check-out with validation
  const confirmPonto = async () => {
    if (!matchedProvider) return;
    setIsProcessing(true);
    const isCheckOut = !!activeRecord;

    // Rule A: Validate GPS (only for check-in)
    if (!isCheckOut) {
      const [companyName] = (matchedProvider.company || '').split('|');
      const hasLocationRestriction = !!companyName && companyName.trim() !== "";

      if (hasLocationRestriction) {
        const locations = liveSettings?.workLocations || [];
        const assignedLoc = locations.find((l: any) => l.name === companyName);

        if (assignedLoc) {
          if (!userCoords) {
            setErrorMessage("Sua localização GPS não foi obtida. Verifique se o GPS do celular está ativado.");
            setAppState('gps_error');
            setIsProcessing(false);
            return;
          }

          const destLat = parseFloat(assignedLoc.lat);
          const destLng = parseFloat(assignedLoc.lng);
          const maxRadius = assignedLoc.radius || 100;

          const distanceMetres = haversineDistance(userCoords.lat, userCoords.lng, destLat, destLng);
          
          if (distanceMetres > maxRadius) {
            setErrorMessage(`Você está a ${Math.round(distanceMetres)} metros de "${assignedLoc.name}". O limite da Cerca é de ${maxRadius}m. Aproxime-se e tente novamente.`);
            setAppState('gps_error');
            setIsProcessing(false);
            return;
          }
        }
      }

      // Rule B: Validate Shift (only for check-in)
      const providerShiftIds = matchedProvider.shiftIds && matchedProvider.shiftIds.length > 0 
        ? matchedProvider.shiftIds 
        : matchedProvider.shiftId 
          ? [matchedProvider.shiftId] 
          : [];
      
      const providerShifts = providerShiftIds.map(id => shiftsList.find(s => s.id === id)).filter(Boolean);
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
        
        setErrorMessage(`Não há nenhum turno de atividades aberto para você no momento. Turnos permitidos: ${allowedShiftsText}`);
        setAppState('shift_error');
        setIsProcessing(false);
        return;
      }
    }

    // Execute check-in ou check-out
    try {
      // 📸 Usa a foto capturada no momento do reconhecimento facial (câmera ainda estava ativa)
      const capturedPhoto = capturedBiometricPhoto;

      // 📍 Formatar coordenadas GPS (7 casas decimais)
      const locationStr = userCoords
        ? `${userCoords.lat.toFixed(7)},${userCoords.lng.toFixed(7)}`
        : undefined;

      if (isCheckOut) {
        const result = await insertCheckOut(
          activeRecord.id,
          activeRecord.checkIn,
          liveSettings?.minCheckoutMinutes || 15,
          matchedProvider.id,
          capturedPhoto,   // foto de saída
          locationStr      // GPS de saída
        );
        if (result.success) {
          greetCollaborator('out', matchedProvider.name);
          stopAlarm(); // Para o alarme ao marcar saída
          setAppState('success');
          toast.success('Saída marcada com sucesso!');
        } else {
          setErrorMessage(result.message);
          setAppState('gps_error');
        }
      } else {
        await insertCheckIn(matchedProvider.id, capturedPhoto, locationStr, matchedProvider.name);
        greetCollaborator('in', matchedProvider.name);
        setAppState('success');
        toast.success('Entrada marcada com sucesso! Bom trabalho.');

        // ── Configurar alarme de saída ──────────────────────────────
        const warningMin = liveSettings?.autoCheckoutWarningMinutes ?? 25;
        const toleranceMin = liveSettings?.autoCheckoutToleranceMinutes ?? 30;
        // Encontrar turno ativo do colaborador
        const pShiftIds = matchedProvider.shiftIds?.length > 0
          ? matchedProvider.shiftIds
          : matchedProvider.shiftId ? [matchedProvider.shiftId] : [];
        const pShifts = pShiftIds.map((id: string) => shiftsList.find((s: any) => s.id === id)).filter(Boolean);
        const nowDate = new Date();
        const curMin = nowDate.getHours() * 60 + nowDate.getMinutes();
        const activeShift = pShifts.find((s: any) => {
          if (!s.startTime || !s.endTime) return false;
          const [sh, sm] = s.startTime.split(':').map(Number);
          const [eh, em] = s.endTime.split(':').map(Number);
          const sMin = sh * 60 + sm - 60;
          const eMin = eh * 60 + em;
          return sMin <= eMin ? (curMin >= sMin && curMin <= eMin) : (curMin >= sMin || curMin <= eMin);
        });
        if (activeShift) {
          const [eH, eM] = activeShift.endTime.split(':').map(Number);
          const alarmTime = new Date(nowDate);
          alarmTime.setHours(eH, eM + warningMin, 0, 0);
          const autoCloseTime = new Date(nowDate);
          autoCloseTime.setHours(eH, eM + toleranceMin, 0, 0);
          localStorage.setItem('horaface_alarm', JSON.stringify({
            providerId: matchedProvider.id,
            providerName: matchedProvider.name,
            shiftEndTime: alarmTime.toISOString(),
            autoCloseTime: autoCloseTime.toISOString(),
          }));
        }

        // ── Inscrever para Push Notifications (silencioso) ──────────
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          (async () => {
            try {
              const permission = await Notification.requestPermission();
              if (permission !== 'granted') return;
              const reg = await navigator.serviceWorker.ready;
              let sub = await reg.pushManager.getSubscription();
              if (!sub) {
                const urlB64ToUint8 = (b64: string) => {
                  const pad = '='.repeat((4 - b64.length % 4) % 4);
                  const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
                  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
                };
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY),
                });
              }
              await savePushSubscription(matchedProvider.id, sub);
            } catch (e) { console.warn('Push subscription failed:', e); }
          })();
        }
      }

      // Reload records to keep sync in memory
      await timeStore.loadRecords();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro de comunicação com o servidor.');
      setAppState('gps_error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Success Screen Auto-Reset
  useEffect(() => {
    if (appState === 'success') {
      const timer = setTimeout(() => {
        resetAppState();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // ── 7. ALARM MONITOR (check every 10 seconds) ──────────────────────────
  useEffect(() => {
    const checkAlarm = async () => {
      const raw = localStorage.getItem('horaface_alarm');
      if (!raw) { if (alarmActive) stopAlarm(); return; }

      let alarmData: any;
      try { alarmData = JSON.parse(raw); } catch { localStorage.removeItem('horaface_alarm'); return; }

      const { providerId, providerName, shiftEndTime, autoCloseTime } = alarmData;
      if (!providerId || !shiftEndTime) return;

      // Check if record is still active (no checkout yet)
      const stillActive = await timeStore.fetchActiveRecordFromDB(providerId);
      if (!stillActive) {
        // Checkout happened (manual or automatic) → stop alarm
        stopAlarm();
        return;
      }

      const now = Date.now();
      const alarmStart = new Date(shiftEndTime).getTime();
      const autoClose = new Date(autoCloseTime).getTime();

      if (now >= alarmStart && now < autoClose) {
        const secsLeft = Math.max(0, Math.round((autoClose - now) / 1000));
        setAlarmSecondsLeft(secsLeft);
        setAlarmProviderName(providerName);
        if (!alarmActive) {
          setAlarmActive(true);
          playAlarmBeep();
          // Repeat beep every 30 seconds
          alarmBeepRef.current = setInterval(playAlarmBeep, 30000);
        }
      } else if (now >= autoClose) {
        // Auto-close time passed → stop alarm
        stopAlarm();
      }
    };

    checkAlarm();
    alarmIntervalRef.current = setInterval(checkAlarm, 10000);

    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if (alarmBeepRef.current) clearInterval(alarmBeepRef.current);
    };
  }, [alarmActive, playAlarmBeep, stopAlarm]);

  const resetAppState = () => {
    setMatchedProvider(null);
    setActiveRecord(null);
    setErrorMessage('');
    setCapturedBiometricPhoto(undefined);
    processingRef.current = false;
    setIsProcessing(false);
    setAppState('idle'); // Always return to idle (not auto-camera)
  };

  const clearHistory = () => {
    setHistoryProvider(null);
    setHistoryRecords([]);
    setHistoryLoading(false);
    processingRef.current = false;
    setAppState('idle');
  };

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const shareComprovante = async () => {
    if (!historyProvider) return;
    const rate = (historyProvider as any).hourlyRate || 0;
    const value = historyTotalHours * rate;
    const monthStr = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const lines = [
      '\ud83d\udccb COMPROVANTE HORAFACE',
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      `\ud83d\udc64 Colaborador: ${historyProvider.name}`,
      `\ud83d\udcc5 Per\u00edodo: ${monthStr}`,
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      `\u2705 Dias trabalhados: ${historyTotalDays}`,
      `\u23f1\ufe0f Total de horas: ${historyTotalHours.toFixed(2)}h`,
      `\ud83d\udcca Turnos: ${historyMonthRecords.length}`,
      rate > 0 ? `\ud83d\udcb0 Taxa hor\u00e1ria: ${fmtBRL(rate)}/h` : null,
      rate > 0 ? `\ud83d\udcb5 VALOR ACUMULADO: ${fmtBRL(value)}` : null,
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      'Registros do m\u00eas:',
      ...historyByDay.map(([day, recs]) => {
        const dayH = recs.reduce((a: number, r: TimeRecord) => r.checkOut ? a + (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000 : a, 0);
        const entries = recs.map((r: TimeRecord) => `   ${fmtTime(r.checkIn)} \u2192 ${r.checkOut ? fmtTime(r.checkOut) : '...'}`).join('\n');
        return `\ud83d\udcc5 ${fmtDate(day)} | ${dayH.toFixed(1)}h\n${entries}`;
      }),
      '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
      'Emitido por HoraFace',
      'Sistema de Marca\u00e7\u00e3o de Hora',
      new Date().toLocaleString('pt-BR'),
    ].filter(Boolean).join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Comprovante HoraFace', text: lines });
      } else {
        await navigator.clipboard.writeText(lines);
        toast.success('Comprovante copiado para a \u00e1rea de transfer\u00eancia!');
      }
    } catch { /* user cancelled */ }
  };

  // Start camera scan intentionally for a specific purpose
  const startScan = (mode: ScanMode) => {
    setScanMode(mode);
    if (mode !== 'checkin') {
      setHistorySubTab(mode as 'extrato' | 'resumo');
    }
    setHistoryProvider(null);
    setHistoryRecords([]);
    setMatchedProvider(null);
    setErrorMessage('');
    processingRef.current = false;
    setAppState('ready');
  };

  // History computed values
  const now = new Date();
  const historyMonthRecords = useMemo(() => {
    const m = now.getMonth(); const y = now.getFullYear();
    return historyRecords.filter(r => {
      const d = new Date(r.checkIn); return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [historyRecords]);

  const historyTotalHours = useMemo(() =>
    historyMonthRecords.reduce((acc, r) => {
      if (!r.checkOut) return acc;
      return acc + (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000;
    }, 0), [historyMonthRecords]);

  // Helper: data LOCAL do check-in (evita bug de virada de dia UTC)
  const localDateKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const historyTotalDays = useMemo(() =>
    new Set(historyMonthRecords.map(r => localDateKey(r.checkIn))).size,
    [historyMonthRecords]);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
  };

  // Agrupa por dia LOCAL (não UTC) para evitar virada de data errada
  const historyByDay = useMemo(() => {
    const map = new Map<string, TimeRecord[]>();
    [...historyMonthRecords].reverse().forEach(r => {
      const day = localDateKey(r.checkIn);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    });
    return Array.from(map.entries()).reverse();
  }, [historyMonthRecords]);

  // UI rendering
  return (
    <div className="min-h-[100dvh] bg-[#020617] relative flex flex-col items-center justify-center p-4 pb-20 overflow-hidden font-sans select-none">
      
      {/* Ambience Background */}
      <div className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] bg-teal-900/20 rounded-full blur-[130px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[50vw] h-[50vw] bg-emerald-950/20 rounded-full blur-[110px] mix-blend-screen pointer-events-none"></div>
      
      {/* Card Wrapper */}
      <div className="w-full max-w-md bg-slate-950/45 backdrop-blur-2xl border border-white/5 shadow-[0_0_60px_rgba(16,185,129,0.06)] rounded-[32px] overflow-hidden flex flex-col relative z-10">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-emerald-500/20">
              <Camera className="size-5 text-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              HoraFace Mobile
            </h1>
            <p className="text-emerald-500/40 text-[9px] font-bold tracking-widest uppercase mt-0.5">Biometria Facial & GPS</p>
          </div>
        </div>

        {/* Dynamic Body */}
        <div className="p-5 sm:p-7 flex-1 flex flex-col justify-center min-h-[42dvh]">
          
          {/* STATE: LOADING */}
          {appState === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-5 py-8 animate-fade">
              <div className="relative">
                <div className="size-14 border-2 border-slate-800 border-t-emerald-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 bg-emerald-400/10 blur-xl rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-slate-300">Carregando HoraFace</p>
                <p className="text-xs text-slate-500">{loadingText}</p>
              </div>
            </div>
          )}

          {/* STATE: IDLE — 3 big action buttons, no camera */}
          {appState === 'idle' && (
            <div className="flex flex-col gap-4 animate-in fade-in-50 duration-400 py-2">
              {/* Big primary button: Registrar Hora */}
              <button
                onClick={() => startScan('checkin')}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white font-extrabold py-6 rounded-2xl shadow-[0_4px_24px_rgba(16,185,129,0.35)] border border-emerald-500/30 flex items-center justify-center gap-3 transition-all text-lg tracking-wide"
              >
                <Camera className="size-7" />
                Registrar Hora
              </button>

              {/* Secondary buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startScan('extrato')}
                  className="bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.97] border border-slate-700/60 hover:border-cyan-700/60 text-white font-bold py-6 rounded-2xl flex flex-col items-center gap-2.5 transition-all shadow-sm"
                >
                  <FileText className="size-7 text-cyan-400" />
                  <span className="text-sm text-cyan-200">Extrato</span>
                </button>
                <button
                  onClick={() => startScan('resumo')}
                  className="bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.97] border border-slate-700/60 hover:border-amber-700/60 text-white font-bold py-6 rounded-2xl flex flex-col items-center gap-2.5 transition-all shadow-sm"
                >
                  <BarChart3 className="size-7 text-amber-400" />
                  <span className="text-sm text-amber-200">Resumo do Mês</span>
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-600 mt-1">
                Toque em um botão e posicione seu rosto na câmera
              </p>
            </div>
          )}

          {/* STATE: READY (SCANNING CAMERA) */}
          {appState === 'ready' && (
            <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-500">
              <div className="relative w-full aspect-[3/4] bg-[#05080f] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-white/10">
                {!modelsLoaded ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-950">
                    <div className="size-8 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-500/70 uppercase">Iniciando Biometria</span>
                  </div>
                ) : (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: { ideal: 720 },
                        height: { ideal: 960 },
                        facingMode: 'user',
                      }}
                      className="w-full h-full object-cover scale-x-[-1] brightness-110 contrast-125"
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.75)]"></div>
                      <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-emerald-400 opacity-90 shadow-[0_0_15px_1px_rgba(52,211,153,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[55%] border border-dashed border-emerald-400/25 rounded-[120px]"></div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="bg-slate-900/60 border border-white/5 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                  <div className="size-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {scanMode === 'checkin' ? 'Posicione seu rosto para registrar marcação' :
                     scanMode === 'extrato' ? 'Posicione seu rosto para ver seu extrato' :
                     'Posicione seu rosto para ver o resumo do mês'}
                  </p>
                </div>
                <button onClick={resetAppState} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors mt-1">
                  ← Cancelar e voltar
                </button>
              </div>
            </div>
          )}

          {/* STATE: CONFIRMATION QUESTION SCREEN */}
          {appState === 'confirm' && matchedProvider && (
            <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4 duration-500 py-4">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full"></div>
                <div className="size-20 bg-slate-900/80 rounded-3xl flex items-center justify-center border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)] animate-fade">
                  {matchedProvider.photo ? (
                    <img src={matchedProvider.photo} alt={matchedProvider.name} className="w-full h-full object-cover rounded-3xl" />
                  ) : (
                    <UserCheck className="size-10" />
                  )}
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-slate-100">{matchedProvider.name}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{matchedProvider.role}</p>
                
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 mt-2 max-w-sm">
                  <div className="flex gap-2.5 items-start text-left">
                    <HelpCircle className="size-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-200 font-bold">Confirmação de Registro</p>
                      {activeRecord ? (
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Você já registrou a <b>Entrada</b> hoje às <b>{new Date(activeRecord.checkIn).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</b>.<br />
                          Deseja confirmar o registro de sua <b>SAÍDA</b> agora?
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Nenhum registro ativo encontrado para hoje.<br />
                          Deseja confirmar o registro de sua <b>ENTRADA</b> agora?
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={resetAppState}
                  disabled={isProcessing}
                  className="bg-transparent hover:bg-white/5 text-slate-400 font-bold py-3 rounded-xl transition-all border border-slate-700/50 text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmPonto}
                  disabled={isProcessing}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing && <RefreshCw className="size-3.5 animate-spin" />}
                  {isProcessing ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {appState === 'success' && matchedProvider && (
            <div className="animate-in slide-in-from-bottom-8 zoom-in-95 duration-500 py-6 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[35px] opacity-40 animate-pulse"></div>
                <div className="relative z-10 size-24 bg-emerald-500/10 border-2 border-emerald-400/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle className="size-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                </div>
              </div>
              <div className="text-center w-full bg-slate-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-md">
                <h2 className="text-lg font-bold text-white mb-0.5">Marcação Confirmada</h2>
                <div className="text-emerald-400 text-[11px] font-mono tracking-widest mb-3">BIOMETRIA & GPS: OK</div>
                
                <p className="text-sm font-semibold text-slate-200">
                  {matchedProvider.name}
                </p>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                  Operação: <strong className={lastOpType === 'out' ? "text-amber-400" : "text-emerald-400"}>{lastOpType === 'out' ? 'SAÍDA' : 'ENTRADA'}</strong>
                </p>
              </div>
            </div>
          )}

          {/* STATE: GPS ERROR OR SHIFT ERROR */}
          {(appState === 'gps_error' || appState === 'shift_error') && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                <div className="size-16 bg-red-500/10 flex items-center justify-center rounded-full border border-red-500/30 relative z-10">
                  {appState === 'gps_error' ? (
                    <MapPin className="size-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  ) : (
                    <AlertTriangle className="size-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  )}
                </div>
              </div>
              
              <h2 className="text-lg font-bold text-red-400 mb-2">
                {appState === 'gps_error' ? "Marcação Recusada (GPS)" : "Fora do Horário Permitido"}
              </h2>
              
              <div className="w-full bg-red-950/15 border border-red-900/30 p-4 rounded-2xl mb-6 text-left relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50"></div>
                <p className="text-xs text-red-200/90 leading-relaxed pl-2 font-medium">
                  {errorMessage}
                </p>
              </div>

              <div className="w-full space-y-2.5">
                <button 
                  onClick={resetAppState} 
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold py-3 rounded-xl transition-all border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-xs uppercase tracking-wider"
                >
                  Tentar Novamente
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-400 text-[10px] font-bold py-2 rounded-xl transition-all uppercase tracking-wider"
                >
                  Forçar Recarga do App
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="py-2 px-6 text-center bg-transparent border-t border-white/5 flex items-center justify-between">
          <p className="text-[9px] text-slate-600 font-mono tracking-wider">HORAFACE MOBILE v25</p>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Ativo</span>
          </div>
        </div>

      </div>

      {/* ── HISTORY OVERLAY (shown when historyProvider loaded) ── */}
      {scanMode !== 'checkin' && historyProvider && !historyLoading && (
        <div className="fixed inset-0 z-30 bg-[#020617] overflow-y-auto pb-24" style={{top:0}}>
          {/* Back header */}
          <div className="sticky top-0 z-10 bg-[#020617]/98 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button onClick={clearHistory} className="size-9 rounded-xl bg-slate-800/60 flex items-center justify-center border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors shrink-0">
              <ChevronLeft className="size-5" />
            </button>
            {historyProvider.photo ? (
              <img src={historyProvider.photo} className="size-9 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="size-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <span className="text-sm font-bold">{historyProvider.name[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">{historyProvider.name}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Meus Comprovantes</p>
            </div>
            <button
              onClick={shareComprovante}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-900/30 border border-cyan-700/40 text-cyan-300 hover:bg-cyan-800/40 transition-all text-[10px] font-bold uppercase tracking-wide"
            >
              <TrendingUp className="size-3.5" />
              Compartilhar
            </button>
          </div>

          <div className="p-4 space-y-3">

            {/* ── COMPROVANTE CARD (valor acumulado) ── */}
            {(() => {
              const rate = (historyProvider as any).hourlyRate || 0;
              const value = historyTotalHours * rate;
              return (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                  {/* Header do comprovante */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center">
                        <FileText className="size-3.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comprovante</span>
                    </div>
                    <span className="text-[9px] text-slate-600 capitalize">{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800/40 rounded-xl p-2.5">
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Horas</p>
                      <p className="text-base font-bold text-cyan-300 font-mono">{historyTotalHours.toFixed(1)}h</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-2.5">
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Dias</p>
                      <p className="text-base font-bold text-emerald-300 font-mono">{historyTotalDays}d</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-2.5">
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Turnos</p>
                      <p className="text-base font-bold text-amber-300 font-mono">{historyMonthRecords.length}</p>
                    </div>
                  </div>

                  {/* Valor acumulado (only if rate is configured) */}
                  {rate > 0 ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-emerald-600 uppercase font-bold mb-0.5">Valor Acumulado</p>
                        <p className="text-[9px] text-slate-600">{historyTotalHours.toFixed(2)}h × {fmtBRL(rate)}/h</p>
                      </div>
                      <p className="text-xl font-extrabold text-emerald-300 font-mono">{fmtBRL(value)}</p>
                    </div>
                  ) : (
                    <p className="text-center text-[10px] text-slate-600">Taxa horária não configurada</p>
                  )}

                  {/* Share button */}
                  <button
                    onClick={shareComprovante}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-900/20 border border-cyan-800/30 text-cyan-300 hover:bg-cyan-900/40 transition-all text-xs font-bold"
                  >
                    <TrendingUp className="size-4" />
                    Compartilhar Comprovante
                  </button>

                  {/* Emitir Base de Cálculo */}
                  <button
                    onClick={() => {
                      const hourlyRate = rate;
                      const horasExibidas = Math.ceil(historyTotalHours * 100) / 100;
                      const totalPayment = Math.ceil(horasExibidas * hourlyRate * 100) / 100;
                      const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                      const recList = [...historyMonthRecords]
                        .filter(r => r.checkOut)
                        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
                        .map(r => {
                          const dIn = new Date(r.checkIn);
                          const dOut = new Date(r.checkOut!);
                          const h = (dOut.getTime() - dIn.getTime()) / 3600000;
                          return `<tr>
                            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleDateString('pt-BR')}</td>
                            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dOut.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${h.toFixed(2)}h</td>
                            ${hourlyRate > 0 ? `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;font-weight:600">${fmtBRL(h * hourlyRate)}</td>` : ''}
                          </tr>`;
                        }).join('');

                      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Base de Cálculo – ${historyProvider?.name || 'Colaborador'}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:40px;max-width:800px;margin:auto}@media print{body{padding:20px}.no-print{display:none!important}}h1{font-size:22px;font-weight:700;color:#111}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}.logo{font-size:28px;font-weight:900;letter-spacing:-1px;color:#059669}.logo span{color:#111}.meta{text-align:right;font-size:12px;color:#6b7280}.section{margin-bottom:20px}.section h2{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.info-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}.info-item .label{font-size:10px;text-transform:uppercase;color:#9ca3af;margin-bottom:2px}.info-item .value{font-size:14px;font-weight:600;color:#111}table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f3f4f6}thead th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280}.total-box{background:#f0fdf4;border:2px solid #059669;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}.total-box .label{font-size:13px;color:#6b7280}.total-box .amount{font-size:28px;font-weight:900;color:#059669}.footer{margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end}.sign-area{border-top:1px solid #111;padding-top:8px;font-size:12px;color:#6b7280;min-width:200px;text-align:center}.print-btn{background:#059669;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:24px}.print-btn:hover{background:#047857}</style></head><body><button class="no-print print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button><div class="header"><div><div class="logo">Hora<span>Face</span></div><div style="font-size:12px;color:#6b7280;margin-top:4px">Sistema de Marcação de Hora</div><h1 style="margin-top:12px;font-size:18px">BASE DE CÁLCULO – NOTA DE SERVIÇO</h1></div><div class="meta"><div>Emitida em: ${new Date().toLocaleDateString('pt-BR')}</div><div style="margin-top:4px">Hora: ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div></div><div class="section"><h2>Dados do Colaborador</h2><div class="info-grid"><div class="info-item" style="grid-column:1/-1"><div class="label">Nome do Colaborador</div><div class="value" style="font-size:18px">${historyProvider?.name || 'Colaborador'}</div></div><div class="info-item"><div class="label">Período de Apuração</div><div class="value">${monthLabel}</div></div><div class="info-item"><div class="label">Dias Trabalhados</div><div class="value">${historyTotalDays} dias</div></div><div class="info-item"><div class="label">Total de Horas</div><div class="value">${horasExibidas.toFixed(2)}h</div></div>${hourlyRate > 0 ? `<div class="info-item"><div class="label">Taxa Horária</div><div class="value">${fmtBRL(hourlyRate)}/h</div></div>` : ''}</div></div><div class="section"><h2>Registros de Marcação de Hora</h2><table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th style="text-align:right">Horas</th>${hourlyRate > 0 ? '<th style="text-align:right">Valor</th>' : ''}</tr></thead><tbody>${recList || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af">Nenhum registro</td></tr>'}</tbody></table></div>${hourlyRate > 0 ? `<div class="total-box"><div><div class="label">Composição do Valor</div><div style="font-size:13px;color:#374151;margin-top:4px">${horasExibidas.toFixed(2)}h × ${fmtBRL(hourlyRate)}/h</div></div><div><div class="label" style="text-align:right">Valor Total a Receber</div><div class="amount">${fmtBRL(totalPayment)}</div></div></div>` : ''}<div class="footer"><div class="sign-area">Assinatura do Colaborador</div><div class="sign-area">Assinatura do Responsável</div></div><div style="margin-top:32px;text-align:center;font-size:11px;color:#d1d5db;border-top:1px solid #e5e7eb;padding-top:16px">Documento gerado pelo Sistema HoraFace · ${new Date().toLocaleString('pt-BR')}</div></body></html>`;

                      const w = window.open('', '_blank', 'width=900,height=700');
                      if (w) { w.document.write(html); w.document.close(); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border border-cyan-700/40 text-cyan-300 hover:from-cyan-900/50 hover:to-teal-900/50 transition-all text-sm font-bold active:scale-[0.97]"
                  >
                    <Printer className="size-4" />
                    🧾 Emitir Base de Cálculo
                  </button>
                </div>
              );
            })()}

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800">
              {(['extrato','resumo'] as const).map(t => (
                <button key={t} onClick={() => setHistorySubTab(t)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    historySubTab === t ? 'bg-cyan-900/50 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]' : 'text-slate-500 hover:text-slate-400'
                  }`}>
                  {t === 'extrato' ? '📄 Extrato' : '📊 Por Dia'}
                </button>
              ))}
            </div>

            {/* ── EXTRATO ── */}
            {historySubTab === 'extrato' && (
              <div className="space-y-2">
                {historyRecords.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Nenhum registro encontrado.</div>
                ) : historyRecords.map(r => {
                  const dIn = new Date(r.checkIn);
                  const hours = r.checkOut ? (new Date(r.checkOut).getTime() - dIn.getTime()) / 3600000 : 0;
                  const rate = (historyProvider as any).hourlyRate || 0;
                  const recVal = rate > 0 && r.checkOut ? hours * rate : 0;
                  return (
                    <div key={r.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center min-w-[32px]">
                            <span className="text-[9px] text-slate-500 uppercase">{dIn.toLocaleDateString('pt-BR',{weekday:'short'})}</span>
                            <span className="text-lg font-bold text-slate-100 leading-none">{dIn.getDate().toString().padStart(2,'0')}</span>
                            <span className="text-[9px] text-slate-600">{dIn.toLocaleDateString('pt-BR',{month:'short'})}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-800" />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 font-mono">↑ {fmtTime(r.checkIn)}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/30 font-mono">↓ {r.checkOut ? fmtTime(r.checkOut) : '...'}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="size-2.5" />{r.checkOut ? `${hours.toFixed(2)}h` : 'Em andamento'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {r.checkOut && <span className="text-[11px] font-mono text-cyan-400">{hours.toFixed(2)}h</span>}
                          {recVal > 0 && <span className="text-[11px] font-mono font-bold text-emerald-400">{fmtBRL(recVal)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── POR DIA (RESUMO) ── */}
            {historySubTab === 'resumo' && (
              <div className="space-y-2">
                {historyByDay.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Nenhum registro encontrado.</div>
                ) : historyByDay.map(([day, recs]) => {
                  const rate = (historyProvider as any).hourlyRate || 0;
                  const dayH = recs.reduce((a, r) => r.checkOut ? a + (new Date(r.checkOut).getTime()-new Date(r.checkIn).getTime())/3600000 : a, 0);
                  const dayVal = rate > 0 ? dayH * rate : 0;
                  return (
                    <div key={day} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-bold text-slate-200">{fmtDate(day)}</span>
                          <span className="text-[9px] text-slate-600 ml-2 capitalize">{(() => { const [y,m,d] = day.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('pt-BR',{weekday:'long'}); })()}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-cyan-400 font-mono font-bold">{dayH > 0 ? `${dayH.toFixed(2)}h` : '—'}</p>
                          {dayVal > 0 && <p className="text-[10px] text-emerald-400 font-mono font-bold">{fmtBRL(dayVal)}</p>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {recs.map(r => {
                          const h = r.checkOut ? (new Date(r.checkOut).getTime()-new Date(r.checkIn).getTime())/3600000 : 0;
                          return (
                            <div key={r.id} className="flex items-center justify-between">
                              <div className="flex gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 font-mono">↑ {fmtTime(r.checkIn)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/30 font-mono">↓ {r.checkOut ? fmtTime(r.checkOut) : '...'}</span>
                              </div>
                              {r.checkOut && <span className="text-[9px] text-slate-500 font-mono">{h.toFixed(2)}h</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY LOADING ── */}
      {historyLoading && scanMode !== 'checkin' && (
        <div className="fixed inset-0 z-30 bg-[#020617]/90 flex flex-col items-center justify-center gap-4">
          <div className="size-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Carregando seu extrato...</p>
        </div>
      )}

      {/* ── BOTTOM ACTION BAR (3 large buttons, visible during ready/error states) ── */}
      {(appState === 'ready' || appState === 'gps_error' || appState === 'shift_error') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-xl border-t border-white/5 grid grid-cols-3">
          <button
            onClick={() => startScan('checkin')}
            className={`flex flex-col items-center gap-1 py-4 transition-colors active:bg-white/5 ${
              scanMode === 'checkin' ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <Camera className="size-6" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Registrar</span>
          </button>
          <button
            onClick={() => startScan('extrato')}
            className={`flex flex-col items-center gap-1 py-4 transition-colors active:bg-white/5 border-x border-white/5 ${
              scanMode === 'extrato' ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <FileText className="size-6" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Extrato</span>
          </button>
          <button
            onClick={() => startScan('resumo')}
            className={`flex flex-col items-center gap-1 py-4 transition-colors active:bg-white/5 ${
              scanMode === 'resumo' ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            <BarChart3 className="size-6" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Resumo</span>
          </button>
        </div>
      )}

      {/* ── ALARM OVERLAY ── */}
      {alarmActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-sm" style={{animation: 'alarmPulse 1s ease-in-out infinite'}}>
          <div className="absolute inset-0 border-[6px] border-red-500 rounded-none" style={{animation: 'alarmBorder 0.8s ease-in-out infinite'}} />
          
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            <div className="size-20 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center" style={{animation: 'alarmIcon 0.6s ease-in-out infinite'}}>
              <span className="text-4xl">⚠️</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-red-100 uppercase tracking-wider mb-2">
                Marque sua Saída!
              </h2>
              <p className="text-lg text-red-200 font-semibold">{alarmProviderName}</p>
            </div>

            <div className="bg-red-900/60 border border-red-700/60 rounded-2xl px-6 py-4 space-y-1">
              <p className="text-xs text-red-300 uppercase font-bold tracking-widest">Fechamento automático em</p>
              <p className="text-4xl font-black text-red-100 font-mono">
                {Math.floor(alarmSecondsLeft / 60)}:{String(alarmSecondsLeft % 60).padStart(2, '0')}
              </p>
            </div>

            <button
              onClick={() => {
                stopAlarm();
                setScanMode('checkin');
                setAppState('ready');
              }}
              className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-lg uppercase tracking-wider shadow-2xl shadow-emerald-900/50 active:scale-95 transition-transform"
            >
              📸 Registrar Saída Agora
            </button>

            <p className="text-[10px] text-red-400/60">O alarme para automaticamente ao registrar a saída</p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes alarmPulse {
          0%, 100% { background-color: rgba(69, 10, 10, 0.95); }
          50% { background-color: rgba(127, 29, 29, 0.98); }
        }
        @keyframes alarmBorder {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 1); }
        }
        @keyframes alarmIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}} />
    </div>
  );
};

export default MobileKiosk;
