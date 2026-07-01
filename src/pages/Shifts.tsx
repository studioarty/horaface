import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useShiftStore } from '@/stores/useShiftStore';
import { useProviderStore } from '@/stores/useProviderStore';
import ShiftCard from '@/components/features/ShiftCard';
import { DAYS_OF_WEEK, SHIFT_COLORS } from '@/constants/config';
import type { Shift } from '@/types';

export default function Shifts() {
  const { toast } = useToast();
  const shiftStore = useShiftStore();
  const providerStore = useProviderStore();

  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    days: [1, 2, 3, 4, 5] as number[],
    color: SHIFT_COLORS[0],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '08:00',
      endTime: '16:00',
      days: [1, 2, 3, 4, 5],
      color: SHIFT_COLORS[0],
    });
    setEditingShift(null);
    setShowForm(false);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      days: shift.days,
      color: shift.color,
    });
    setShowForm(true);
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da janela contratual.',
      });
      return;
    }

    if (editingShift) {
      shiftStore.updateShift(editingShift.id, formData);
      toast({ title: 'Janela atualizada!', description: formData.name });
    } else {
      const shift: Shift = {
        id: `shift-${Date.now()}`,
        ...formData,
      };
      shiftStore.addShift(shift);
      toast({ title: 'Janela de horário criada!', description: formData.name });
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    const linkedProviders = providerStore.providers.filter((p) => {
      const ids = p.shiftIds && p.shiftIds.length > 0 ? p.shiftIds : [p.shiftId];
      return ids.includes(id);
    });
    if (linkedProviders.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Não é possível excluir',
        description: `${linkedProviders.length} prestador(es) vinculado(s) a esta janela.`,
      });
      return;
    }
    shiftStore.removeShift(id);
    toast({ title: 'Janela de horário removida' });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
            Janelas de Horários
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Configure as janelas e períodos autorizados para a prestação de serviços
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Nova Janela
        </Button>
      </div>

      {shiftStore.shifts.length === 0 ? (
        <div className="hud-card flex flex-col items-center gap-4 rounded-lg px-4 py-12 sm:py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="size-8 text-primary" />
          </div>
          <p className="font-heading text-lg font-semibold text-text-primary">
            Nenhuma janela de horário cadastrada
          </p>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="size-4" />
            Criar Janela
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shiftStore.shifts.map((shift) => {
            const count = providerStore.providers.filter((p) => {
              const ids = p.shiftIds && p.shiftIds.length > 0 ? p.shiftIds : [p.shiftId];
              return ids.includes(shift.id);
            }).length;
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                providerCount={count}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Shift Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md border-border bg-surface mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-text-primary">
              {editingShift ? 'Editar Janela' : 'Nova Janela'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-text-secondary">Nome da Janela / Contrato *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Prestação Diurna"
                className="mt-1 border-border bg-elevated"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-text-secondary">Início</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="mt-1 border-border bg-elevated"
                />
              </div>
              <div>
                <Label className="text-text-secondary">Término</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="mt-1 border-border bg-elevated"
                />
              </div>
            </div>

            <div>
              <Label className="text-text-secondary">Dias da Semana</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const active = formData.days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`flex size-9 items-center justify-center rounded text-xs font-medium transition-colors ${
                        active
                          ? 'bg-primary text-background'
                          : 'bg-elevated text-text-muted hover:bg-elevated/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-text-secondary">Cor</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SHIFT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`size-7 rounded-full transition-transform ${
                      formData.color === color
                        ? 'scale-125 ring-2 ring-white/50'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingShift ? 'Atualizar' : 'Criar Janela'}
              </Button>
              <Button variant="outline" onClick={resetForm} className="border-border">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
