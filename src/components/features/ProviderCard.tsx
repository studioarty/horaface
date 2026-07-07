import { User, Trash2, ToggleLeft, ToggleRight, Edit2, Bot } from 'lucide-react';
import type { Provider, Shift } from '@/types';
import { Button } from '@/components/ui/button';

interface ProviderCardProps {
  provider: Provider;
  shift?: Shift;       // backward compat single shift
  shifts?: Shift[];    // multiple shifts
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (provider: Provider) => void;
}

export default function ProviderCard({
  provider,
  shift,
  shifts,
  onToggle,
  onDelete,
  onEdit,
}: ProviderCardProps) {
  // Use shifts array if provided, otherwise fall back to single shift
  const allShifts = shifts && shifts.length > 0 ? shifts : shift ? [shift] : [];

  return (
    <div className="hud-card animate-fade-up rounded-lg p-4">
      <div className="flex items-start gap-4">
        {provider.isTest ? (
          <div className="flex size-14 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Bot className="size-6 text-indigo-400" />
          </div>
        ) : provider.photo ? (
          <img
            src={provider.photo}
            alt={provider.name}
            className="size-14 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-lg bg-elevated">
            <User className="size-6 text-text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-heading text-base font-semibold text-text-primary">
                {provider.name}
              </h4>
              <p className="text-xs text-text-secondary">{provider.role}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                provider.active
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              }`}
            >
              {provider.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-xs text-text-muted">
              CPF: {provider.cpf}
            </span>
            {(() => {
              const [companyName, minStayStr, startAct, endAct] = (provider.company || '').split('|');
              return (
                <>
                  {companyName ? (
                    <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-400/20">
                      Local: {companyName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-400/20">
                      Sem GPS (Livre)
                    </span>
                  )}
                  {minStayStr && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-400/20">
                      Carência: {minStayStr} min
                    </span>
                  )}
                  {startAct && endAct && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-400/20" title="Horário de Atividades Permitido">
                      🕒 Horário: {startAct} - {endAct}
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Shifts display */}
          {allShifts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allShifts.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: s.color, background: `${s.color}15` }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                  {s.name} ({s.startTime}–{s.endTime})
                </span>
              ))}
              {allShifts.length > 1 && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  Duplo turno
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1.5">
            {provider.isTest ? (
              <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-400 border border-indigo-500/20">
                <Bot className="size-3" /> Conta de Teste
              </span>
            ) : (provider.faceDescriptors && provider.faceDescriptors.length > 0) || provider.faceDescriptor.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                ✓ Face registrada ({provider.faceDescriptors?.length || 1} posição{(provider.faceDescriptors?.length || 1) > 1 ? 'ões' : ''})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                ✗ Sem face
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(provider)}
          className="gap-1.5 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <Edit2 className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(provider.id)}
          className="gap-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          {provider.active ? (
            <ToggleRight className="size-4 text-success" />
          ) : (
            <ToggleLeft className="size-4 text-text-muted" />
          )}
          {provider.active ? 'Desativar' : 'Ativar'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(provider.id)}
          className="gap-1.5 text-xs text-error hover:bg-error/10 hover:text-error"
        >
          <Trash2 className="size-3.5" />
          Excluir
        </Button>
      </div>
    </div>
  );
}
