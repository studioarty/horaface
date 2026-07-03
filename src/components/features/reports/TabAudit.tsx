import React, { useState } from 'react';
import type { TimeRecord } from '@/types';
import { useProviderStore } from '@/stores/useProviderStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, ImageOff, Maximize2, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeStore } from '@/stores/useTimeStore';
import { useToast } from '@/hooks/use-toast';

interface TabAuditProps {
    filteredRecords: TimeRecord[];
}

export function TabAudit({ filteredRecords }: TabAuditProps) {
    const providerStore = useProviderStore();
    const timeStore = useTimeStore();
    const { toast } = useToast();
    const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    React.useEffect(() => {
        setSelectedIds(new Set());
    }, [filteredRecords]);

    const handleSelectToggle = (recordId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(recordId)) {
                next.delete(recordId);
            } else {
                next.add(recordId);
            }
            return next;
        });
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.size === filteredRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecords.map(r => r.id)));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Tem certeza que deseja apagar permanentemente os ${selectedIds.size} registros selecionados?`)) return;
        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        const promises = Array.from(selectedIds).map(async (id) => {
            try {
                const res = await timeStore.deleteRecord(id);
                if (res.success) {
                    successCount++;
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        });

        await Promise.all(promises);
        setIsProcessing(false);

        if (failCount === 0) {
            toast({ title: "Registros apagados", description: `Todos os ${successCount} registros foram removidos com sucesso.` });
        } else {
            toast({
                variant: "destructive",
                title: "Exclusão parcial",
                description: `${successCount} registros apagados, ${failCount} falharam.`
            });
        }
    };

    const handleBatchUndoCheckOut = async () => {
        const recordsToReopen = filteredRecords.filter(r => selectedIds.has(r.id) && !!r.checkOut);
        if (recordsToReopen.length === 0) {
            toast({ variant: "destructive", title: "Ação Inválida", description: "Nenhum dos registros selecionados possui Saída (check-out) registrada." });
            return;
        }

        if (!window.confirm(`Deseja realmente remover apenas a Saída (check-out) dos ${recordsToReopen.length} registros e reabri-los?`)) return;
        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        const promises = recordsToReopen.map(async (r) => {
            try {
                const res = await timeStore.undoCheckOut(r.id);
                if (res.success) {
                    successCount++;
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(r.id);
                        return next;
                    });
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        });

        await Promise.all(promises);
        setIsProcessing(false);

        if (failCount === 0) {
            toast({ title: "Saídas removidas", description: `${successCount} medições foram reabertas com sucesso.` });
        } else {
            toast({
                variant: "destructive",
                title: "Reabertura parcial",
                description: `${successCount} reabertas, ${failCount} falharam.`
            });
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!window.confirm("Tem certeza que deseja apagar permanentemente esta medição?")) return;
        setIsProcessing(true);
        try {
            const res = await timeStore.deleteRecord(recordId);
            if (res.success) {
                toast({ title: "Medição apagada", description: "O registro de horas foi removido com sucesso." });
            } else {
                toast({ variant: "destructive", title: "Erro ao apagar", description: res.error || "Tente novamente." });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro", description: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUndoCheckOut = async (recordId: string) => {
        if (!window.confirm("Deseja realmente remover apenas a Saída (check-out) deste registro e reabrir a medição?")) return;
        setIsProcessing(true);
        try {
            const res = await timeStore.undoCheckOut(recordId);
            if (res.success) {
                toast({ title: "Saída removida", description: "A medição foi reaberta com sucesso." });
            } else {
                toast({ variant: "destructive", title: "Erro ao reabrir", description: res.error || "Tente novamente." });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro", description: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 mt-2">
            {selectedIds.size > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-lg animate-fade-in">
                    <span className="text-xs sm:text-sm text-emerald-400 font-medium font-mono">
                        {selectedIds.size} {selectedIds.size === 1 ? 'registro selecionado' : 'registros selecionados'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            disabled={isProcessing}
                            onClick={handleBatchUndoCheckOut}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors text-xs font-semibold"
                        >
                            <RotateCcw className="size-3.5" />
                            <span>Reabrir Selecionados</span>
                        </button>
                        <button
                            disabled={isProcessing}
                            onClick={handleBatchDelete}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors text-xs font-semibold"
                        >
                            <Trash2 className="size-3.5" />
                            <span>Apagar Selecionados</span>
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-semibold"
                        >
                            <span>Cancelar</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="hud-card rounded-lg p-4 sm:p-5 overflow-x-auto">
                <h3 className="mb-4 font-heading text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
                    <Camera className="size-5 text-rose-400" /> Auditoria Fotográfica Avançada
                </h3>

                <div className="min-w-[800px]">
                    <table className="w-full text-left text-sm text-text-secondary">
                        <thead className="border-b border-border bg-elevated/50 text-xs uppercase text-text-muted">
                            <tr>
                                <th className="px-4 py-3 font-medium w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0} 
                                        onChange={handleSelectAllToggle}
                                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 size-4 cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium">Biómetria (Foto)</th>
                                <th className="px-4 py-3 font-medium">Prestador Registrado</th>
                                <th className="px-4 py-3 font-medium">Data / Hora</th>
                                <th className="px-4 py-3 font-medium">Tipo Ação</th>
                                <th className="px-4 py-3 font-medium">Status do Log</th>
                                <th className="px-4 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted italic">
                                        Nenhum registro encontrado neste período.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => {
                                    const provider = providerStore.providers.find((p) => p.id === record.providerId);
                                    const isCheckin = record.status === 'active' || !!record.checkOut; // Todo log inicia com check-in
                                    const photos = record.photoUrl ? record.photoUrl.split('|') : [];
                                    const checkInPhoto = photos[0] || null;
                                    const checkOutPhoto = photos[1] || null;
                                    const locations = record.location ? record.location.split('|') : [];
                                    const checkInLoc = locations[0] || null;
                                    const checkOutLoc = locations[1] || null;

                                     return (
                                        <tr key={record.id} className="transition-colors hover:bg-elevated/30">
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.has(record.id)} 
                                                    onChange={() => handleSelectToggle(record.id)}
                                                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 size-4 cursor-pointer"
                                                />
                                            </td>

                                            {/* Célula 1: Foto */}
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {checkInPhoto ? (
                                                        <div className="flex flex-col items-center">
                                                            <div
                                                                className="relative size-12 sm:size-14 rounded-md border-2 border-slate-700/50 overflow-hidden group cursor-pointer"
                                                                onClick={() => setZoomedPhoto(checkInPhoto)}
                                                                title="Clique para Ampliar a Foto de Entrada"
                                                            >
                                                                <img src={checkInPhoto} alt="Entrada" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Maximize2 className="size-4 text-white" />
                                                                </div>
                                                            </div>
                                                            {checkOutPhoto && <span className="text-[9px] text-emerald-400 mt-0.5 font-mono font-semibold uppercase">Entrada</span>}
                                                        </div>
                                                    ) : (
                                                        <div className="size-12 sm:size-14 rounded-md border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center">
                                                            <ImageOff className="size-4 text-slate-600 mb-1" />
                                                            <span className="text-[8px] text-slate-500 font-mono uppercase">Sem Foto</span>
                                                        </div>
                                                    )}

                                                    {checkOutPhoto && (
                                                        <div className="flex flex-col items-center">
                                                            <div
                                                                className="relative size-12 sm:size-14 rounded-md border-2 border-slate-700/50 overflow-hidden group cursor-pointer"
                                                                onClick={() => setZoomedPhoto(checkOutPhoto)}
                                                                title="Clique para Ampliar a Foto de Saída"
                                                            >
                                                                <img src={checkOutPhoto} alt="Saída" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Maximize2 className="size-4 text-white" />
                                                                </div>
                                                            </div>
                                                            <span className="text-[9px] text-orange-400 mt-0.5 font-mono font-semibold uppercase">Saída</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Célula 2: Nome Cadastrado no Banco */}
                                            <td className="px-4 py-3 font-medium text-text-primary">
                                                <div>{provider?.name || 'Desconhecido'}</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {checkInLoc && (
                                                        <a 
                                                            href={checkInLoc.includes(',') ? `https://www.google.com/maps?q=${checkInLoc}` : undefined}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1 text-[10px] text-cyan-400 font-mono ${checkInLoc.includes(',') ? 'hover:text-cyan-300 hover:underline' : ''}`}
                                                        >
                                                            📍 {checkInLoc.includes(',') ? `Entrada: ${checkInLoc} (Ver Mapa)` : `Entrada: ${checkInLoc}`}
                                                        </a>
                                                    )}
                                                    {checkOutLoc && (
                                                        <a 
                                                            href={checkOutLoc.includes(',') ? `https://www.google.com/maps?q=${checkOutLoc}` : undefined}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1 text-[10px] text-orange-400 font-mono ${checkOutLoc.includes(',') ? 'hover:text-orange-300 hover:underline' : ''}`}
                                                        >
                                                            📍 {checkOutLoc.includes(',') ? `Saída: ${checkOutLoc} (Ver Mapa)` : `Saída: ${checkOutLoc}`}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Célula 3: Data e Hora da Batida */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-300">
                                                        {format(new Date(record.checkIn), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                    </span>
                                                    <span className="font-mono text-cyan-400 text-xs">
                                                        {format(new Date(record.checkIn), "HH:mm:ss")}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Célula 4: Ação */}
                                            <td className="px-4 py-3">
                                                {record.status === 'irregular' ? (
                                                    <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">Tentativa Bloqueada (Fora de Turno)</Badge>
                                                ) : (
                                                    <>
                                                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Entrada Confirmada</Badge>
                                                        {record.checkOut && (
                                                            <div className="mt-1">
                                                                <span className="text-[10px] text-slate-500 font-mono block mb-1 break-all mr-2">➜</span>
                                                                <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10">Saída ({format(new Date(record.checkOut), "HH:mm")})</Badge>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>

                                             {/* Célula 5: Status Lógico */}
                                             <td className="px-4 py-3">
                                                 {record.status === 'completed' ? (
                                                     <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 px-2 py-0 text-[10px]">Turno Fechado</Badge>
                                                 ) : record.status === 'active' ? (
                                                     <Badge className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/20 px-2 py-0 text-[10px]">Em Andamento</Badge>
                                                 ) : (
                                                     <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-2 py-0 text-[10px]">Fora de Horário</Badge>
                                                 )}
                                             </td>

                                             {/* Célula 6: Ações */}
                                             <td className="px-4 py-3 text-right">
                                                 <div className="flex justify-end gap-2">
                                                     {record.checkOut && (
                                                         <button
                                                             disabled={isProcessing}
                                                             onClick={() => handleUndoCheckOut(record.id)}
                                                             className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-cyan-500/25 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 disabled:opacity-50 transition-colors text-[11px] font-medium"
                                                             title="Remover Saída (Reabrir Medição)"
                                                         >
                                                             <RotateCcw className="size-3" />
                                                             <span>Reabrir</span>
                                                         </button>
                                                     )}
                                                     <button
                                                         disabled={isProcessing}
                                                         onClick={() => handleDeleteRecord(record.id)}
                                                         className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/25 bg-red-500/5 text-red-400 hover:bg-red-500/15 disabled:opacity-50 transition-colors text-[11px] font-medium"
                                                         title="Excluir Medição por Completo"
                                                     >
                                                         <Trash2 className="size-3" />
                                                         <span>Apagar</span>
                                                     </button>
                                                 </div>
                                             </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Fotográfico Full-screen */}
            <Dialog open={!!zoomedPhoto} onOpenChange={() => setZoomedPhoto(null)}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-slate-800 bg-black/95">
                    {zoomedPhoto && (
                        <div className="relative w-full flex flex-col items-center">
                            <div className="w-full bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Camera className="size-4 text-rose-500" />
                                    Registro Liveness (Câmera do Dispositivo)
                                </span>
                            </div>
                            <img src={zoomedPhoto} alt="Auditoria Ampliada" className="w-full max-h-[70vh] object-contain rounded-b-md" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
