import { Clock, Trash2, Edit } from 'lucide-react';
import type { Shift } from '@/types';
import { DAYS_OF_WEEK } from '@/constants/config';
import { Button } from '@/components/ui/button';

interface ShiftCardProps {
  shift: Shift;
  providerCount: number;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
}

export default function ShiftCard({
  shift,
  providerCount,
  onEdit,
  onDelete,
}: ShiftCardProps) {
  return (
    <div className="hud-card animate-fade-up rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${shift.color}15` }}
          >
            <Clock className="size-5" style={{ color: shift.color }} />
          </div>
          <div>
            <h4 className="font-heading text-lg font-semibold text-text-primary">
              {shift.name}
            </h4>
            <p className="font-mono text-sm tabular-nums text-text-secondary">
              {shift.startTime} — {shift.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(shift)}
            className="size-8 text-text-muted hover:text-text-primary"
          >
            <Edit className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(shift.id)}
            className="size-8 text-text-muted hover:text-error"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {DAYS_OF_WEEK.map((day) => {
          const active = shift.days.includes(day.value);
          return (
            <span
              key={day.value}
              className={`flex size-8 items-center justify-center rounded text-xs font-medium ${
                active
                  ? 'text-white'
                  : 'bg-elevated text-text-muted'
              }`}
              style={active ? { backgroundColor: shift.color } : undefined}
            >
              {day.label}
            </span>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <span className="text-xs text-text-muted">
          {providerCount} prestador(es) neste turno
        </span>
      </div>
    </div>
  );
}
