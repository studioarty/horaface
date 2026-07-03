import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, X, Printer, FileText } from 'lucide-react';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';
import type { TimeRecord } from '@/types';
import ReceiptModal from '@/components/features/ReceiptModal';

export default function ProviderHistory() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const { user, fetchMyRecords } = useProviderAuthStore();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { records, holidays } = await fetchMyRecords();
        
        // Build unified list injecting holidays as pseudo-records
        const now = new Date();
        const combined: any[] = [...records];
        const cutoffDate = new Date("2026-03-21T00:00:00").getTime();
        
        holidays.forEach(hol => {
          if (!hol.isRoutine) {
            const holDate = new Date(`${hol.targetDate}T12:00:00`);
            
            // Ignorar feriados antigos antes do lançamento do sistema (22/03/2026)
            if (holDate.getTime() >= cutoffDate) {
              const dayOfWeek = holDate.getDay();
              
              // Calculo para exibir apenas 2 dias antes
              const todayReset = new Date();
              todayReset.setHours(0, 0, 0, 0);
              const holReset = new Date(`${hol.targetDate}T00:00:00`);
              const diffDays = Math.ceil((holReset.getTime() - todayReset.getTime()) / (1000 * 3600 * 24));

              // Apenas injeta feriados em dia útil E se ja passamos ou estamos ate 2 dias antes
              if (dayOfWeek !== 0 && dayOfWeek !== 6 && diffDays <= 2) {
                 const creditTime = new Date(`${hol.targetDate}T18:00:00`).getTime();
                 const isCredited = now.getTime() >= creditTime;
                 
                 combined.push({
                   id: hol.id,
                   providerId: user?.id || '',
                   checkIn: `${hol.targetDate}T08:00:00`,
                   checkOut: isCredited ? `${hol.targetDate}T16:30:00` : null, // Se não creditou, simula "em andamento"
                   status: 'holiday',
                   date: hol.targetDate,
                   holidayName: hol.name,
                   isCredited: isCredited
                 });
              }
            }
          }
        });

        // Ordenar por data decrescente
        combined.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
        
        setRecords(combined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchRecords();
    
    // Auto-refresh every 15 seconds
    const intervalId = setInterval(() => {
      fetchRecords();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-500 mt-10">Carregando extrato...</div>;
  }

  return (
    <div className="p-4 space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-cyan-950/30 flex items-center justify-center border border-cyan-900/50">
           <Calendar className="size-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">Meu Extrato</h2>
          <p className="text-[11px] text-slate-400">Histórico de sessões registradas</p>
        </div>
      </div>

      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            <p className="text-sm text-slate-500">Nenhum serviço registrado ainda.</p>
          </div>
        ) : (
          records.map((r: any) => {
            const dIn = new Date(r.checkIn);
            let hours = 0;
            let val = 0;
            const validDay = dIn.getDay() !== 0 && dIn.getDay() !== 6;
            const isHoliday = r.status === 'holiday';

            if (r.checkOut) {
              hours = isHoliday ? 8.5 : (new Date(r.checkOut).getTime() - dIn.getTime()) / 3600000;
              if (validDay) val = hours * (user?.hourlyRate || 0);
            }

            return (
              <div key={r.id} className={`hud-card p-4 rounded-xl flex items-center justify-between border-slate-800 ${isHoliday ? 'bg-emerald-950/20 border-emerald-900/50' : ''}`}>
                <div className="flex gap-4 items-center">
                   <div className="flex flex-col items-center justify-center">
                     <span className={`text-[10px] uppercase font-bold ${isHoliday ? 'text-emerald-500' : 'text-slate-500'}`}>
                       {dIn.toLocaleDateString('pt-BR', { weekday: 'short' })}
                     </span>
                     <span className={`text-lg font-bold tracking-tighter leading-none ${isHoliday ? 'text-emerald-300' : 'text-slate-200'}`}>
                       {dIn.getDate().toString().padStart(2, '0')}
                     </span>
                   </div>
                   
                   <div className={`h-8 w-px ${isHoliday ? 'bg-emerald-900/50' : 'bg-slate-800'}`} />
                   
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                       {isHoliday ? (
                         <span className={`text-xs font-bold ${r.isCredited ? 'text-emerald-400' : 'text-slate-400 opacity-70'}`}>
                           🌟 {r.holidayName}
                         </span>
                       ) : (
                         <span className="text-xs text-slate-300">
                           {dIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                           {' - '} 
                           {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : 'Em andamento'}
                         </span>
                       )}
                     </div>
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <Clock className={`size-3 ${isHoliday && r.isCredited ? 'text-emerald-500' : ''}`} />
                        {isHoliday && !r.isCredited ? 'Aguardando 18:00' : (r.checkOut ? `${hours.toFixed(2)} hrs totais` : '--')}
                     </div>
                   </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                   {r.checkOut ? (
                     validDay ? (
                       <span className="text-sm font-bold text-emerald-400 tracking-tight">R$ {val.toFixed(2)}</span>
                     ) : (
                       <span className="text-[10px] max-w-20 text-right text-amber-500 leading-tight">Final de semana não conta R$</span>
                     )
                   ) : (
                     <span className="text-xs font-bold text-cyan-400 animate-pulse">
                       {isHoliday ? 'À creditar' : 'Ativo'}
                     </span>
                   )}
                   
                   {!isHoliday && (
                     <button
                       onClick={() => setSelectedRecordId(r.id)}
                       className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded-md mt-1.5 transition-all active:scale-[0.98]"
                     >
                       📄 Recibo
                     </button>
                   )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedRecordId && (
        <ReceiptModal
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
          records={records}
        />
      )}
    </div>
  );
}
