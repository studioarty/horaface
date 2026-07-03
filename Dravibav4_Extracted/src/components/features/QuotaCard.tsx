import { HardDrive } from 'lucide-react';
import { formatBytes } from '@/lib/mockData';

interface QuotaCardProps {
  used: number;
  total: number;
}

export default function QuotaCard({ used, total }: QuotaCardProps) {
  const percentage = (used / total) * 100;
  const isWarning = percentage > 80;

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Armazenamento</h3>
          <p className="text-sm text-muted-foreground mt-1">Uso total de espaço</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isWarning ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <HardDrive className={`w-6 h-6 ${isWarning ? 'text-orange-600' : 'text-blue-600'}`} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{formatBytes(used)}</span>
          <span className="text-sm text-muted-foreground">de {formatBytes(total)}</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              isWarning ? 'bg-orange-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage.toFixed(1)}% usado</span>
          <span>{formatBytes(total - used)} disponível</span>
        </div>
      </div>
    </div>
  );
}
