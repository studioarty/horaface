import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, CheckCircle2, Circle, Eye, PlayCircle, Settings2, MonitorSmartphone, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useKioskStore } from "@/stores/useKioskStore";
import { useToast } from "@/hooks/use-toast";
import { fetchAllKiosks } from "@/lib/api";
import type { KioskCampaign, KioskLayoutType } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopySlash, Columns3, LayoutPanelLeft } from "lucide-react";

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CampaignsTab() {
    const kioskStore = useKioskStore();
    const { toast } = useToast();

    // Dados de Ref
    const [availableKiosks, setAvailableKiosks] = useState<{ id: string, name: string }[]>([]);

    // Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newCampName, setNewCampName] = useState("");
    const [newCampType, setNewCampType] = useState<'immediate' | 'scheduled'>("immediate");
    const [newCampStart, setNewCampStart] = useState("");
    const [newCampEnd, setNewCampEnd] = useState("");
    const [selectedLayout, setSelectedLayout] = useState<KioskLayoutType>('fullscreen');
    const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
    const [selectedSidebarIds, setSelectedSidebarIds] = useState<string[]>([]);
    const [selectedKioskIds, setSelectedKioskIds] = useState<string[]>([]);
    const [activeZoneTab, setActiveZoneTab] = useState<'main'|'sidebar'>('main');

    useEffect(() => {
        fetchAllKiosks().then(data => setAvailableKiosks(data)).catch(console.error);
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setNewCampName("");
        setNewCampType("immediate");
        setNewCampStart("");
        setNewCampEnd("");
        setSelectedLayout("fullscreen");
        setSelectedMediaIds([]);
        setSelectedSidebarIds([]);
        setSelectedKioskIds([]);
        setActiveZoneTab('main');
    }

    const openEditModal = (c: KioskCampaign) => {
        setEditingId(c.id);
        setNewCampName(c.name);
        setNewCampType(c.executionType);
        setNewCampStart(c.startDate ? c.startDate.split('T')[0] : "");
        setNewCampEnd(c.endDate ? c.endDate.split('T')[0] : "");
        setSelectedLayout(c.layoutType || 'fullscreen');
        setSelectedMediaIds(c.mediaItems || []);
        setSelectedSidebarIds(c.sidebarItems || []);
        setSelectedKioskIds(c.targetKiosks || []);
        setActiveZoneTab('main');
        setIsModalOpen(true);
    };

    const handleSaveCampaign = async () => {
        if (!newCampName.trim() || selectedMediaIds.length === 0) {
            toast({ variant: 'destructive', title: 'Nome e no mínimo 1 Mídia são obrigatórios.' });
            return;
        }

        const campaign: Omit<KioskCampaign, "id"> = {
            name: newCampName,
            status: 'active',
            executionType: newCampType,
            mediaItems: selectedMediaIds,
            scheduleRules: { startTime: '00:00', endTime: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
            targetKiosks: selectedKioskIds.length > 0 ? selectedKioskIds : undefined,
            layoutType: selectedLayout,
            sidebarItems: selectedLayout !== 'fullscreen' ? selectedSidebarIds : undefined
        };

        if (newCampType === 'scheduled') {
            if (!newCampStart) {
                toast({ variant: 'destructive', title: 'Data de início obrigatória no modo Agendado.' });
                return;
            }
            campaign.startDate = new Date(newCampStart).toISOString();
            if (newCampEnd) campaign.endDate = new Date(newCampEnd).toISOString();
        }

        if (editingId) {
            await kioskStore.updateCampaign(editingId, campaign);
            toast({ title: 'Campanha Atualizada!' });
        } else {
            await kioskStore.createCampaign(campaign);
            toast({ title: 'Campanha Criada com sucesso!' });
        }

        setIsModalOpen(false);
        resetForm();
    };

    const handleDeleteCampaign = async (id: string) => {
        await kioskStore.deleteCampaign(id);
        toast({ title: 'Campanha removida.' });
    };

    const toggleMediaSelection = (id: string) => {
        if (activeZoneTab === 'main') {
            setSelectedMediaIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedSidebarIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const updateScheduleDay = (campaign: KioskCampaign, dayIndex: number, isActive: boolean) => {
        const s = campaign.scheduleRules || { startTime: '00:00', endTime: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };
        const newDays = isActive ? [...new Set([...s.days, dayIndex])] : s.days.filter(d => d !== dayIndex);
        kioskStore.updateCampaign(campaign.id, { scheduleRules: { ...s, days: newDays } });
    };

    return (
        <div className="space-y-6 mt-4">

            <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div>
                    <h4 className="text-sm font-semibold text-slate-200">Campanhas Ativas</h4>
                    <p className="text-xs text-slate-500">Agrupe mídias da biblioteca e agende suas exibições.</p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger>
                        <span className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow transition-colors hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" onClick={resetForm}>
                            <Plus className="size-4 mr-2" /> Nova Campanha
                        </span>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] bg-[#0d1117] border-slate-800 text-slate-200 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl text-cyan-400 flex items-center gap-2">
                                <Settings2 className="size-5" />
                                {editingId ? 'Editar Campanha' : 'Criar Campanha de Quiosque'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            {/* Step 1: Info Básica */}
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-slate-400">Nome da Campanha</Label>
                                <Input
                                    id="name"
                                    value={newCampName}
                                    onChange={(e) => setNewCampName(e.target.value)}
                                    placeholder="Ex: Oferta de Natal 2026"
                                    className="bg-slate-900 border-slate-800"
                                />
                            </div>

                            {/* Step 1.5: Quiosques Alvo */}
                            <div className="grid gap-2">
                                <Label className="text-slate-400">Quiosques Alvo (Opcional)</Label>
                                <div className="p-3 border border-slate-800 rounded-md bg-slate-900/50 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-7 text-xs ${selectedKioskIds.length === 0 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                                        onClick={() => setSelectedKioskIds([])}
                                    >
                                        Transmitir para Todos
                                    </Button>

                                    {availableKiosks.map(k => {
                                        const isSelected = selectedKioskIds.includes(k.id);
                                        return (
                                            <Button
                                                key={k.id}
                                                variant="outline"
                                                size="sm"
                                                className={`h-7 text-xs flex items-center gap-1.5 ${isSelected ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                                                onClick={() => {
                                                    setSelectedKioskIds(prev =>
                                                        prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id]
                                                    )
                                                }}
                                            >
                                                <MonitorSmartphone className="size-3" />
                                                {k.name}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Step 2: Tipo de Agendamento */}
                            <div className="space-y-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800/50">
                                <Label className="text-slate-400">Regra de Início</Label>
                                <div className="flex gap-4">
                                    <div
                                        className={`flex-1 p-3 rounded-md border cursor-pointer transition-all ${newCampType === 'immediate' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                                        onClick={() => setNewCampType('immediate')}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {newCampType === 'immediate' ? <CheckCircle2 className="size-4 text-cyan-400" /> : <Circle className="size-4 text-slate-500" />}
                                            <span className="font-semibold text-sm">Rodar Agora</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-6">Entra no ar imediatamente para sempre.</p>
                                    </div>
                                    <div
                                        className={`flex-1 p-3 rounded-md border cursor-pointer transition-all ${newCampType === 'scheduled' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                                        onClick={() => setNewCampType('scheduled')}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {newCampType === 'scheduled' ? <CheckCircle2 className="size-4 text-cyan-400" /> : <Circle className="size-4 text-slate-500" />}
                                            <span className="font-semibold text-sm">Data Programada</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 pl-6">Você escolhe a faixa de dias inicial/final do evento.</p>
                                    </div>
                                </div>

                                {newCampType === 'scheduled' && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <Label className="text-xs text-slate-500">Início da Campanha</Label>
                                            <Input type="date" value={newCampStart} onChange={e => setNewCampStart(e.target.value)} className="h-8 mt-1 text-xs bg-slate-950 border-slate-800" />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-500">Fim (Opcional)</Label>
                                            <Input type="date" value={newCampEnd} onChange={e => setNewCampEnd(e.target.value)} className="h-8 mt-1 text-xs bg-slate-950 border-slate-800" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Layout e Zonas */}
                            <div className="space-y-3 p-4 rounded-lg bg-[#0d1317] border border-slate-800/50">
                                <Label className="text-slate-400">Desenho da Tela (Multi-Zone Layout)</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div onClick={() => setSelectedLayout('fullscreen')} className={`p-3 flex flex-col items-center gap-2 rounded-lg border cursor-pointer transition-colors ${selectedLayout==='fullscreen' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                                            <div className="w-10 h-6 bg-indigo-500/40 rounded-sm" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-slate-300">Tela Cheia</span>
                                    </div>
                                    <div onClick={() => setSelectedLayout('sidebar_right')} className={`p-3 flex flex-col items-center gap-2 rounded-lg border cursor-pointer transition-colors ${selectedLayout==='sidebar_right' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <div className="w-12 h-8 bg-slate-800 rounded flex items-center gap-1 p-1 border border-slate-700">
                                            <div className="w-7 h-full bg-indigo-500/40 rounded-sm" />
                                            <div className="flex-1 h-full bg-emerald-500/40 rounded-sm" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-slate-300">Barra Secundária</span>
                                    </div>
                                    <div onClick={() => setSelectedLayout('split_half')} className={`p-3 flex flex-col items-center gap-2 rounded-lg border cursor-pointer transition-colors ${selectedLayout==='split_half' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                                        <div className="w-12 h-8 bg-slate-800 rounded flex items-center gap-1 p-1 border border-slate-700">
                                            <div className="w-1/2 h-full bg-indigo-500/40 rounded-sm" />
                                            <div className="w-1/2 h-full bg-emerald-500/40 rounded-sm" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-slate-300">Dividida ao Meio</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4: Seleção de Mídia */}
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-end">
                                    <Label className="text-slate-400">Atribuir Conteúdos às Zonas</Label>
                                </div>
                                
                                <Tabs value={activeZoneTab} onValueChange={(v) => setActiveZoneTab(v as any)} className="w-full">
                                    <TabsList className="w-full bg-slate-900 border border-slate-800 p-1 mb-4 h-11">
                                        <TabsTrigger value="main" className="flex-1 text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                                            Zona Principal ({selectedMediaIds.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="sidebar" disabled={selectedLayout === 'fullscreen'} className="flex-1 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                                            Zona Secundária ({selectedSidebarIds.length})
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="main" className="m-0 border border-slate-800 rounded-lg p-2 bg-slate-900/40 h-[280px] overflow-y-auto">
                                        {kioskStore.library.length === 0 ? (
                                            <div className="text-center p-6 text-sm text-slate-500 mt-10">Biblioteca vazia.</div>
                                        ) : (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {kioskStore.library.map(m => {
                                                    const isSelected = selectedMediaIds.includes(m.id);
                                                    return (
                                                        <div key={m.id} onClick={() => toggleMediaSelection(m.id)} className={`relative group cursor-pointer aspect-video rounded-md overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-500 blur-0' : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}`}>
                                                            {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover pointer-events-none" /> : m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center bg-slate-800"><p className="text-[10px] font-bold text-slate-400 uppercase">{m.type}</p></div>}
                                                            <div className={`absolute inset-0 bg-indigo-500/20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                                            {isSelected && <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5"><CheckCircle2 className="size-3" /></div>}
                                                            <div className="absolute bottom-0 inset-x-0 bg-black/80 p-0.5 truncate text-[9px] text-white text-center font-medium">{m.label}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="sidebar" className="m-0 border border-slate-800 rounded-lg p-2 bg-slate-900/40 h-[280px] overflow-y-auto">
                                        {kioskStore.library.length === 0 ? (
                                            <div className="text-center p-6 text-sm text-slate-500 mt-10">Biblioteca vazia.</div>
                                        ) : (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {kioskStore.library.map(m => {
                                                    const isSelected = selectedSidebarIds.includes(m.id);
                                                    return (
                                                        <div key={m.id} onClick={() => toggleMediaSelection(m.id)} className={`relative group cursor-pointer aspect-video rounded-md overflow-hidden border-2 transition-all ${isSelected ? 'border-emerald-500 blur-0' : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}`}>
                                                            {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover pointer-events-none" /> : m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center bg-slate-800"><p className="text-[10px] font-bold text-slate-400 uppercase">{m.type}</p></div>}
                                                            <div className={`absolute inset-0 bg-emerald-500/20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                                            {isSelected && <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5"><CheckCircle2 className="size-3" /></div>}
                                                            <div className="absolute bottom-0 inset-x-0 bg-black/80 p-0.5 truncate text-[9px] text-white text-center font-medium">{m.label}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold" onClick={handleSaveCampaign}>
                                {editingId ? 'Salvar Alterações' : 'Gerar Campanha Automática'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Lista de Campanhas */}
            <div className="space-y-4">
                {kioskStore.campaigns.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-800 py-12 text-center bg-slate-900/20">
                        <PlayCircle className="size-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-medium">Nenhuma Campanha em Execução</p>
                        <p className="text-xs text-slate-500">Crie campanhas dinâmicas clicando no botão acima para o quiosque operar.</p>
                    </div>
                ) : (
                    kioskStore.campaigns.map(c => {
                        const s = c.scheduleRules || { startTime: '00:00', endTime: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };
                        const mCount = c.mediaItems.length;
                        const isOutdated = c.endDate && new Date(c.endDate) < new Date();

                        return (
                            <div key={c.id} className="rounded-xl border border-slate-800 bg-elevated shadow-md overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/40">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${c.status === 'active' && !isOutdated ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-semibold text-sm text-slate-200">{c.name}</h5>
                                                {isOutdated && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Expirada</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider font-semibold">
                                                {c.executionType === 'immediate' ? 'Execução Contínua' : `Agendada: ${c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : ''} até ${c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : 'Sem fim'}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium text-slate-400">{c.status === 'active' ? 'Ativada' : 'Pausada'}</span>
                                            <Switch
                                                checked={c.status === 'active'}
                                                onCheckedChange={(v) => kioskStore.updateCampaign(c.id, { status: v ? 'active' : 'inactive' })}
                                            />
                                        </div>
                                        <div className="flex items-center border-l border-slate-800 pl-4 gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(c)} className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10">
                                                <Edit className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCampaign(c.id)} className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex flex-wrap lg:flex-nowrap gap-6 items-center bg-[#0d1117]/50">
                                    <div className="shrink-0 space-y-2 lg:w-48 w-full border-b lg:border-b-0 lg:border-r border-slate-800/50 pb-4 lg:pb-0 lg:pr-6">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Exibição Diária</div>

                                        <div className="flex flex-wrap gap-1">
                                            {DAYS_OF_WEEK.map((day, idx) => (
                                                <button
                                                    key={day}
                                                    onClick={() => updateScheduleDay(c, idx, !s.days.includes(idx))}
                                                    className={`text-[9.5px] px-1.5 py-0.5 rounded-sm font-medium transition-colors ${s.days.includes(idx)
                                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                        : 'bg-slate-800/50 text-slate-500 border border-transparent'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-2">
                                            <Clock className="size-3.5 text-slate-600" />
                                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-1.5 w-max">
                                                <input type="time" value={s.startTime} onChange={e => kioskStore.updateCampaign(c.id, { scheduleRules: { ...s, startTime: e.target.value } })} className="bg-transparent text-[11px] text-slate-300 w-[55px] outline-none border-none py-1.5 text-center font-mono" />
                                                <span className="text-[9px] text-slate-600 font-bold">AS</span>
                                                <input type="time" value={s.endTime} onChange={e => kioskStore.updateCampaign(c.id, { scheduleRules: { ...s, endTime: e.target.value } })} className="bg-transparent text-[11px] text-slate-300 w-[55px] outline-none border-none py-1.5 text-center font-mono" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Eye className="size-3.5 text-slate-500" />
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Conteúdos Injetados ({mCount}{c.layoutType && c.layoutType !== 'fullscreen' ? ` + ${c.sidebarItems?.length||0} Aux` : ''})</span>
                                        </div>

                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                            {c.mediaItems.map(mId => {
                                                const mediaDb = kioskStore.library.find(l => l.id === mId);
                                                if (!mediaDb) return null;
                                                return (
                                                    <div key={mId} className="shrink-0 w-24 h-14 rounded overflow-hidden relative border border-slate-800 group">
                                                        {mediaDb.type === 'video' ? <video src={mediaDb.url} className="w-full h-full object-cover opacity-70" /> : mediaDb.type === 'image' ? <img src={mediaDb.url} className="w-full h-full object-cover opacity-90" /> : <div className="w-full h-full flex items-center justify-center bg-slate-800"><p className="text-[7px] font-bold text-slate-400 uppercase">{mediaDb.type}</p></div>}
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[8px] text-white truncate text-center backdrop-blur-sm">
                                                            {mediaDb.label}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {c.layoutType && c.layoutType !== 'fullscreen' && c.sidebarItems?.map(mId => {
                                                const mediaDb = kioskStore.library.find(l => l.id === mId);
                                                if (!mediaDb) return null;
                                                return (
                                                    <div key={`sidebar-${mId}`} className="shrink-0 w-24 h-14 rounded overflow-hidden relative border border-emerald-500/50 group opacity-80">
                                                        {mediaDb.type === 'video' ? <video src={mediaDb.url} className="w-full h-full object-cover opacity-70" /> : mediaDb.type === 'image' ? <img src={mediaDb.url} className="w-full h-full object-cover opacity-90" /> : <div className="w-full h-full flex items-center justify-center bg-slate-800"><p className="text-[7px] font-bold text-slate-400 uppercase">{mediaDb.type}</p></div>}
                                                        <div className="absolute bottom-0 inset-x-0 bg-emerald-900/90 px-1 py-0.5 text-[8px] text-emerald-100 truncate text-center backdrop-blur-sm border-t border-emerald-500/50">
                                                            [Sub] {mediaDb.label}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

        </div>
    );
}
