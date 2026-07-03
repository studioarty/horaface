import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle, XCircle, AlertTriangle, UserCheck, HelpCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import type { Provider } from '@/types';
import { fetchProviders, insertCheckIn, insertCheckOut } from '@/lib/api';
import { fetchKioskSettings, fetchShifts } from '@/lib/api.supabase';
import { useTimeStore } from '@/stores/useTimeStore';
import { haversineDistance } from '@/lib/geoUtils';
import { detectFace, loadModels, matchFace } from '@/lib/faceApi';

const MobileKiosk = () => {
  const timeStore = useTimeStore();
  
  // App States: 'loading' | 'ready' | 'confirm' | 'success' | 'gps_error' | 'shift_error'
  const [appState, setAppState] = useState<'loading' | 'ready' | 'confirm' | 'success' | 'gps_error' | 'shift_error'>('loading');
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

  // GPS State (Running in background)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

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

        await timeStore.loadRecords();

        setAppState('ready');
      } catch (err) {
        console.error(err);
        toast.error("Erro crítico na inicialização do app.");
        setErrorMessage("Erro ao carregar dados do servidor. Tente atualizar a página.");
      }
    };
    init();
  }, []);

  // 3. Ultra-fast Face Scan Loop (With strict processingRef check)
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

  // 4. Handle Match: busca registro ativo direto do BANCO (não da memória)
  // Isso garante que entradas feitas por outros dispositivos (quiosque desktop) sejam detectadas
  const handleMatchedGuy = async (guy: Provider) => {
    setMatchedProvider(guy);
    setAppState('confirm'); // Mostra a tela de confirmação imediatamente

    try {
      // Consulta o banco para saber se há entrada aberta (cross-device safe)
      const openRecord = await timeStore.fetchActiveRecordFromDB(guy.id);
      setActiveRecord(openRecord || null);
      setLastOpType(openRecord ? 'out' : 'in');
    } catch {
      // Fallback: usa a memória local se o banco não responder
      const openRecord = timeStore.records.find(
        (r) => r.providerId === guy.id && !r.checkOut
      );
      setActiveRecord(openRecord || null);
      setLastOpType(openRecord ? 'out' : 'in');
    }
  };

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

    // Execute check-in or checkout
    try {
      if (isCheckOut) {
        const result = await insertCheckOut(activeRecord.id, activeRecord.checkIn, liveSettings?.minCheckoutMinutes || 15);
        if (result.success) {
          setAppState('success');
          toast.success("Saída marcada com sucesso!");
        } else {
          setErrorMessage(result.message);
          setAppState('gps_error');
        }
      } else {
        // Passa o nome do colaborador para ser salvo no banco
        await insertCheckIn(matchedProvider.id, undefined, undefined, matchedProvider.name);
        setAppState('success');
        toast.success("Entrada marcada com sucesso! Bom trabalho.");
      }
      
      // Reload records to keep sync in memory
      await timeStore.loadRecords();
    } catch (err) {
      console.error(err);
      setErrorMessage("Erro de comunicação com o servidor.");
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

  const resetAppState = () => {
    setMatchedProvider(null);
    setActiveRecord(null);
    setErrorMessage('');
    processingRef.current = false;
    setIsProcessing(false);
    setAppState('ready');
  };

  // UI rendering
  return (
    <div className="min-h-[100dvh] bg-[#020617] relative flex flex-col items-center justify-center p-4 overflow-hidden font-sans select-none">
      
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
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center min-h-[42dvh]">
          
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

          {/* STATE: READY (SCANNING CAMERA) */}
          {appState === 'ready' && (
            <div className="flex flex-col gap-5 animate-in zoom-in-95 duration-500">
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
                    
                    {/* Cyber HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.75)]"></div>
                      
                      {/* Brackets */}
                      <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
                      
                      {/* Scanner Line */}
                      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-emerald-400 opacity-90 shadow-[0_0_15px_1px_rgba(52,211,153,0.8)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
                      
                      {/* Face Oval */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[55%] border border-dashed border-emerald-400/25 rounded-[120px]"></div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="bg-slate-900/60 border border-white/5 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                  <div className="size-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <p className="text-[11px] text-slate-300 font-medium">Por favor, posicione seu rosto no centro da câmera.</p>
                </div>
                {userCoords && (
                  <p className="text-[9px] font-mono text-slate-500 uppercase">GPS Ativo: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}</p>
                )}
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
        <div className="py-3 px-6 text-center bg-transparent border-t border-white/5 flex items-center justify-between">
          <p className="text-[9px] text-slate-600 font-mono tracking-wider">HORAFACE MOBILE v25</p>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Ativo</span>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default MobileKiosk;
