import { useState } from 'react';
import { UserPlus, Users, ScanFace, Camera } from 'lucide-react';
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
import { useProviderStore } from '@/stores/useProviderStore';
import { useShiftStore } from '@/stores/useShiftStore';
import ProviderCard from '@/components/features/ProviderCard';
import FaceCapture from '@/components/features/FaceCapture';
import type { Provider } from '@/types';

type ShiftMode = 'morning' | 'afternoon' | 'both' | 'custom';

export default function Providers() {
  const { toast } = useToast();
  const providerStore = useProviderStore();
  const shiftStore = useShiftStore();

  const [showForm, setShowForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    role: '',
    company: '',
  });
  const [shiftMode, setShiftMode] = useState<ShiftMode | ''>('');
  const [customShiftId, setCustomShiftId] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  // Find morning and afternoon shifts
  const morningShift = shiftStore.shifts.find(
    (s) => s.name.toLowerCase().includes('manhã') || s.id === 'shift-morning',
  );
  const afternoonShift = shiftStore.shifts.find(
    (s) => s.name.toLowerCase().includes('tarde') || s.id === 'shift-afternoon',
  );
  const otherShifts = shiftStore.shifts.filter(
    (s) => s.id !== morningShift?.id && s.id !== afternoonShift?.id,
  );

  const getSelectedShiftIds = (): string[] => {
    if (shiftMode === 'morning' && morningShift) return [morningShift.id];
    if (shiftMode === 'afternoon' && afternoonShift) return [afternoonShift.id];
    if (shiftMode === 'both' && morningShift && afternoonShift) return [morningShift.id, afternoonShift.id];
    if (shiftMode === 'custom' && customShiftId) return [customShiftId];
    return [];
  };

  const resetForm = () => {
    setFormData({ name: '', cpf: '', role: '', company: '' });
    setShiftMode('');
    setCustomShiftId('');
    setCapturedPhoto('');
    setCapturedDescriptor([]);
    setCapturedDescriptors([]);
    setCapturedPhotos([]);
    setShowForm(false);
    setShowCamera(false);
  };

  const handleFaceCapture = (
    photo: string,
    descriptor: number[],
    allDescriptors: number[][],
    allPhotos: string[],
  ) => {
    setCapturedPhoto(photo);
    setCapturedDescriptor(descriptor);
    setCapturedDescriptors(allDescriptors);
    setCapturedPhotos(allPhotos);
    setShowCamera(false);
    toast({
      title: 'Face capturada!',
      description: `${allDescriptors.length} posições registradas para máxima precisão.`,
    });
  };

  const handleSubmit = () => {
    const selectedIds = getSelectedShiftIds();

    if (!formData.name || !formData.cpf || selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha nome, CPF e selecione ao menos um turno.',
      });
      return;
    }

    if (capturedDescriptors.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Captura incompleta',
        description: 'Capture as 4 posições faciais obrigatórias.',
      });
      return;
    }

    const provider: Provider = {
      id: `prov-${Date.now()}`,
      name: formData.name,
      cpf: formData.cpf,
      role: formData.role,
      company: formData.company,
      photo: capturedPhoto,
      faceDescriptor: capturedDescriptor,
      faceDescriptors: capturedDescriptors,
      facePhotos: capturedPhotos,
      shiftId: selectedIds[0], // Primary shift (backward compat)
      shiftIds: selectedIds,   // All selected shifts
      active: true,
      createdAt: new Date().toISOString(),
    };

    providerStore.addProvider(provider);

    const shiftNames = selectedIds
      .map((id) => shiftStore.shifts.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(' + ');

    toast({
      title: 'Prestador cadastrado!',
      description: `${provider.name} — Turno: ${shiftNames} — ${capturedDescriptors.length} posições faciais.`,
    });
    resetForm();
  };

  const handleToggle = (id: string) => {
    const p = providerStore.providers.find((pr) => pr.id === id);
    if (p) {
      providerStore.updateProvider(id, { active: !p.active });
      toast({
        title: p.active ? 'Prestador desativado' : 'Prestador ativado',
        description: p.name,
      });
    }
  };

  const handleDelete = (id: string) => {
    const p = providerStore.providers.find((pr) => pr.id === id);
    providerStore.removeProvider(id);
    toast({ title: 'Prestador removido', description: p?.name || '' });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
            Prestadores de Serviço
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Cadastre prestadores com 4 capturas faciais para máxima precisão
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 self-start sm:self-auto">
          <UserPlus className="size-4" />
          Novo Prestador
        </Button>
      </div>

      {providerStore.providers.length === 0 ? (
        <div className="hud-card flex flex-col items-center gap-4 rounded-lg px-4 py-12 sm:py-16">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-semibold text-text-primary">
              Nenhum prestador cadastrado
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Cadastre o primeiro prestador com captura facial em 4 posições
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <UserPlus className="size-4" />
            Cadastrar Prestador
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {providerStore.providers.map((p) => {
            const shiftIds = p.shiftIds && p.shiftIds.length > 0 ? p.shiftIds : [p.shiftId];
            const shifts = shiftIds
              .map((id) => shiftStore.shifts.find((s) => s.id === id))
              .filter(Boolean) as import('@/types').Shift[];
            return (
              <ProviderCard
                key={p.id}
                provider={p}
                shifts={shifts}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Registration Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg border-border bg-surface mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-text-primary">
              Cadastrar Prestador
            </DialogTitle>
          </DialogHeader>

          {showCamera ? (
            <FaceCapture
              onCapture={handleFaceCapture}
              onCancel={() => setShowCamera(false)}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-text-secondary">Nome Completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do prestador"
                    className="mt-1 border-border bg-elevated"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary">CPF *</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="mt-1 border-border bg-elevated"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary">Cargo/Função</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ex: Técnico"
                    className="mt-1 border-border bg-elevated"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-text-secondary">Empresa</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Empresa de origem"
                    className="mt-1 border-border bg-elevated"
                  />
                </div>
              </div>

              {/* Shift Selection */}
              <div>
                <Label className="text-text-secondary">Turno *</Label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Selecione o período de trabalho do prestador
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {/* Só Manhã */}
                  {morningShift && (
                    <button
                      type="button"
                      onClick={() => { setShiftMode('morning'); setCustomShiftId(''); }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                        shiftMode === 'morning'
                          ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl">🌅</span>
                      <span className={`text-xs font-bold ${shiftMode === 'morning' ? 'text-cyan-400' : 'text-slate-300'}`}>
                        Só Manhã
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {morningShift.startTime}–{morningShift.endTime}
                      </span>
                    </button>
                  )}
                  {/* Só Tarde */}
                  {afternoonShift && (
                    <button
                      type="button"
                      onClick={() => { setShiftMode('afternoon'); setCustomShiftId(''); }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                        shiftMode === 'afternoon'
                          ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl">🌇</span>
                      <span className={`text-xs font-bold ${shiftMode === 'afternoon' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        Só Tarde
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {afternoonShift.startTime}–{afternoonShift.endTime}
                      </span>
                    </button>
                  )}
                  {/* Manhã e Tarde */}
                  {morningShift && afternoonShift && (
                    <button
                      type="button"
                      onClick={() => { setShiftMode('both'); setCustomShiftId(''); }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-all ${
                        shiftMode === 'both'
                          ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl">☀️</span>
                      <span className={`text-xs font-bold ${shiftMode === 'both' ? 'text-amber-400' : 'text-slate-300'}`}>
                        Manhã + Tarde
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {morningShift.startTime}–{afternoonShift.endTime}
                      </span>
                    </button>
                  )}
                </div>

                {/* Selected shift summary */}
                {shiftMode && shiftMode !== 'custom' && (
                  <div className="mt-2 rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Turnos selecionados:</span>
                      <div className="flex gap-1.5">
                        {getSelectedShiftIds().map((id) => {
                          const s = shiftStore.shifts.find((sh) => sh.id === id);
                          if (!s) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ color: s.color, background: `${s.color}15` }}
                            >
                              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                              {s.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {shiftMode === 'both' && morningShift && afternoonShift && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Período completo: {morningShift.startTime} às {afternoonShift.endTime} (dois turnos)
                      </p>
                    )}
                  </div>
                )}

                {/* Other shifts */}
                {otherShifts.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-slate-500 mb-1.5">Outros turnos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {otherShifts.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setShiftMode('custom'); setCustomShiftId(s.id); }}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                            shiftMode === 'custom' && customShiftId === s.id
                              ? 'border-white/30 bg-white/5'
                              : 'border-slate-700 bg-slate-800/20 hover:border-slate-600'
                          }`}
                        >
                          <span className="size-2 rounded-full" style={{ background: s.color }} />
                          <span className={shiftMode === 'custom' && customShiftId === s.id ? 'text-white font-medium' : 'text-slate-400'}>
                            {s.name}
                          </span>
                          <span className="text-slate-600">{s.startTime}–{s.endTime}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Face Capture Section */}
              <div className="rounded-lg border border-dashed border-border p-4">
                {capturedPhotos.length >= 4 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15">
                        <Camera className="size-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-400">
                          {capturedPhotos.length} posições capturadas
                        </p>
                        <p className="text-[10px] text-slate-500">Reconhecimento com precisão máxima</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {capturedPhotos.map((photo, i) => {
                        const labels = ['Frontal', 'Esquerda', 'Direita', 'Inclinado'];
                        return (
                          <div key={i} className="relative">
                            <img
                              src={photo}
                              alt={labels[i] || `Captura ${i + 1}`}
                              className="aspect-square w-full rounded-md border border-emerald-500/30 object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/70 px-1 py-0.5 text-center">
                              <span className="text-[8px] font-medium text-emerald-400">
                                {labels[i]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCamera(true)}
                      className="w-full gap-1.5 border-border text-xs"
                    >
                      <ScanFace className="size-3.5" />
                      Recapturar Todas as Posições
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <ScanFace className="size-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-secondary">
                        Captura facial em 4 posições
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Frontal, esquerda, direita e inclinado para maior precisão
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCamera(true)}
                      variant="outline"
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <ScanFace className="size-4" />
                      Iniciar Captura Facial
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} className="flex-1">
                  Salvar Prestador
                </Button>
                <Button variant="outline" onClick={resetForm} className="border-border">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
