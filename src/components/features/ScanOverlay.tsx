interface ScanOverlayProps {
  status: 'idle' | 'scanning' | 'detected' | 'matched' | 'error';
  label?: string;
}

const statusConfig = {
  idle: { color: 'text-text-muted', borderColor: 'border-text-muted/30', label: 'Aguardando câmera...' },
  scanning: { color: 'text-primary', borderColor: 'border-primary/40', label: 'Escaneando...' },
  detected: { color: 'text-primary', borderColor: 'border-primary/60', label: 'Rosto detectado' },
  matched: { color: 'text-success', borderColor: 'border-success/60', label: 'Identificado!' },
  error: { color: 'text-error', borderColor: 'border-error/60', label: 'Não reconhecido' },
};

export default function ScanOverlay({ status, label }: ScanOverlayProps) {
  const config = statusConfig[status];
  const showScanLine = status === 'scanning';

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Corner brackets */}
      <div className={`absolute left-3 top-3 size-8 border-l-2 border-t-2 ${config.borderColor}`} />
      <div className={`absolute right-3 top-3 size-8 border-r-2 border-t-2 ${config.borderColor}`} />
      <div className={`absolute bottom-3 left-3 size-8 border-b-2 border-l-2 ${config.borderColor}`} />
      <div className={`absolute bottom-3 right-3 size-8 border-b-2 border-r-2 ${config.borderColor}`} />

      {/* Scan line */}
      {showScanLine && (
        <div className="absolute left-4 right-4 h-0.5 animate-scan-line bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
      )}

      {/* Status label */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 backdrop-blur-sm">
          <div
            className={`size-2 rounded-full ${
              status === 'scanning'
                ? 'animate-glow-pulse bg-primary'
                : status === 'matched'
                  ? 'bg-success'
                  : status === 'error'
                    ? 'bg-error'
                    : status === 'detected'
                      ? 'bg-primary'
                      : 'bg-text-muted'
            }`}
          />
          <span className={`font-mono text-xs ${config.color}`}>
            {label || config.label}
          </span>
        </div>
      </div>

      {/* Top-right timestamp */}
      <div className="absolute right-4 top-4 rounded bg-background/70 px-2 py-0.5 font-mono text-[10px] text-primary backdrop-blur-sm">
        {new Date().toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
}
