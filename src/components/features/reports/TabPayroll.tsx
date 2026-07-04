import React, { useMemo, useState } from 'react';
import type { TimeRecord } from '@/types';
import { useProviderStore } from '@/stores/useProviderStore';
import { useShiftStore } from '@/stores/useShiftStore';
import { useTimeStore } from '@/stores/useTimeStore';
import { FileSpreadsheet, AlertTriangle, Printer, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TabPayrollProps {
    filteredRecords: TimeRecord[];
    dateStart?: string;
    dateEnd?: string;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR');

export function TabPayroll({ filteredRecords, dateStart, dateEnd }: TabPayrollProps) {
    const providerStore = useProviderStore();
    const shiftStore = useShiftStore();
    const timeStore = useTimeStore();
    const [nfRow, setNfRow] = useState<any | null>(null);

    const handleResetAll = async () => {
        if (!window.confirm("Atenção! Isso irá apagar TODO o histórico de medição de TODOS os colaboradores. Esta ação não pode ser desfeita. Continuar?")) return;
        const res = await timeStore.resetAll();
        if (res.success) { alert("Todo o histórico foi zerado com sucesso."); timeStore.reload(); }
        else alert("Erro ao zerar histórico: " + res.error);
    };

    const handleResetProvider = async (providerId: string, providerName: string) => {
        if (!window.confirm(`Deseja realmente apagar o histórico de ${providerName}?`)) return;
        const res = await timeStore.resetProvider(providerId);
        if (res.success) { alert(`Histórico de ${providerName} apagado.`); timeStore.reload(); }
        else alert("Erro ao zerar histórico: " + res.error);
    };

    const payrollData = useMemo(() => {
        const map = new Map<string, any>();

        filteredRecords.forEach((rec) => {
            const prov = providerStore.providers.find((p) => p.id === rec.providerId);
            if (!prov) return;

            if (!map.has(rec.providerId)) {
                const shiftId = prov.shiftIds?.[0] || prov.shiftId;
                const shift = shiftStore.shifts.find(s => s.id === shiftId);
                let dailyExpectedHours = 0;
                if (shift) {
                    const [sH, sM] = (shift.startTime || '00:00').split(':').map(Number);
                    const [eH, eM] = (shift.endTime || '00:00').split(':').map(Number);
                    let sTotal = sH + sM / 60;
                    let eTotal = eH + eM / 60;
                    if (eTotal < sTotal) eTotal += 24;
                    dailyExpectedHours = eTotal - sTotal;
                }
                map.set(rec.providerId, {
                    providerId: rec.providerId,
                    providerName: prov.name,
                    shiftName: shift?.name || 'Sem Escala',
                    hourlyRate: prov.hourlyRate || 0,
                    totalRealHours: 0,
                    uniqueDaysWorked: new Set<string>(),
                    records: [] as TimeRecord[],
                });
            }

            const data = map.get(rec.providerId);
            data.uniqueDaysWorked.add(rec.date);
            data.records.push(rec);

            if (rec.checkOut) {
                const checkInDate = new Date(rec.checkIn);
                let durationMs = new Date(rec.checkOut).getTime() - checkInDate.getTime();
                if (rec.breakStart && rec.breakEnd) {
                    const breakMs = new Date(rec.breakEnd).getTime() - new Date(rec.breakStart).getTime();
                    const excessMs = Math.max(0, breakMs - 10 * 60000);
                    durationMs = Math.max(0, durationMs - excessMs);
                }
                data.totalRealHours += durationMs / 3600000;
            }
        });

        return Array.from(map.values()).map(data => ({
            ...data,
            daysCount: data.uniqueDaysWorked.size,
            finalPayment: data.totalRealHours * data.hourlyRate,
        })).sort((a, b) => b.totalRealHours - a.totalRealHours);
    }, [filteredRecords, providerStore.providers, shiftStore.shifts]);

    const grandTotal = payrollData.reduce((acc, r) => acc + r.finalPayment, 0);
    const grandHours = payrollData.reduce((acc, r) => acc + r.totalRealHours, 0);

    // ── Nota Fiscal print ──────────────────────────────────────────────
    const emitirNF = (row: any) => {
        const periodStr = dateStart && dateEnd
            ? `${fmtDate(dateStart)} a ${fmtDate(dateEnd)}`
            : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const recList = row.records
            .filter((r: TimeRecord) => r.checkOut)
            .map((r: TimeRecord) => {
                const dIn = new Date(r.checkIn);
                const dOut = new Date(r.checkOut!);
                const h = (dOut.getTime() - dIn.getTime()) / 3600000;
                return `<tr>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleDateString('pt-BR')}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dIn.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dOut.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${h.toFixed(2)}h</td>
                  ${row.hourlyRate > 0 ? `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;font-weight:600">${fmtBRL(h * row.hourlyRate)}</td>` : ''}
                </tr>`;
            }).join('');

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Nota de Serviço – ${row.providerName}</title>
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
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

  <div class="header">
    <div>
      <div class="logo">Hora<span>Face</span></div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Sistema de Marcação de Hora</div>
      <h1 style="margin-top:12px;font-size:18px">NOTA DE SERVIÇO</h1>
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
        <div class="value" style="font-size:18px">${row.providerName}</div>
      </div>
      <div class="info-item">
        <div class="label">Período de Apuração</div>
        <div class="value">${periodStr}</div>
      </div>
      <div class="info-item">
        <div class="label">Escala / Turno</div>
        <div class="value">${row.shiftName}</div>
      </div>
      <div class="info-item">
        <div class="label">Dias Trabalhados</div>
        <div class="value">${row.daysCount} dias</div>
      </div>
      <div class="info-item">
        <div class="label">Total de Horas</div>
        <div class="value">${row.totalRealHours.toFixed(2)}h</div>
      </div>
      ${row.hourlyRate > 0 ? `
      <div class="info-item">
        <div class="label">Taxa Horária</div>
        <div class="value">${fmtBRL(row.hourlyRate)}/h</div>
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
          ${row.hourlyRate > 0 ? '<th style="text-align:right">Valor</th>' : ''}
        </tr>
      </thead>
      <tbody>${recList || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af">Nenhum registro com saída registrada</td></tr>'}</tbody>
    </table>
  </div>

  ${row.hourlyRate > 0 ? `
  <div class="total-box">
    <div>
      <div class="label">Composição do Valor</div>
      <div style="font-size:13px;color:#374151;margin-top:4px">${row.totalRealHours.toFixed(2)}h × ${fmtBRL(row.hourlyRate)}/h</div>
    </div>
    <div>
      <div class="label" style="text-align:right">Valor Total a Receber</div>
      <div class="amount">${fmtBRL(row.finalPayment)}</div>
    </div>
  </div>` : `
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:13px;color:#92400e">
    ⚠️ Taxa horária não configurada para este colaborador. Configure em Colaboradores → editar.
  </div>`}

  <div class="footer">
    <div class="sign-area">Assinatura do Colaborador</div>
    <div class="sign-area">Assinatura do Responsável</div>
  </div>

  <div style="margin-top:32px;text-align:center;font-size:11px;color:#d1d5db;border-top:1px solid #e5e7eb;padding-top:16px">
    Documento gerado pelo Sistema HoraFace · ${new Date().toLocaleString('pt-BR')}
  </div>
</body>
</html>`;

        const w = window.open('', '_blank', 'width=900,height=700');
        if (w) { w.document.write(html); w.document.close(); }
    };

    return (
        <div className="space-y-6 mt-2">
            <div className="hud-card rounded-lg p-4 sm:p-5 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-heading text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                        <FileSpreadsheet className="size-5 text-blue-400" />
                        Relatório de Medição (Fechamento Mensal)
                    </h3>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/20 hidden sm:flex">
                            Visão Sintética
                        </Badge>
                        <button
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 transition-all"
                        >
                            <AlertTriangle className="size-3.5" />
                            Zerar Sistema
                        </button>
                    </div>
                </div>

                <div className="min-w-[780px]">
                    <table className="w-full text-left text-sm text-text-secondary">
                        <thead className="border-b border-border bg-elevated/50 text-xs uppercase text-text-muted">
                            <tr>
                                <th className="px-4 py-3 font-medium">Colaborador</th>
                                <th className="px-4 py-3 font-medium">Turno Base</th>
                                <th className="px-4 py-3 font-medium text-center">Dias</th>
                                <th className="px-4 py-3 font-medium text-center">Total Horas</th>
                                <th className="px-4 py-3 font-medium text-center">Valor/h</th>
                                <th className="px-4 py-3 font-medium text-right">Repasse Total</th>
                                <th className="px-4 py-3 font-medium text-center">Nota Fiscal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {payrollData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted italic">
                                        Nenhum fechamento aplicável no período selecionado.
                                    </td>
                                </tr>
                            ) : (
                                payrollData.map((row) => (
                                    <tr key={row.providerId} className="transition-colors hover:bg-elevated/30">
                                        <td className="px-4 py-3 font-semibold text-text-primary">
                                            {row.providerName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-xs">
                                                {row.shiftName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-300">
                                            {row.daysCount} <span className="text-[10px] text-slate-500">dias</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-cyan-400 font-bold">{row.totalRealHours.toFixed(2)}h</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {row.hourlyRate > 0
                                                ? <span className="font-mono text-emerald-400">{fmtBRL(row.hourlyRate)}</span>
                                                : <span className="text-slate-600 text-xs">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {row.hourlyRate === 0 ? (
                                                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-xs">Sem taxa</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono font-bold">
                                                        {fmtBRL(row.finalPayment)}
                                                    </Badge>
                                                )}
                                                <button
                                                    onClick={() => handleResetProvider(row.providerId, row.providerName)}
                                                    title="Limpar Histórico"
                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => emitirNF(row)}
                                                className="flex items-center gap-1.5 mx-auto px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-900/20 border border-cyan-700/30 rounded-lg hover:bg-cyan-900/40 transition-all"
                                            >
                                                <Printer className="size-3.5" />
                                                Emitir NF
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Totals row */}
                        {payrollData.length > 1 && (
                            <tfoot>
                                <tr className="border-t-2 border-border bg-elevated/30">
                                    <td className="px-4 py-3 font-bold text-text-primary" colSpan={3}>
                                        TOTAL GERAL
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono font-bold text-cyan-300">{grandHours.toFixed(2)}h</span>
                                    </td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-mono font-bold text-emerald-300 text-sm">{fmtBRL(grandTotal)}</span>
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
