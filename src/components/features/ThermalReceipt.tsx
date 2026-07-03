import { forwardRef } from 'react';

// Tipagem dos Dados Injetáveis no Recibo
export interface ReceiptData {
    providerName: string;
    type: 'in' | 'out';
    time: string;
    date: string;
    customMessage: string;
    kioskName: string;
}

interface ThermalReceiptProps {
    data: ReceiptData | null;
}

// O componente fica permanentemente oculto nas classes normais da tela (hidden).
// Mas no MODO DE IMPRESSÃO (@media print), ele deve dominar a tela cheia.
export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
    ({ data }, ref) => {
        if (!data) return null;

        return (
            <div
                ref={ref}
                // Tailwind classes (Invisível na UI normal, Block na Impressão cobrindo o Window)
                className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black print:font-mono print:text-[12px] print:leading-tight print:p-0 print:m-0 print:break-inside-avoid print:z-[9999]"
                style={{ width: '58mm' }} // Base Thermal Printer Size
            >
                {/* CSS Engine Constraint for Chromium Media Print */}
                <style type="text/css" media="print">
                    {`
                        @page {
                            size: 58mm auto;
                            margin: 0;
                        }
                        body, html, #root {
                            height: auto !important;
                            width: 58mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            visibility: hidden;
                        }
                        /* Faz a Div do Recibo saltar do Visibility Hidden global */
                        .print\\:block {
                            visibility: visible !important;
                        }
                    `}
                </style>

                <div className="flex flex-col items-center justify-center p-2 text-center pb-8 border-b-2 border-black border-dashed">
                    {/* Cabeçalho */}
                    <h1 className="font-bold text-lg leading-none uppercase mb-1">
                        HoraFace
                    </h1>
                    <p className="text-[10px] mb-2 uppercase">Recibo de {data.type === 'in' ? 'Check-in' : 'Check-out'}</p>

                    {/* Divisor */}
                    <div className="w-full border-t border-black mb-2 border-dashed" />

                    {/* Dados Básicos */}
                    <p className="font-bold text-sm w-full text-left truncate">{data.providerName}</p>
                    <div className="flex w-full justify-between text-[11px] mt-1">
                        <span>{data.date}</span>
                        <span className="font-bold">{data.time}</span>
                    </div>

                    {/* Divisor */}
                    <div className="w-full border-t border-black my-2 border-dashed" />

                    {/* Mensagem Motivacional Gerada */}
                    <p className="text-[12px] italic w-full whitespace-pre-wrap leading-tight text-center my-1 font-semibold">
                        "{data.customMessage}"
                    </p>

                    <div className="w-full border-t border-black my-2 border-dashed" />

                    {/* Terminal Rodapé */}
                    <p className="text-[9px] text-gray-800 w-full text-center">
                        Terminal: {data.kioskName}
                    </p>
                    <p className="text-[8px] text-gray-600 mt-0.5">
                        {window.location.host}
                    </p>

                    {/* Espaçamento extra do picote da bobina */}
                    <div className="h-6 w-full" />
                </div>
            </div>
        );
    }
);

ThermalReceipt.displayName = 'ThermalReceipt';
