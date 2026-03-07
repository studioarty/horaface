import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'error';
  sub?: string;
}

const accentMap = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    shadow: 'shadow-glow',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    shadow: 'shadow-glow-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    shadow: 'shadow-glow-warning',
  },
  error: {
    bg: 'bg-error/10',
    text: 'text-error',
    shadow: 'shadow-glow-error',
  },
};

export default function StatsCard({
  label,
  value,
  icon,
  accent = 'primary',
  sub,
}: StatsCardProps) {
  const a = accentMap[accent];

  return (
    <div className="hud-card rounded-lg p-3 sm:p-4 animate-fade-up">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium uppercase text-text-muted">
            {label}
          </p>
          <p className={`mt-1 font-heading text-xl sm:text-3xl font-bold tabular-nums ${a.text}`}>
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-text-secondary">{sub}</p>
          )}
        </div>
        <div className={`flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg ${a.bg} ${a.shadow}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
