import { useState, useEffect } from 'react';
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
import { useKioskStore } from '@/stores/useKioskStore';
import ProviderCard from '@/components/features/ProviderCard';
import FaceCapture from '@/components/features/FaceCapture';
import type { Provider } from '@/types';

export default function Providers() {
  const { toast } = useToast();
  const providerStore = useProviderStore();
  const shiftStore = useShiftStore();
  const kioskStore = useKioskStore();

  const [showForm, setShowForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    hourlyRate: '',
    pin: '',
  });
  const [customMinCheckout, setCustomMinCheckout] = useState('');
  const [startActivity, setStartActivity] = useState('');
  const [endActivity, setEndActivity] = useState('');
  const [refValue, setRefValue] = useState('');
  const [refHours, setRefHours] = useState('187');
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [chatPermissionType, setChatPermissionType] = useState<'none' | 'all' | 'custom'>('none');
  const [chatAllowedProviders, setChatAllowedProviders] = useState<string[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isTest, setIsTest] = useState(false);

  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  useEffect(() => {
    const selected = selectedShiftIds.map((id) => shiftStore.shifts.find((s) => s.id === id)).filter(Boolean) as import('@/types').Shift[];
    
    if (selected.length > 0) {
      let totalMinutes = 0;
      selected.forEach((s) => {
        if (!s.startTime || !s.endTime) return;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        let mm = (eh * 60 + em) - (sh * 60 + sm);
        if (mm < 0) mm += 24 * 60;
        totalMinutes += mm;
      });
      const hoursPerDay = totalMinutes / 60;
      // 22 working days per month is the standard basis
      const calculatedMonthHours = Math.round(hoursPerDay * 22);
      
      setRefHours(String(calculatedMonthHours));
      
      const v = parseFloat(refValue);
      if (v > 0 && calculatedMonthHours > 0) {
        setFormData((prev) => ({ ...prev, hourlyRate: (v / calculatedMonthHours).toFixed(2) }));
      }
    }
  }, [selectedShiftIds, refValue]);

  const resetForm = () => {
    setFormData({ name: '', role: '', company: '', hourlyRate: '', pin: '' });
    setCustomMinCheckout('');
    setStartActivity('');
    setEndActivity('');
    setRefValue('');
    setRefHours('187');
    setSelectedShiftIds([]);
    setCapturedPhoto('');
    setCapturedDescriptor([]);
    setCapturedDescriptors([]);
    setCapturedPhotos([]);
    setEditingProviderId(null);
    setShowForm(false);
    setShowCamera(false);
    setChatPermissionType('none');
    setChatAllowedProviders([]);
    setChatSearchQuery('');
    setIsTest(false);
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

  const handleEditClick = (provider: Provider) => {
    const [companyName, minStayStr, startAct, endAct] = (provider.company || '').split('|');
    setFormData({
      name: provider.name || '',
      role: provider.role || '',
      company: companyName || '',
      hourlyRate: provider.hourlyRate !== undefined && provider.hourlyRate !== null ? String(provider.hourlyRate) : '',
      pin: provider.pin || '',
    });
    setCustomMinCheckout(minStayStr || '');
    setStartActivity(startAct || '');
    setEndActivity(endAct || '');
    
    setCapturedPhoto(provider.photo || '');
    setCapturedDescriptor(provider.faceDescriptor || []);
    setCapturedDescriptors(provider.faceDescriptors || []);
    setCapturedPhotos(provider.facePhotos || []);
    setChatPermissionType(provider.chatPermissionType || 'none');
    setChatAllowedProviders(provider.chatAllowedProviders || []);
    setChatSearchQuery('');
    setIsTest(provider.isTest || false);
    
    setRefValue('');
    
    const ids = provider.shiftIds && provider.shiftIds.length > 0 ? provider.shiftIds : provider.shiftId ? [provider.shiftId] : [];
    setSelectedShiftIds(ids);

    setEditingProviderId(provider.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const selectedIds = selectedShiftIds;

    if (!formData.name || selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha nome e selecione ao menos um turno.',
      });
      return;
    }

    if (isTest && !formData.pin) {
      toast({
        variant: 'destructive',
        title: 'Senha Obrigatória',
        description: 'Um perfil de Teste precisa de um PIN (Senha App) para fazer login no painel.',
      });
      return;
    }

    if (!isTest && capturedDescriptors.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Captura incompleta',
        description: 'Capture as 4 posições faciais obrigatórias para prestadores reais.',
      });
      return;
    }

    const providerData: Partial<Provider> = {
      name: formData.name,
      role: formData.role,
      company: `${formData.company}|${customMinCheckout || ''}|${startActivity || ''}|${endActivity || ''}`,
      photo: (isTest && !capturedPhoto) ? "" : capturedPhoto,
      faceDescriptor: capturedDescriptor,
      faceDescriptors: capturedDescriptors,
      facePhotos: capturedPhotos,
      shiftId: selectedIds[0], // Primary shift (backward compat)
      shiftIds: selectedIds,   // All selected shifts
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      pin: formData.pin ? formData.pin : undefined,
      chatPermissionType,
      chatAllowedProviders,
      isTest,
    };

    if (editingProviderId) {
      providerStore.updateProvider(editingProviderId, providerData);
      toast({
        title: 'Prestador atualizado!',
        description: `${providerData.name} foi atualizado com sucesso.`,
      });
      resetForm();
    } else {
      const newProvider: Provider = {
        id: `prov-${Date.now()}`,
        ...(providerData as Provider),
        active: true,
        createdAt: new Date().toISOString(),
      };
      
      try {
        await providerStore.addProvider(newProvider);
        
        const shiftNames = selectedIds
          .map((id) => shiftStore.shifts.find((s) => s.id === id)?.name)
          .filter(Boolean)
          .join(' + ');

        toast({
          title: 'Prestador cadastrado!',
          description: `${newProvider.name} — Turno: ${shiftNames} — ${isTest ? 'Modo de Teste' : `${capturedDescriptors.length} posições faciais`}.`,
        });
        resetForm();
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro Real do Supabase',
          description: err?.message || JSON.stringify(err) || 'Não foi possível salvar a imagem ou dados no servidor.',
        });
      }
    }
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
                onEdit={handleEditClick}
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
              {editingProviderId ? 'Editar Prestador' : 'Cadastrar Prestador'}
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
                  <Label className="text-text-secondary">PIN Mágico (Senha App)</Label>
                  <Input
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Ex: 1234"
                    maxLength={6}
                    className="mt-1 border-border bg-elevated"
                  />
                </div>
                
                <div className="sm:col-span-2 flex items-center gap-2 mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <input
                    type="checkbox"
                    id="isTest"
                    checked={isTest}
                    onChange={(e) => setIsTest(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 size-4 cursor-pointer"
                  />
                  <Label htmlFor="isTest" className="text-slate-300 cursor-pointer">
                    Prestador de Teste (marcar caso este perfil seja usado apenas para testes)
                  </Label>
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
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary">Local de Trabalho (GPS)</Label>
                    <select
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10 w-full"
                    >
                      <option value="">Qualquer Local (Livre - Sem GPS)</option>
                      {(kioskStore.workLocations || []).map((loc, idx) => (
                        <option key={idx} value={loc.name}>
                          {loc.name} ({loc.radius}m)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-text-secondary">Permanência Mínima (Minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Global (Ex: 15)"
                      value={customMinCheckout}
                      onChange={(e) => setCustomMinCheckout(e.target.value)}
                      className="mt-1 border-border bg-elevated h-10"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary">Início das Atividades (Bloqueio antes deste horário)</Label>
                    <Input
                      type="time"
                      value={startActivity}
                      onChange={(e) => setStartActivity(e.target.value)}
                      className="mt-1 border-border bg-elevated h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-text-secondary">Fim das Atividades</Label>
                    <Input
                      type="time"
                      value={endActivity}
                      onChange={(e) => setEndActivity(e.target.value)}
                      className="mt-1 border-border bg-elevated h-10"
                    />
                  </div>
                </div>
                
                {/* Hourly Rate Control */}
                <div className="sm:col-span-2 rounded-lg border border-border bg-slate-800/20 p-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-emerald-400 font-bold text-base">Valor Oficial da Hora (R$)</Label>
                      <p className="text-xs text-slate-400">Este é o valor base que multiplicará as horas trabalhadas.</p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 13.37"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        className="border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-bold text-lg text-right h-10"
                      />
                    </div>
                  </div>
                  
                  {/* Subjective Calculator Toggle */}
                  <div className="border-t border-slate-700/50 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCalculator(!showCalculator)}
                      className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      {showCalculator ? "Ocultar Calculadora de Referência" : "Usar Calculadora de Referência (Opcional)"}
                    </button>
                    
                    {showCalculator && (
                      <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-slate-900/50 rounded-md border border-slate-700/50">
                        <div>
                          <Label className="text-[11px] text-slate-400">Expec. Salarial (R$)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 2500"
                            value={refValue}
                            onChange={(e) => {
                              setRefValue(e.target.value);
                              const v = parseFloat(e.target.value);
                              const h = parseFloat(refHours);
                              if (v > 0 && h > 0) {
                                setFormData({...formData, hourlyRate: (v / h).toFixed(2)});
                              } else {
                                setFormData({...formData, hourlyRate: ''});
                              }
                            }}
                            className="h-8 text-xs mt-1 border-slate-700 bg-slate-800"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-400">Horas Mês (Ex: 187)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 187"
                            value={refHours}
                            onChange={(e) => {
                              setRefHours(e.target.value);
                              const v = parseFloat(refValue);
                              const h = parseFloat(e.target.value);
                              if (v > 0 && h > 0) {
                                setFormData({...formData, hourlyRate: (v / h).toFixed(2)});
                              } else {
                                setFormData({...formData, hourlyRate: ''});
                              }
                            }}
                            className="h-8 text-xs mt-1 border-slate-700 bg-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shift Selection */}
              <div>
                <Label className="text-text-secondary">Turnos Permitidos *</Label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Selecione um ou mais turnos nos quais o prestador poderá bater ponto (todos os turnos selecionados terão o mesmo formato de ícone de cor)
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-700/50 rounded-lg p-2 bg-slate-900/30 custom-scrollbar">
                  {shiftStore.shifts.map((s) => {
                    const isSelected = selectedShiftIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedShiftIds.length > 1) {
                              setSelectedShiftIds(selectedShiftIds.filter(id => id !== s.id));
                            } else {
                              toast({ variant: 'destructive', title: 'Aviso', description: 'O prestador precisa ter pelo menos um turno.' });
                            }
                          } else {
                            setSelectedShiftIds([...selectedShiftIds, s.id]);
                          }
                        }}
                        className={`flex items-center justify-between rounded-lg border-2 p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="size-3.5 rounded-full border border-white/20 flex-shrink-0" style={{ background: s.color }} />
                          <div className="overflow-hidden">
                            <span className={`text-xs font-bold block truncate ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {s.startTime}–{s.endTime}
                            </span>
                          </div>
                        </div>
                        <div className={`size-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600 bg-black/45'}`}>
                          {isSelected && <span className="text-[9px] font-bold text-black">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat Permissions Section */}
              <div className="rounded-lg border border-border bg-slate-800/20 p-4">
                <Label className="text-primary font-bold text-base">Permissões do Chat (Celular)</Label>
                <p className="text-xs text-slate-400 mb-3">Defina com quem este prestador poderá conversar no chat do aplicativo.</p>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setChatPermissionType('none')}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all ${
                      chatPermissionType === 'none'
                        ? 'border-red-500/50 bg-red-950/20 text-red-400 font-bold'
                        : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">🚫</span>
                    <span className="text-[11px] leading-tight">Apenas Suporte</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatPermissionType('all')}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all ${
                      chatPermissionType === 'all'
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400 font-bold'
                        : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">💬</span>
                    <span className="text-[11px] leading-tight">Falar com Todos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatPermissionType('custom')}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all ${
                      chatPermissionType === 'custom'
                        ? 'border-blue-500/50 bg-blue-950/20 text-blue-400 font-bold'
                        : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">👥</span>
                    <span className="text-[11px] leading-tight">Contatos Específicos</span>
                  </button>
                </div>

                {chatPermissionType === 'custom' && (
                  <div className="space-y-2 border-t border-slate-700/50 pt-3">
                    <Label className="text-xs text-slate-300">Marque os contatos liberados:</Label>
                    <Input
                      type="text"
                      placeholder="Buscar prestador..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="h-8 text-xs border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-500"
                    />
                    
                    <div className="max-h-36 overflow-y-auto border border-slate-700/50 rounded-md bg-slate-900/30 p-2 space-y-1.5 custom-scrollbar">
                      {providerStore.providers
                        .filter(p => p.id !== (editingProviderId || '') && p.active)
                        .filter(p => p.name.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                        .map(p => {
                          const isChecked = chatAllowedProviders.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setChatAllowedProviders(chatAllowedProviders.filter(id => id !== p.id));
                                  } else {
                                    setChatAllowedProviders([...chatAllowedProviders, p.id]);
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
                              />
                              <span className="text-xs text-slate-300 font-medium">{p.name}</span>
                              {p.role && <span className="text-[10px] text-slate-500">({p.role})</span>}
                            </label>
                          );
                        })}
                      {providerStore.providers.filter(p => p.id !== (editingProviderId || '') && p.active).length === 0 && (
                        <p className="text-[10px] text-slate-500 text-center py-2">Nenhum outro prestador ativo cadastrado.</p>
                      )}
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
                  {editingProviderId ? 'Salvar Alterações' : 'Salvar Prestador'}
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
