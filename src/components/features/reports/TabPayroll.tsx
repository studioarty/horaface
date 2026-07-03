import React, { useMemo } from 'react';
import type { TimeRecord } from '@/types';
import { useProviderStore } from '@/stores/useProviderStore';
import { useShiftStore } from '@/stores/useShiftStore';
import { useTimeStore } from '@/stores/useTimeStore';
import { FileSpreadsheet, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TabPayrollProps {
    filteredRecords: TimeRecord[];
}

export function TabPayroll({ filteredRecords }: TabPayrollProps) {
    const providerStore = useProviderStore();
    const shiftStore = useShiftStore();
    const timeStore = useTimeStore();

    const handleResetAll = async () => {
        if (!window.confirm("Atenção! Isso irá apagar TODO o histórico de medição de TODOS os prestadores. Esta ação não pode ser desfeita. Continuar?")) return;
        const res = await timeStore.resetAll();
        if (res.success) {
            alert("Todo o histórico foi zerado com sucesso.");
            timeStore.reload();
        } else {
            alert("Erro ao zerar histórico: " + res.error);
        }
    };

    const handleResetProvider = async (providerId: string, providerName: string) => {
        if (!window.confirm(`Deseja realmente apagar o histórico de medição de ${providerName}?`)) return;
        const res = await timeStore.resetProvider(providerId);
        if (res.success) {
            alert(`Histórico de ${providerName} apagado.`);
            timeStore.reload();
        } else {
            alert("Erro ao zerar histórico: " + res.error);
        }
    };

    const payrollData = useMemo(() => {
        const map = new Map<string, any>();

        filteredRecords.forEach((rec) => {
            const prov = providerStore.providers.find((p) => p.id === rec.providerId);
            if (!prov) return;

            if (!map.has(rec.providerId)) {
                // Encontrar as horas diárias exigidas pelo Shift atrelado ao usuário
                const shiftId = prov.shiftIds?.[0] || prov.shiftId;
                const shift = shiftStore.shifts.find(s => s.id === shiftId);
                let dailyExpectedHours = 0;

                if (shift) {
                    const [sH, sM] = (shift.startTime || '00:00').split(':').map(Number);
                    const [eH, eM] = (shift.endTime || '00:00').split(':').map(Number);
                    let sTotal = sH + sM / 60;
                    let eTotal = eH + eM / 60;
                    if (eTotal < sTotal) eTotal += 24; // Virada de noite
                    dailyExpectedHours = eTotal - sTotal;
                }

                map.set(rec.providerId, {
                    providerId: rec.providerId,
                    providerName: prov.name,
                    shiftName: shift?.name || 'Sem Escala',
                    hourlyRate: prov.hourlyRate || 0,
                    totalRealHours: 0,
                    uniqueDaysWorked: new Set(),
                });
            }

            const data = map.get(rec.providerId);
            data.uniqueDaysWorked.add(rec.date);

            if (rec.checkOut) {
                const checkInDate = new Date(rec.checkIn);
                const dayOfWeek = checkInDate.getDay();
                // A regra de negócio exige que apenas Segunda (1) a Sexta (5) sejam somadas
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    let durationMs = new Date(rec.checkOut).getTime() - checkInDate.getTime();
                    if (rec.breakStart && rec.breakEnd) {
                        const breakMs = new Date(rec.breakEnd).getTime() - new Date(rec.breakStart).getTime();
                        const excessMs = Math.max(0, breakMs - 10 * 60000);
                        durationMs = Math.max(0, durationMs - excessMs);
                    }
                    const hours = durationMs / 3600000;
                    data.totalRealHours += hours;
                }
            }
        });

        return Array.from(map.values()).map(data => {
            const daysCount = data.uniqueDaysWorked.size;
            const finalPayment = data.totalRealHours * data.hourlyRate;

            return {
                ...data,
                daysCount,
                finalPayment
            };
        }).sort((a, b) => b.totalRealHours - a.totalRealHours);

    }, [filteredRecords, providerStore.providers, shiftStore.shifts]);

    return (
        <div className="space-y-6 mt-2">
            <div className="hud-card rounded-lg p-4 sm:p-5 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-heading text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                        <FileSpreadsheet className="size-5 text-blue-400" /> Relatório de Medição (Fechamento Mensal)
                    </h3>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-950/20 hidden sm:flex">
                            Visão Sintética
                        </Badge>
                        <button 
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                        >
                            <AlertTriangle className="size-3.5" />
                            Zerar Sistema
                        </button>
                    </div>
                </div>

                <div className="min-w-[800px]">
                    <table className="w-full text-left text-sm text-text-secondary">
                        <thead className="border-b border-border bg-elevated/50 text-xs uppercase text-text-muted">
                            <tr>
                                <th className="px-4 py-3 font-medium">Nome do Parceiro</th>
                                <th className="px-4 py-3 font-medium">Turno Base</th>
                                <th className="px-4 py-3 font-medium text-center">Dias Ativos</th>
                                <th className="px-4 py-3 font-medium text-center">Horas Totais (Decimal)</th>
                                <th className="px-4 py-3 font-medium text-center">Valor Oficial (/hr)</th>
                                <th className="px-4 py-3 font-medium text-right">Repasse Final Planejado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {payrollData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted italic">
                                        Nenhum fechamento aplicável no período selecionado.
                                    </td>
                                </tr>
                            ) : (
                                payrollData.map((row) => (
                                    <tr key={row.providerId} className="transition-colors hover:bg-elevated/30">

                                        <td className="px-4 py-3 font-medium text-text-primary">
                                            {row.providerName}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-xs">
                                                {row.shiftName}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-center text-slate-300">
                                            {row.daysCount} <span className="text-[10px] text-slate-500">Dias</span>
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-cyan-400 font-bold">{row.totalRealHours.toFixed(2)}h</span>
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-emerald-400">R$ {row.hourlyRate.toFixed(2)}</span>
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {row.hourlyRate === 0 ? (
                                                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">Sem Valor/Hora Definido</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono font-bold text-sm">
                                                        R$ {row.finalPayment.toFixed(2)}
                                                    </Badge>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResetProvider(row.providerId, row.providerName);
                                                    }}
                                                    title="Limpar Histórico"
                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors ml-2"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
