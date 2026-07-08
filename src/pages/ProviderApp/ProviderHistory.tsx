import { useEffect, useState, useMemo } from 'react';
import { Calendar, Clock, FileText, BarChart3, TrendingUp, ChevronRight, Printer } from 'lucide-react';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';
import type { TimeRecord } from '@/types';
import ReceiptModal from '@/components/features/ReceiptModal';

type Tab = 'extrato' | 'resumo';

export default function ProviderHistory() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('extrato');
  const { user, fetchMyRecords } = useProviderAuthStore();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { records, holidays } = await fetchMyRecords();
        const now = new Date();
        const combined: any[] = [...records];
        const cutoffDate = new Date("2026-03-21T00:00:00").getTime();

        holidays.forEach(hol => {
          if (!hol.isRoutine) {
            const holDate = new Date(`${hol.targetDate}T12:00:00`);
            if (holDate.getTime() >= cutoffDate) {
              const dayOfWeek = holDate.getDay();
              const todayReset = new Date(); todayReset.setHours(0, 0, 0, 0);
              const holReset = new Date(`${hol.targetDate}T00:00:00`);
              const diffDays = Math.ceil((holReset.getTime() - todayReset.getTime()) / (1000 * 3600 * 24));
              if (dayOfWeek !== 0 && dayOfWeek !== 6 && diffDays <= 2) {
                const creditTime = new Date(`${hol.targetDate}T18:00:00`).getTime();
                const isCredited = now.getTime() >= creditTime;
                combined.push({
                  id: hol.id,
                  providerId: user?.id || '',
                  checkIn: `${hol.targetDate}T08:00:00`,
                  checkOut: isCredited ? `${hol.targetDate}T16:30:00` : null,
                  status: 'holiday',
                  date: hol.targetDate,
                  holidayName: hol.name,
                  isCredited,
                });
              }
            }
          }
        });

        combined.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
        setRecords(combined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
    const id = setInterval(fetchRecords, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Cálculos do mês atual ──────────────────────────────────────────────────
  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const monthRecords = useMemo(() => {
    const m = now.getMonth();
    const y = now.getFullYear();
    return records.filter(r => {
      const d = new Date((r as any).checkIn);
      return d.getMonth() === m && d.getFullYear() === y && (r as any).status !== 'holiday';
    });
  }, [records]);

  const totalHours = useMemo(() =>
    monthRecords.reduce((acc, r: any) => {
      if (!r.checkOut) return acc;
      return acc + (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000;
    }, 0), [monthRecords]);

  // Helper: data LOCAL (evita bug de virada de dia UTC)
  const localDateKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const totalDays = useMemo(() =>
    new Set(monthRecords.map((r: any) => localDateKey(r.checkIn))).size,
    [monthRecords]);

  const totalValue = totalHours * (user?.hourlyRate || 0);

  // Agrupa por dia LOCAL para o resumo mensal
  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    [...monthRecords].reverse().forEach((r: any) => {
      const day = localDateKey(r.checkIn);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    });
    return Array.from(map.entries()).reverse();
  }, [monthRecords]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const fmtDateKey = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // ── Emitir Base de Cálculo (igual ao Emitir NF do admin) ─────────────────
  const emitirBaseCalculo = () => {
    const hourlyRate = user?.hourlyRate || 0;
    const horasExibidas = Math.ceil(totalHours * 100) / 100;
    const totalPayment = Math.ceil(horasExibidas * hourlyRate * 100) / 100;
    const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const recList = [...monthRecords]
      .filter((r: any) => r.checkOut)
      .sort((a: any, b: any) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .map((r: any) => {
        const dIn = new Date(r.checkIn);
        const dOut = new Date(r.checkOut);
        const h = (dOut.getTime() - dIn.getTime()) / 3600000;
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleDateString('pt-BR')}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dOut.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${h.toFixed(2)}h</td>
          ${hourlyRate > 0 ? `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;font-weight:600">${fmtBRL(h * hourlyRate)}</td>` : ''}
        </tr>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Base de Cálculo – ${user?.name || 'Colaborador'}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#111; background:#fff; padding:40px; max-width:800px; margin:auto; }
    @media print { body { padding:20px; } .no-print { display:none!important; } }
    h1 { font-size:22px; font-weight:700; color:#111; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:16px; margin-bottom:24px; }
    .logo { font-size:28px; font-weight:900; letter-spacing:-1px; color:#059669; }
    .logo span { color:#111; }
    .meta { text-align:right; font-size:12px; color:#6b7280; }
    .section { margin-bottom:20px; }
    .section h2 { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:8px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .info-item { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; }
    .info-item .label { font-size:10px; text-transform:uppercase; color:#9ca3af; margin-bottom:2px; }
    .info-item .value { font-size:14px; font-weight:600; color:#111; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    thead tr { background:#f3f4f6; }
    thead th { padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; color:#6b7280; }
    .total-box { background:#f0fdf4; border:2px solid #059669; border-radius:10px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-top:20px; }
    .total-box .label { font-size:13px; color:#6b7280; }
    .total-box .amount { font-size:28px; font-weight:900; color:#059669; }
    .footer { margin-top:32px; display:flex; justify-content:space-between; align-items:flex-end; }
    .sign-area { border-top:1px solid #111; padding-top:8px; font-size:12px; color:#6b7280; min-width:200px; text-align:center; }
    .print-btn { background:#059669; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; margin-bottom:24px; }
    .print-btn:hover { background:#047857; }
    .share-btn { background:#0284c7; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; margin-bottom:24px; margin-left:8px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <button class="share-btn" onclick="if(navigator.share){navigator.share({title:'Base de Cálculo HoraFace',text:document.title,url:window.location.href})}else{alert('Use Imprimir para salvar como PDF')}">📤 Compartilhar</button>
  </div>

  <div class="header">
    <div>
      <div class="logo">Hora<span>Face</span></div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Sistema de Marcação de Hora</div>
      <h1 style="margin-top:12px;font-size:18px">BASE DE CÁLCULO – NOTA DE SERVIÇO</h1>
    </div>
    <div class="meta">
      <div>Emitida em: ${new Date().toLocaleDateString('pt-BR')}</div>
      <div style="margin-top:4px">Hora: ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>

  <div class="section">
    <h2>Dados do Colaborador</h2>
    <div class="info-grid">
      <div class="info-item" style="grid-column:1/-1">
        <div class="label">Nome do Colaborador</div>
        <div class="value" style="font-size:18px">${user?.name || 'Colaborador'}</div>
      </div>
      <div class="info-item">
        <div class="label">Período de Apuração</div>
        <div class="value">${monthLabel}</div>
      </div>
      <div class="info-item">
        <div class="label">Dias Trabalhados</div>
        <div class="value">${totalDays} dias</div>
      </div>
      <div class="info-item">
        <div class="label">Total de Horas</div>
        <div class="value">${horasExibidas.toFixed(2)}h</div>
      </div>
      ${hourlyRate > 0 ? `
      <div class="info-item">
        <div class="label">Taxa Horária</div>
        <div class="value">${fmtBRL(hourlyRate)}/h</div>
      </div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Registros de Marcação de Hora</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Entrada</th>
          <th>Saída</th>
          <th style="text-align:right">Horas</th>
          ${hourlyRate > 0 ? '<th style="text-align:right">Valor</th>' : ''}
        </tr>
      </thead>
      <tbody>${recList || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af">Nenhum registro com saída registrada</td></tr>'}</tbody>
    </table>
  </div>

  ${hourlyRate > 0 ? `
  <div class="total-box">
    <div>
      <div class="label">Composição do Valor</div>
      <div style="font-size:13px;color:#374151;margin-top:4px">${horasExibidas.toFixed(2)}h × ${fmtBRL(hourlyRate)}/h</div>
    </div>
    <div>
      <div class="label" style="text-align:right">Valor Total a Receber</div>
      <div class="amount">${fmtBRL(totalPayment)}</div>
    </div>
  </div>` : `
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px;color:#92400e">
    ⚠️ Taxa horária não configurada. Contate o responsável.
  </div>`}




  <div style="margin-top:32px;text-align:center;font-size:11px;color:#d1d5db;border-top:1px solid #e5e7eb;padding-top:16px">
    Documento gerado pelo Sistema HoraFace · ${new Date().toLocaleString('pt-BR')}
  </div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-[11px] text-slate-500">Carregando comprovantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pt-5 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-cyan-950/30 flex items-center justify-center border border-cyan-900/50">
          <FileText className="size-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">Comprovantes</h2>
          <p className="text-[11px] text-slate-400">Registros e resumo mensal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-800">
        {(['extrato', 'resumo'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-cyan-900/50 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'extrato' ? '📄 Meu Extrato' : '📊 Resumo do Mês'}
          </button>
        ))}
      </div>

      {/* ═══ ABA 1: EXTRATO INDIVIDUAL ═══════════════════════════════════════ */}
      {activeTab === 'extrato' && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
              <p className="text-sm text-slate-500">Nenhum serviço registrado ainda.</p>
            </div>
          ) : (
            records.map((r: any) => {
              const dIn = new Date(r.checkIn);
              const isHoliday = r.status === 'holiday';
              const validDay = dIn.getDay() !== 0 && dIn.getDay() !== 6;
              let hours = 0, val = 0;
              if (r.checkOut) {
                hours = isHoliday ? 8.5 : (new Date(r.checkOut).getTime() - dIn.getTime()) / 3600000;
                if (validDay) val = hours * (user?.hourlyRate || 0);
              }

              return (
                <div
                  key={r.id}
                  className={`rounded-xl border transition-all ${
                    isHoliday
                      ? 'bg-emerald-950/20 border-emerald-900/40'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    {/* Data + horário */}
                    <div className="flex gap-3 items-center">
                      <div className="flex flex-col items-center min-w-[36px]">
                        <span className={`text-[10px] uppercase font-bold ${isHoliday ? 'text-emerald-500' : 'text-slate-500'}`}>
                          {dIn.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                        <span className={`text-xl font-bold leading-none ${isHoliday ? 'text-emerald-300' : 'text-slate-100'}`}>
                          {dIn.getDate().toString().padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-slate-600">
                          {dIn.toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                      </div>

                      <div className={`h-10 w-px ${isHoliday ? 'bg-emerald-900/50' : 'bg-slate-800'}`} />

                      <div className="flex flex-col gap-1">
                        {isHoliday ? (
                          <span className={`text-xs font-bold ${r.isCredited ? 'text-emerald-400' : 'text-slate-400 opacity-60'}`}>
                            🌟 {r.holidayName}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 font-mono">
                              ↑ {fmt(r.checkIn)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/40 font-mono">
                              ↓ {r.checkOut ? fmt(r.checkOut) : '...'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <Clock className="size-3" />
                          {isHoliday && !r.isCredited
                            ? 'Aguardando 18:00'
                            : r.checkOut ? `${hours.toFixed(1)}h` : 'Em andamento'}
                        </div>
                      </div>
                    </div>

                    {/* Valor + Comprovante */}
                    <div className="flex flex-col items-end gap-2">
                      {r.checkOut ? (
                        validDay ? (
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            R$ {val.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-500 text-right max-w-16 leading-tight">
                            Fim de semana
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-cyan-400 animate-pulse">
                          {isHoliday ? 'À creditar' : '● Ativo'}
                        </span>
                      )}

                      {!isHoliday && (
                        <button
                          onClick={() => setSelectedRecordId(r.id)}
                          className="flex items-center gap-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          <FileText className="size-3" />
                          Comprovante
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ ABA 2: RESUMO DO MÊS ════════════════════════════════════════════ */}
      {activeTab === 'resumo' && (
        <div className="space-y-4">

          {/* Cards de totais */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-cyan-400" />
                <span className="text-[9px] uppercase text-slate-500 font-bold">Horas</span>
              </div>
              <span className="text-lg font-bold text-cyan-300 font-mono leading-none">
                {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3 text-emerald-400" />
                <span className="text-[9px] uppercase text-slate-500 font-bold">Dias</span>
              </div>
              <span className="text-lg font-bold text-emerald-300 font-mono leading-none">
                {totalDays}d
              </span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-3 text-amber-400" />
                <span className="text-[9px] uppercase text-slate-500 font-bold">Estimado</span>
              </div>
              <span className="text-base font-bold text-amber-300 font-mono leading-none">
                {user?.hourlyRate ? `R$${totalValue.toFixed(0)}` : '—'}
              </span>
            </div>
          </div>

          {/* Botão Emitir Base de Cálculo (Sempre visível) */}
          <button
            onClick={emitirBaseCalculo}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-300 font-semibold text-sm transition-all active:scale-95 shadow-sm"
          >
            <Printer className="size-4" />
            Emitir Base de Cálculo
          </button>

          {/* Período */}
          <div className="text-center">
            <span className="text-[11px] text-slate-500 capitalize">{monthLabel}</span>
          </div>

          {/* Lista compacta por dia */}
          {byDay.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
              <p className="text-sm text-slate-500">Nenhuma marcação este mês ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {byDay.map(([day, recs]) => {
                const dateObj = new Date(`${day}T12:00:00`);
                const dayHours = recs.reduce((acc: number, r: any) => {
                  if (!r.checkOut) return acc;
                  return acc + (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000;
                }, 0);

                return (
                  <div key={day} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">
                          {(() => { const [y,m,d] = day.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('pt-BR',{weekday:'short'}); })()}
                        </span>
                        <span className="text-sm font-bold text-slate-200">
                          {fmtDateKey(day)}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">
                        {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '—'}
                      </span>
                    </div>

                    {/* Marcações do dia */}
                    <div className="space-y-1.5">
                      {recs.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 font-mono">
                              ↑ {fmt(r.checkIn)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/30 font-mono">
                              ↓ {r.checkOut ? fmt(r.checkOut) : '...'}
                            </span>
                          </div>
                          <button
                            onClick={() => { setSelectedRecordId(r.id); setActiveTab('extrato'); }}
                            className="text-[9px] text-slate-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors"
                          >
                            ver <ChevronRight className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Modal de comprovante */}
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
