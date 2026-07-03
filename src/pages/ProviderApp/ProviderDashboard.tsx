import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, DollarSign, Activity, Coffee } from 'lucide-react';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';
import type { TimeRecord } from '@/types';
import { useKioskStore } from '@/stores/useKioskStore';
import { useShiftStore } from '@/stores/useShiftStore';
import { updateBreakStart, updateBreakEnd } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // em metros
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, fetchMyRecords } = useProviderAuthStore();
  const { toast } = useToast();
  const kioskStore = useKioskStore();
  const shiftStore = useShiftStore();

  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [breakElapsed, setBreakElapsed] = useState('10:00');
  const [monthTotal, setMonthTotal] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  const breakWindow = useMemo(() => {
    if (!user) return { start: "09:00", end: "09:10" };
    
    const providerShiftIds = user.shiftIds && user.shiftIds.length > 0
      ? user.shiftIds
      : user.shiftId ? [user.shiftId] : [];

    const providerShifts = providerShiftIds
      .map(id => shiftStore.shifts.find(s => s.id === id))
      .filter(Boolean) as import('@/types').Shift[];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let activeShift = providerShifts.find(s => {
      if (!s.startTime || !s.endTime) return false;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm - 60;
      const endMinutes = eh * 60 + em + 60;
      
      if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    });

    if (!activeShift && providerShifts.length > 0) {
      activeShift = providerShifts[0];
    }

    return {
      start: activeShift?.breakStartTime || kioskStore?.breakStartTime || "09:00",
      end: activeShift?.breakEndTime || kioskStore?.breakEndTime || "09:10"
    };
  }, [user, shiftStore.shifts, kioskStore?.breakStartTime, kioskStore?.breakEndTime]);

  // Carregar configurações do Kiosk para ter os WorkLocations disponíveis para Geofence
  useEffect(() => {
    kioskStore.loadSettings();
  }, []);

  const fetchRecords = async () => {
    try {
      const { records, holidays } = await fetchMyRecords();
      const active = records.find(r => !r.checkOut && !r.status.startsWith('adjusted'));
      setActiveRecord(active || null);

      // Calcular o total do mês atual, apenas dias úteis (Seg-Sex)
      let totalHours = 0;
      const now = new Date();
      
      // Somar os tempos apontados descontando o excedente do intervalo
      records.forEach(rec => {
        if (!rec.checkOut) return;
        const dIn = new Date(rec.checkIn);
        if (dIn.getMonth() === now.getMonth() && dIn.getFullYear() === now.getFullYear()) {
          const dayOfWeek = dIn.getDay();
          // Excluir Sábado (6) e Domingo (0)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            let recordMs = new Date(rec.checkOut).getTime() - dIn.getTime();
            
            // Subtrair o excesso de intervalo (acima de 10 min)
            if (rec.breakStart && rec.breakEnd) {
              const breakMs = new Date(rec.breakEnd).getTime() - new Date(rec.breakStart).getTime();
              const excessMs = Math.max(0, breakMs - 10 * 60000); // 10 minutos = 600.000 ms
              recordMs = Math.max(0, recordMs - excessMs);
            }

            const hours = recordMs / 3600000;
            totalHours += hours;
          }
        }
      });

      // Somar horas de feriados do mês atual (8.5h por feriado de segunda a sexta)
      const cutoffDate = new Date("2026-03-21T00:00:00").getTime();
      
      holidays.forEach(hol => {
        if (!hol.isRoutine) { // Apenas feriados e não abonos
          const holDate = new Date(`${hol.targetDate}T12:00:00`); // Garantir fuso
          const creditTime = new Date(`${hol.targetDate}T18:00:00`).getTime();
          
          if (holDate.getTime() >= cutoffDate) {
            if (holDate.getMonth() === now.getMonth() && holDate.getFullYear() === now.getFullYear()) {
              const dayOfWeek = holDate.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Apenas credita o valor no dashboard APÓS as 18:00 do próprio feriado
                if (now.getTime() >= creditTime) {
                  totalHours += 8.5;
                }
              }
            }
          }
        }
      });
      
      setMonthTotal(totalHours);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecords();
    
    // Auto-refresh a cada 15 segundos
    const intervalId = setInterval(() => {
      fetchRecords();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  // Loop do Cronômetro de Expediente Principal
  useEffect(() => {
    if (!activeRecord) {
      setElapsed('00:00:00');
      return;
    }
    const interval = setInterval(() => {
      const start = new Date(activeRecord.checkIn).getTime();
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecord]);

  // Loop do Cronômetro do Intervalo (Contagem Regressiva)
  useEffect(() => {
    if (!activeRecord || !activeRecord.breakStart || activeRecord.breakEnd) {
      setBreakElapsed('10:00');
      return;
    }
    const interval = setInterval(() => {
      const breakStartDate = new Date(activeRecord.breakStart);
      const [scheduledH, scheduledM] = breakWindow.start.split(':').map(Number);
      
      const scheduledEnd = new Date(breakStartDate);
      scheduledEnd.setHours(scheduledH, scheduledM, 0, 0);
      scheduledEnd.setTime(scheduledEnd.getTime() + 10 * 60000); // 10 minutos após o horário agendado de início
      
      // Correção de dia cruzando meia-noite
      if (scheduledEnd.getTime() < breakStartDate.getTime() - 12 * 60 * 60 * 1000) {
        scheduledEnd.setTime(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      if (scheduledEnd.getTime() > breakStartDate.getTime() + 12 * 60 * 60 * 1000) {
        scheduledEnd.setTime(scheduledEnd.getTime() - 24 * 60 * 60 * 1000);
      }

      const remainingMs = scheduledEnd.getTime() - Date.now();
      
      if (remainingMs >= 0) {
        const m = Math.floor(remainingMs / 60000);
        const s = Math.floor((remainingMs % 60000) / 1000);
        setBreakElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        const excessMs = Math.abs(remainingMs);
        const m = Math.floor(excessMs / 60000);
        const s = Math.floor((excessMs % 60000) / 1000);
        setBreakElapsed(`-${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecord, breakWindow.start]);

  // Validador de Geofence (Cerca Eletrônica GPS)
  const checkGeofenceAndExecute = (action: () => Promise<void>) => {
    const [companyName] = (user?.company || '').split('|');
    const assignedLoc = kioskStore.workLocations.find((l: any) => l.name === companyName);
    
    // Se não há local atribuído (Livre - Sem GPS), executa imediatamente
    if (!assignedLoc) {
      action();
      return;
    }
    
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const destLat = parseFloat(assignedLoc.lat);
        const destLng = parseFloat(assignedLoc.lng);
        const maxRadius = assignedLoc.radius || 100;
        
        const dist = haversineDistance(latitude, longitude, destLat, destLng);
        if (dist > maxRadius) {
          toast({
            variant: 'destructive',
            title: 'Fora da Área de Serviço',
            description: `Você está a ${Math.round(dist)}m de "${assignedLoc.name}". O limite é de ${maxRadius}m para registrar o intervalo.`,
          });
          setGpsLoading(false);
        } else {
          setGpsLoading(false);
          await action();
        }
      },
      (error) => {
        toast({
          variant: 'destructive',
          title: 'Erro de GPS',
          description: 'Por favor, ative a localização do seu celular para registrar o intervalo.',
        });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStartBreak = () => {
    if (!activeRecord) return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const breakStartStr = breakWindow.start;
    const breakEndStr = breakWindow.end;

    const [startH, startM] = breakStartStr.split(':').map(Number);
    const [endH, endM] = breakEndStr.split(':').map(Number);

    const breakStartMinutes = startH * 60 + startM;
    const breakEndMinutes = endH * 60 + endM;

    let isOutsideWindow = false;
    if (breakEndMinutes < breakStartMinutes) {
      isOutsideWindow = currentMinutes < breakStartMinutes && currentMinutes > breakEndMinutes;
    } else {
      isOutsideWindow = currentMinutes < breakStartMinutes || currentMinutes > breakEndMinutes;
    }

    if (isOutsideWindow) {
      toast({
        variant: 'destructive',
        title: 'Horário Não Permitido',
        description: `O intervalo só é permitido para início entre as ${breakStartStr} e ${breakEndStr}.`,
      });
      return;
    }
    checkGeofenceAndExecute(async () => {
      const updated = await updateBreakStart(activeRecord.id, user?.id || '');
      if (updated) {
        setActiveRecord(updated);
        toast({
          title: 'Intervalo Iniciado',
          description: 'Seu tempo de descanso de 10 minutos começou.',
        });
      }
    });
  };

  const handleEndBreak = () => {
    if (!activeRecord) return;
    checkGeofenceAndExecute(async () => {
      const updated = await updateBreakEnd(activeRecord.id, user?.id || '');
      if (updated) {
        setActiveRecord(updated);
        toast({
          title: 'Intervalo Concluído',
          description: 'Retorno ao serviço registrado com sucesso.',
        });
        fetchRecords(); // Recarregar horas totais
      }
    });
  };

  const faturamentoEstimado = (monthTotal * (user?.hourlyRate || 0)).toFixed(2);

  return (
    <div className="p-4 space-y-6 pt-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-heading font-bold text-slate-100">Painel de Serviço</h2>
        <p className="text-xs text-slate-400">Tempo real e estimativa de ganhos</p>
      </div>

      {/* Active Session Card */}
      <div className={`rounded-3xl border p-6 relative overflow-hidden transition-all duration-500 ease-out ${
        activeRecord 
        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
        : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2 mb-2">
            {activeRecord ? (
              <>
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Sessão Ativa</span>
              </>
            ) : (
              <>
                <div className="size-2 rounded-full bg-slate-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Aguardando Serviço</span>
              </>
            )}
          </div>
          
          <div className={`text-5xl font-mono tracking-tighter mix-blend-screen transition-colors duration-500 ${
            activeRecord ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'text-slate-700'
          }`}>
            {elapsed}
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center gap-2 mt-4">
             {activeRecord ? (
                <>
                  <Activity className="size-3.5 text-emerald-500" />
                  Iniciada às {new Date(activeRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </>
             ) : (
                'Inicie um registro em um Quiosque para começar'
             )}
          </div>
        </div>
      </div>

      {/* Rest Break Card (Self-Service) */}
      {user?.allowBreak && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-950/5 p-5 flex flex-col items-center text-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.02)]">
          <h3 className="text-sm font-semibold text-amber-400 font-heading flex items-center gap-1.5">
            <Coffee className="size-4 text-amber-400" />
            Intervalo de Café (10 min)
          </h3>
          
          {/* Case 0: No active record (Not clocked in yet) */}
          {!activeRecord && (
            <>
              <p className="text-[11px] text-slate-450 leading-normal max-w-xs">
                O intervalo só pode ser iniciado após você registrar sua entrada em um quiosque.
              </p>
              <button
                disabled
                className="w-full mt-2 flex items-center justify-center gap-2 h-11 bg-slate-800 text-slate-500 font-semibold rounded-2xl cursor-not-allowed"
              >
                Aguardando Início do Expediente
              </button>
            </>
          )}

          {/* Case 1: Clocked in, but break has not started yet */}
          {activeRecord && !activeRecord.breakStart && (
            <>
              {(() => {
                const breakStartStr = breakWindow.start;
                const breakEndStr = breakWindow.end;
                
                return (
                  <p className="text-[11px] text-slate-400 leading-normal max-w-xs">
                    Disponível das {breakStartStr} às {breakEndStr}. O tempo excedente a 10 min será descontado das horas totais trabalhadas.
                  </p>
                );
              })()}
              {(() => {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                const breakStartStr = breakWindow.start;
                const breakEndStr = breakWindow.end;

                const [startH, startM] = breakStartStr.split(':').map(Number);
                const [endH, endM] = breakEndStr.split(':').map(Number);

                const breakStartMinutes = startH * 60 + startM;
                const breakEndMinutes = endH * 60 + endM;

                let isOutsideWindow = false;
                if (breakEndMinutes < breakStartMinutes) {
                  isOutsideWindow = currentMinutes < breakStartMinutes && currentMinutes > breakEndMinutes;
                } else {
                  isOutsideWindow = currentMinutes < breakStartMinutes || currentMinutes > breakEndMinutes;
                }
                
                if (isOutsideWindow) {
                  return (
                    <button
                      disabled
                      className="w-full mt-2 flex items-center justify-center gap-2 h-11 bg-slate-800 text-slate-500 font-semibold rounded-2xl cursor-not-allowed"
                    >
                      Ativo às {breakStartStr}
                    </button>
                  );
                } else {
                  // Active break button with flashing/blinking effect
                  return (
                    <button
                      disabled={gpsLoading}
                      onClick={handleStartBreak}
                      className="w-full mt-2 flex items-center justify-center gap-2 h-11 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer animate-pulse border-2 border-amber-300"
                    >
                      {gpsLoading ? (
                        <div className="size-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      ☕ Iniciar Intervalo (10 min)
                    </button>
                  );
                }
              })()}
            </>
          )}

          {/* Case 2: Break is active */}
          {activeRecord && activeRecord.breakStart && !activeRecord.breakEnd && (
            <>
              <div className="flex flex-col items-center justify-center my-1 w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 animate-pulse">
                  Intervalo em Andamento
                </span>
                <span className={`text-3xl font-mono mt-1 ${
                  breakElapsed.startsWith('-') ? 'text-rose-500 font-bold animate-pulse' : 'text-amber-300'
                }`}>
                  {breakElapsed}
                </span>
                {breakElapsed.startsWith('-') ? (
                  <span className="text-[10.5px] text-rose-450 mt-1 font-semibold">
                    ⚠️ Excedente: descontando do ponto
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 mt-1">Tempo regressivo restante</span>
                )}
              </div>
              <button
                disabled={gpsLoading}
                onClick={handleEndBreak}
                className="w-full mt-2 flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-2xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                {gpsLoading ? (
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Retornar do Intervalo
              </button>
            </>
          )}

          {/* Case 3: Break is completed */}
          {activeRecord && activeRecord.breakStart && activeRecord.breakEnd && (
            <div className="w-full py-2 px-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl mt-1">
              <p className="text-[11.5px] text-emerald-400 font-medium">
                ✅ Intervalo de hoje realizado
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Duração total: {(() => {
                  const duration = Math.max(0, new Date(activeRecord.breakEnd).getTime() - new Date(activeRecord.breakStart).getTime());
                  const mins = Math.floor(duration / 60000);
                  const secs = Math.floor((duration % 60000) / 1000);
                  return `${mins}m ${secs}s (Abonado: 10 min)`;
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botão de Ponto Mobile */}
      <div className="rounded-3xl border border-cyan-500/20 bg-cyan-950/5 p-5 flex flex-col items-center text-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.02)]">
        <h3 className="text-sm font-semibold text-cyan-400 font-heading">Registro de Atividades Mobile</h3>
        <p className="text-[11px] text-slate-400 max-w-xs leading-normal">
          Abra a câmera do seu celular para registrar sua entrada ou saída via selfie biométrica rápida.
        </p>
        <button
          onClick={() => navigate('/meu-ponto')}
          className="w-full mt-2 flex items-center justify-center gap-2 h-11 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium rounded-2xl shadow-lg shadow-emerald-950/30 transition-all active:scale-[0.98]"
        >
          <PlayCircle className="size-4" />
          Registrar Horas por este Celular
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="hud-card p-4 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-cyan-450">
            <Clock className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas no Mês</span>
          </div>
          <div className="text-2xl font-semibold text-slate-200">
            {monthTotal.toFixed(1)}<span className="text-sm text-slate-500 ml-1">hrs</span>
          </div>
        </div>

        <div className="hud-card p-4 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-450">
            <DollarSign className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Faturamento Est.</span>
          </div>
          <div className="text-2xl font-semibold text-slate-200">
            <span className="text-sm text-slate-500 mr-1">R$</span>{faturamentoEstimado}
          </div>
        </div>
      </div>
      
      {/* Current Contract info */}
      <div className="mt-8 pt-6 border-t border-slate-800/50">
         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Dados do Contrato</h3>
         <div className="flex justify-between items-center text-sm bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400">Vlr. Hora de Serviço (R$)</span>
            <span className="text-emerald-450 font-bold">{user?.hourlyRate?.toFixed(2) || '0.00'}</span>
         </div>
      </div>

    </div>
  );
}
