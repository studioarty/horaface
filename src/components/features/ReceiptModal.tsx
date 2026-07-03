import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TimeRecord } from '@/types';
import { getLocalReceipt, generateHash, LocalReceipt } from '@/lib/receiptHelper';

export default function ReceiptModal({ 
  recordId, 
  onClose, 
  records 
}: { 
  recordId: string; 
  onClose: () => void; 
  records: TimeRecord[] 
}) {
  const recordFromProp = records?.find(r => r.id === recordId);
  const [localReceipt, setLocalReceipt] = useState<LocalReceipt | null>(null);
  const [hashIn, setHashIn] = useState('');
  const [hashOut, setHashOut] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const local = getLocalReceipt(recordId);
        setLocalReceipt(local || null);

        const pId = recordFromProp?.providerId || local?.providerId;
        const checkInTime = recordFromProp?.checkIn || local?.checkIn;

        if (pId && checkInTime) {
          const chInLoc = local?.checkInLocation || recordFromProp?.location?.split('|')[0] || '';
          const chInPhoto = local?.checkInPhoto || recordFromProp?.photoUrl?.split('|')[0] || '';
          const hIn = local?.checkInHash || await generateHash(recordId, pId, checkInTime, chInLoc, chInPhoto);
          setHashIn(hIn);
        }

        const checkOutTime = recordFromProp?.checkOut || local?.checkOut;
        if (pId && checkOutTime) {
          const chOutLoc = local?.checkOutLocation || recordFromProp?.location?.split('|')[1] || '';
          const chOutPhoto = local?.checkOutPhoto || recordFromProp?.photoUrl?.split('|')[1] || '';
          const hOut = local?.checkOutHash || await generateHash(recordId, pId, checkOutTime, chOutLoc, chOutPhoto);
          setHashOut(hOut);
        }
      } catch (err) {
        console.error("Error loading receipt details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [recordId, recordFromProp]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = `*HoraFace - Recibo de Medição*\n\n` +
      `Prestador: ${localReceipt?.providerName || recordFromProp?.providerName || "Prestador"}\n` +
      `ID: ${recordId}\n` +
      `Status: ${isCompleted ? 'Concluído' : 'Em andamento'}\n\n` +
      `*Entrada (Check-In):*\n` +
      `Data/Hora: ${checkInTimeStr ? new Date(checkInTimeStr).toLocaleString('pt-BR') : '-'}\n` +
      `Hash: ${hashIn}\n\n` +
      (isCompleted ? `*Saída (Check-Out):*\n` +
      `Data/Hora: ${checkOutTimeStr ? new Date(checkOutTimeStr).toLocaleString('pt-BR') : '-'}\n` +
      `Hash: ${hashOut}\n\n` : '') +
      `Selo de Integridade HoraFace`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Recibo HoraFace',
          text: text,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Recibo copiado para a área de transferência!");
      } catch (err) {
        toast.error("Erro ao copiar o recibo.");
      }
    }
  };

  const hasData = !!recordFromProp || !!localReceipt;
  if (!hasData) {
    if (loading) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-center text-slate-400">
            Carregando detalhes do recibo...
          </div>
        </div>
      );
    }
    return null;
  }

  const checkInLoc = localReceipt?.checkInLocation || recordFromProp?.location?.split('|')[0] || '';
  const checkInPhoto = localReceipt?.checkInPhoto || recordFromProp?.photoUrl?.split('|')[0] || '';
  const checkInTimeStr = recordFromProp?.checkIn || localReceipt?.checkIn || '';
  
  const checkOutLoc = localReceipt?.checkOutLocation || recordFromProp?.location?.split('|')[1] || '';
  const checkOutPhoto = localReceipt?.checkOutPhoto || recordFromProp?.photoUrl?.split('|')[1] || '';
  const checkOutTimeStr = recordFromProp?.checkOut || localReceipt?.checkOut || '';

  const isCompleted = !!(recordFromProp?.checkOut || localReceipt?.checkOut);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print-modal-overlay">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          #root {
            display: none !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            display: block !important;
            padding: 0 !important;
          }
          #receipt-print-modal-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div 
        id="receipt-print-modal-container"
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh] text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4 print:border-black">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-cyan-400 print:text-black" />
            <div>
              <h3 className="text-lg font-bold font-heading">Recibo de Medição</h3>
              <p className="text-[10px] text-slate-400 print:text-black">HoraFace • Comprovação Digital</p>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all flex items-center justify-center"
              title="Compartilhar Recibo"
            >
              <Share2 className="size-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all"
              title="Imprimir Recibo"
            >
              <Printer className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400">Carregando detalhes do recibo...</div>
        ) : (
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50 space-y-2 print:bg-transparent print:border-black">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 print:text-black font-semibold">Prestador:</span>
                <span className="font-bold">{localReceipt?.providerName || recordFromProp?.providerName || "Prestador"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 print:text-black font-semibold">ID do Registro:</span>
                <span className="font-mono text-[10px]">{recordId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 print:text-black font-semibold">Status:</span>
                <span className={`font-bold uppercase text-[10px] ${isCompleted ? 'text-emerald-400 print:text-black' : 'text-cyan-400'}`}>
                  {isCompleted ? 'Concluído' : 'Em andamento'}
                </span>
              </div>
            </div>

            {/* Check-In Block */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest print:text-black border-l-2 border-cyan-400 pl-2">
                Início de Atividade (Check-In)
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {checkInPhoto && (
                  <div className="col-span-1">
                    <img 
                      src={checkInPhoto} 
                      alt="Selfie Entrada" 
                      className="w-full aspect-[4/3] object-cover rounded-xl border border-slate-800 print:border-black"
                    />
                  </div>
                )}
                <div className={`space-y-1.5 ${checkInPhoto ? 'col-span-2' : 'col-span-3'} text-xs`}>
                  <div>
                    <span className="text-slate-400 print:text-black block text-[10px]">Data/Hora:</span>
                    <span className="font-medium">{checkInTimeStr ? new Date(checkInTimeStr).toLocaleString('pt-BR') : '-'}</span>
                  </div>
                  {checkInLoc && (
                    <div>
                      <span className="text-slate-400 print:text-black block text-[10px]">Localização:</span>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${checkInLoc}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 print:text-black font-medium hover:underline flex items-center gap-1"
                      >
                        📍 Ver no Mapa
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 print:text-black block text-[10px]">Hash de Conformidade:</span>
                    <span className="font-mono text-[9px] text-slate-300 print:text-black block break-all bg-slate-950/60 p-1.5 rounded border border-slate-800 print:bg-transparent print:border-none">
                      {hashIn}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Separator */}
            {isCompleted && (
              <div className="border-t border-dashed border-slate-800 print:border-black my-4" />
            )}

            {/* Check-Out Block */}
            {isCompleted && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest print:text-black border-l-2 border-emerald-400 pl-2">
                  Fim de Atividade (Check-Out)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {checkOutPhoto && (
                    <div className="col-span-1">
                      <img 
                        src={checkOutPhoto} 
                        alt="Selfie Saída" 
                        className="w-full aspect-[4/3] object-cover rounded-xl border border-slate-800 print:border-black"
                      />
                    </div>
                  )}
                  <div className={`space-y-1.5 ${checkOutPhoto ? 'col-span-2' : 'col-span-3'} text-xs`}>
                    <div>
                      <span className="text-slate-400 print:text-black block text-[10px]">Data/Hora:</span>
                      <span className="font-medium">{checkOutTimeStr ? new Date(checkOutTimeStr).toLocaleString('pt-BR') : '-'}</span>
                    </div>
                    {checkOutLoc && (
                      <div>
                        <span className="text-slate-400 print:text-black block text-[10px]">Localização:</span>
                        {checkOutLoc === "SAÍDA AUTOMÁTICA" ? (
                          <span className="text-red-400 print:text-black font-bold">SAÍDA AUTOMÁTICA</span>
                        ) : (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${checkOutLoc}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 print:text-black font-medium hover:underline flex items-center gap-1"
                          >
                            📍 Ver no Mapa
                          </a>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 print:text-black block text-[10px]">Hash de Conformidade:</span>
                      <span className="font-mono text-[9px] text-slate-300 print:text-black block break-all bg-slate-950/60 p-1.5 rounded border border-slate-800 print:bg-transparent print:border-none">
                        {hashOut}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer stamp */}
            <div className="pt-4 border-t border-slate-800 print:border-black flex justify-between items-center text-[10px] text-slate-500 print:text-black">
              <span>Selo de Integridade HoraFace</span>
              <span className="font-semibold bg-emerald-950/40 text-emerald-400 print:text-black px-2 py-0.5 rounded border border-emerald-900/30 print:border-none uppercase">
                {localReceipt ? "Assinado Localmente" : "Verificado em Nuvem"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
