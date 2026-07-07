import React, { useState } from 'react';
import type { TimeRecord } from '@/types';
import { useProviderStore } from '@/stores/useProviderStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Camera, ImageOff, Maximize2, RotateCcw, Trash2,
  LogIn, LogOut, MapPin, Clock, AlertTriangle, CheckCircle2, Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeStore } from '@/stores/useTimeStore';
import { useToast } from '@/hooks/use-toast';

interface TabAuditProps {
  filteredRecords: TimeRecord[];
}

// Helper: extrai fotos do campo photo_url separado por pipe
function parsePhotos(photoUrl?: string): { entry: string | null; exit: string | null } {
  if (!photoUrl) return { entry: null, exit: null };

  const isValidImg = (s: string) =>
    !!s && (s.startsWith('data:image') || s.startsWith('http'));

  // Caso 1: sem pipe → só foto de entrada
  if (!photoUrl.includes('|')) {
    return { entry: isValidImg(photoUrl) ? photoUrl : null, exit: null };
  }

  // Caso 2: tem pipe → split em exatamente 2 partes (pode ter pipes no meio do base64? Não — base64 não usa |)
  const pipeIdx = photoUrl.indexOf('|');
  const left = photoUrl.substring(0, pipeIdx);   // antes do pipe = entrada
  const right = photoUrl.substring(pipeIdx + 1); // depois do pipe = saída

  return {
    entry: isValidImg(left) ? left : null,
    exit: isValidImg(right) ? right : null,
  };
}

// Helper: extrai localizações do campo location separado por pipe
function parseLocations(location?: string): { entry: string | null; exit: string | null } {
  if (!location) return { entry: null, exit: null };
  const parts = location.split('|');
  return {
    entry: parts[0] || null,
    exit: parts.length > 1 ? parts[1] : null,
  };
}

// Helper: calcula horas trabalhadas
function calcHours(checkIn: string, checkOut: string | null): string {
  if (!checkOut) return '—';
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (ms < 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

// Componente de célula de foto
function PhotoCell({
  photoSrc,
  label,
  labelColor,
  onClick,
}: {
  photoSrc: string | null;
  label: string;
  labelColor: string;
  onClick: (src: string) => void;
}) {
  if (!photoSrc) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="size-14 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center">
          <ImageOff className="size-4 text-slate-700 mb-0.5" />
          <span className="text-[8px] text-slate-600 font-mono uppercase">Sem foto</span>
        </div>
        <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${labelColor}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative size-14 rounded-xl border-2 border-slate-700/60 overflow-hidden group cursor-pointer hover:border-slate-500 transition-all shadow-md"
        onClick={() => onClick(photoSrc)}
        title={`Clique para ampliar — ${label}`}
      >
        <img
          src={photoSrc}
          alt={label}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="size-4 text-white drop-shadow" />
        </div>
      </div>
      <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${labelColor}`}>{label}</span>
    </div>
  );
}

// Componente de célula de localização
function LocationCell({ loc, label, color }: { loc: string | null; label: string; color: string }) {
  if (!loc) return <span className="text-[10px] text-slate-700 font-mono italic">—</span>;

  const isCoords = loc.includes(',') && /^-?\d+\.\d+,-?\d+\.\d+/.test(loc.trim());
  const isLabel = !isCoords;
  const mapsUrl = isCoords ? `https://www.google.com/maps?q=${loc.trim()}` : null;
  const display = isCoords ? loc.trim().split(',').map(n => parseFloat(n).toFixed(4)).join(', ') : loc;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-[9px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 hover:underline font-mono transition-colors">
          <MapPin className="size-2.5 shrink-0" />
          {display}
        </a>
      ) : (
        <span className={`text-[10px] font-mono ${isLabel ? 'text-amber-400' : 'text-slate-400'} flex items-center gap-1`}>
          <MapPin className="size-2.5 shrink-0" /> {display}
        </span>
      )}
    </div>
  );
}

export function TabAudit({ filteredRecords }: TabAuditProps) {
  const providerStore = useProviderStore();
  const timeStore = useTimeStore();
  const { toast } = useToast();
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [zoomedLabel, setZoomedLabel] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [filteredRecords]);

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredRecords.length
      ? new Set()
      : new Set(filteredRecords.map(r => r.id)));
  };

  const openPhoto = (src: string, label: string) => {
    setZoomedPhoto(src);
    setZoomedLabel(label);
  };

  const handleBatchReopen = async () => {
    const toReopen = filteredRecords.filter(r => selectedIds.has(r.id) && !!r.checkOut);
    if (toReopen.length === 0) {
      toast({ variant: 'destructive', title: 'Ação Inválida', description: 'Nenhum dos selecionados tem Saída registrada.' });
      return;
    }
    if (!window.confirm(`Reabrir ${toReopen.length} registros removendo a Saída?`)) return;
    setIsProcessing(true);
    let ok = 0, fail = 0;
    await Promise.all(toReopen.map(async r => {
      const res = await timeStore.undoCheckOut(r.id).catch(() => ({ success: false }));
      res.success ? ok++ : fail++;
    }));
    setIsProcessing(false);
    setSelectedIds(new Set());
    toast({ title: fail === 0 ? 'Saídas removidas' : 'Reabertura parcial', description: `${ok} reabertos${fail ? `, ${fail} falharam.` : '.'}` });
  };

  const handleReopen = async (id: string) => {
    if (!window.confirm('Remover a Saída e reabrir esta medição?')) return;
    setIsProcessing(true);
    const res = await timeStore.undoCheckOut(id).catch(() => ({ success: false, error: 'Erro inesperado' }));
    setIsProcessing(false);
    if (res.success) {
      toast({ title: 'Medição reaberta', description: 'Saída removida com sucesso.' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: (res as any).error || 'Tente novamente.' });
    }
  };

  return (
    <div className="space-y-4 mt-2">
      {/* Barra de ações em lote */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 animate-in slide-in-from-top-2 duration-300">
          <span className="text-sm text-emerald-400 font-semibold font-mono">
            {selectedIds.size} {selectedIds.size === 1 ? 'registro selecionado' : 'registros selecionados'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button disabled={isProcessing} onClick={handleBatchReopen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors text-xs font-semibold">
              <RotateCcw className="size-3.5" /> Reabrir Selecionados
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela principal */}
      <div className="hud-card rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
            <Camera className="size-5 text-rose-400" />
            Auditoria Fotográfica — Marcação de Horas
          </h3>
          <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="pb-3 pr-3 w-8">
                  <input type="checkbox"
                    checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 size-4 cursor-pointer"
                  />
                </th>
                <th className="pb-3 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Colaborador</th>
                <th className="pb-3 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>

                {/* Coluna ENTRADA */}
                <th className="pb-3 px-3 text-center text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <LogIn className="size-3.5" /> Entrada
                  </div>
                </th>

                {/* Coluna SAÍDA */}
                <th className="pb-3 px-3 text-center text-xs font-semibold text-orange-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <LogOut className="size-3.5" /> Saída
                  </div>
                </th>

                <th className="pb-3 px-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <Timer className="size-3.5" /> Total
                  </div>
                </th>

                <th className="pb-3 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="pb-3 px-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 italic text-sm">
                    Nenhum registro encontrado neste período.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const provider = providerStore.providers.find(p => p.id === record.providerId);
                  const { entry: entryPhoto, exit: exitPhoto } = parsePhotos(record.photoUrl);
                  const { entry: entryLoc, exit: exitLoc } = parseLocations(record.location);
                  const hoursWorked = calcHours(record.checkIn, record.checkOut ?? null);
                  const isIrregular = record.status === 'irregular';
                  const isActive = record.status === 'active';

                  return (
                    <tr key={record.id}
                      className={`transition-colors hover:bg-slate-900/40 ${selectedIds.has(record.id) ? 'bg-emerald-950/20' : ''}`}>

                      {/* Checkbox */}
                      <td className="py-4 pr-3">
                        <input type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => handleSelectToggle(record.id)}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 size-4 cursor-pointer"
                        />
                      </td>

                      {/* Colaborador */}
                      <td className="py-4 px-3">
                        <div className="font-semibold text-slate-200 text-sm">{provider?.name || 'Desconhecido'}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[140px]">{record.providerId}</div>
                      </td>

                      {/* Data */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-300 text-xs">
                            {format(new Date(record.checkIn), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            {format(new Date(record.checkIn), 'yyyy')}
                          </span>
                        </div>
                      </td>

                      {/* COLUNA ENTRADA */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col items-center gap-2">
                          <PhotoCell
                            photoSrc={entryPhoto}
                            label="Entrada"
                            labelColor="text-emerald-400"
                            onClick={src => openPhoto(src, `Entrada — ${provider?.name || 'Colaborador'}`)}
                          />
                          <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
                            <Clock className="size-2.5" />
                            {format(new Date(record.checkIn), 'HH:mm:ss')}
                          </div>
                          <LocationCell loc={entryLoc} label="GPS Entrada" color="text-emerald-500" />
                        </div>
                      </td>

                      {/* COLUNA SAÍDA */}
                      <td className="py-4 px-3">
                        {record.checkOut ? (
                          <div className="flex flex-col items-center gap-2">
                            <PhotoCell
                              photoSrc={exitPhoto}
                              label="Saída"
                              labelColor="text-orange-400"
                              onClick={src => openPhoto(src, `Saída — ${provider?.name || 'Colaborador'}`)}
                            />
                            <div className="flex items-center gap-1 text-[10px] text-orange-300 font-mono bg-orange-950/30 px-2 py-0.5 rounded-full border border-orange-900/50">
                              <Clock className="size-2.5" />
                              {format(new Date(record.checkOut), 'HH:mm:ss')}
                            </div>
                            <LocationCell loc={exitLoc} label="GPS Saída" color="text-orange-500" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 opacity-40">
                            <div className="size-14 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/20 flex items-center justify-center">
                              <LogOut className="size-4 text-slate-700" />
                            </div>
                            <span className="text-[9px] text-slate-600 font-mono uppercase">
                              {isActive ? 'Em andamento' : 'Sem saída'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Total de horas */}
                      <td className="py-4 px-3 text-center">
                        <span className={`font-mono text-sm font-bold ${hoursWorked === '—' ? 'text-slate-600' : 'text-cyan-300'}`}>
                          {hoursWorked}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        {isIrregular ? (
                          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1">
                            <AlertTriangle className="size-2.5" /> Bloqueado
                          </Badge>
                        ) : isActive ? (
                          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 gap-1">
                            <Timer className="size-2.5" /> Em andamento
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="size-2.5" /> Encerrado
                          </Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {record.checkOut && (
                            <button disabled={isProcessing} onClick={() => handleReopen(record.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 disabled:opacity-50 transition-colors text-[11px] font-medium whitespace-nowrap"
                              title="Remover Saída e Reabrir">
                              <RotateCcw className="size-3" /> Reabrir
                            </button>
                          )}
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

      {/* Modal de foto ampliada */}
      <Dialog open={!!zoomedPhoto} onOpenChange={() => setZoomedPhoto(null)}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-slate-800 bg-slate-950">
          {zoomedPhoto && (
            <div className="flex flex-col">
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Camera className="size-4 text-rose-400" />
                  {zoomedLabel || 'Biometria — Registro Facial'}
                </span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                  LIVENESS CHECK
                </Badge>
              </div>
              <img
                src={zoomedPhoto}
                alt="Biometria ampliada"
                className="w-full max-h-[75vh] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).alt = 'Foto indisponível'; }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
