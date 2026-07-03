import { useState, useEffect } from 'react';
import { Settings, Save, Clock, Compass, MapPin, Trash2, Edit2, Plus, X, Shield, Download, RefreshCw, Eye, EyeOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useKioskStore } from '@/stores/useKioskStore';
import { WorkLocation, restoreFromHostingerBackup } from '@/lib/api.supabase';
import { speakAzure } from '@/lib/azureTTS';

const VOICE_OPTIONS = [
  { id: 'pt-BR-ThalitaNeural',    label: 'Thalita',    desc: 'Jovem, informal',      gender: '👩' },
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca',  desc: 'Natural, calorosa',    gender: '👩' },
  { id: 'pt-BR-BrendaNeural',    label: 'Brenda',     desc: 'Profissional, clara',   gender: '👩' },
  { id: 'pt-BR-AntonioNeural',   label: 'Antonio',    desc: 'Grave, formal',         gender: '👨' },
  { id: 'pt-BR-DonatoNeural',    label: 'Donato',     desc: 'Natural, amigável',    gender: '👨' },
  { id: 'pt-BR-FabioNeural',     label: 'Fabio',      desc: 'Jovem, descontraído',  gender: '👨' },
  { id: 'pt-BR-HumbertoNeural',  label: 'Humberto',   desc: 'Maduro, autoridade',   gender: '👨' },
  { id: 'pt-BR-JulioNeural',     label: 'Julio',      desc: 'Animado, expressivo',  gender: '👨' },
  { id: 'pt-BR-NicolauNeural',   label: 'Nicolau',    desc: 'Suave, profissional',  gender: '👨' },
] as const;

function add10Minutes(timeStr: string): string {
    if (!timeStr || !timeStr.includes(':')) return "09:10";
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return "09:10";
    
    m += 10;
    if (m >= 60) {
        m -= 60;
        h += 1;
        if (h >= 24) {
            h = 0;
        }
    }
    const paddedH = h.toString().padStart(2, '0');
    const paddedM = m.toString().padStart(2, '0');
    return `${paddedH}:${paddedM}`;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const store = useKioskStore();
    const [minCheckout, setMinCheckout] = useState(store.minCheckoutMinutes.toString());
    
    const handleBreakStartTimeChange = (val: string) => {
        setBreakStartTime(val);
        const calculatedEnd = add10Minutes(val);
        setBreakEndTime(calculatedEnd);
    };
    const [autoCheckoutTolerance, setAutoCheckoutTolerance] = useState((store.autoCheckoutToleranceMinutes || 15).toString());
    const [autoCheckoutWarning, setAutoCheckoutWarning] = useState((store.autoCheckoutWarningMinutes || 3).toString());
    const [locations, setLocations] = useState<WorkLocation[]>(store.workLocations || []);
    
    // Break times configurations
    const [breakStartTime, setBreakStartTime] = useState(store.breakStartTime || "09:00");
    const [breakEndTime, setBreakEndTime] = useState(store.breakEndTime || "09:15");
    
    // Backup & Security states
    const [backupKey, setBackupKey] = useState(store.backupKey || '');
    const [showKey, setShowKey] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // Voice settings
    const STORAGE_KEY = 'horaface_tts_voice';
    const [selectedVoice, setSelectedVoice] = useState<string>(
        () => localStorage.getItem(STORAGE_KEY) || 'pt-BR-ThalitaNeural'
    );
    const [previewLoading, setPreviewLoading] = useState(false);

    const handleVoiceSelect = (voiceId: string) => {
        setSelectedVoice(voiceId);
        localStorage.setItem(STORAGE_KEY, voiceId);
    };

    const handleVoicePreview = async (voiceId: string) => {
        setPreviewLoading(true);
        // Temporariamente sobrescreve para ouvir a voz selecionada
        const prev = localStorage.getItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, voiceId);
        try {
            await new Promise<void>((resolve) => {
                const utterance = `Olá! Eu sou a voz do HoraFace.`;
                speakAzure(utterance).finally(() => resolve());
                setTimeout(resolve, 4000);
            });
        } finally {
            // Restaura para a selecionada
            localStorage.setItem(STORAGE_KEY, selectedVoice);
            setPreviewLoading(false);
        }
    };

    // Form state
    const [locName, setLocName] = useState('');
    const [locLat, setLocLat] = useState('');
    const [locLng, setLocLng] = useState('');
    const [locRadius, setLocRadius] = useState('100');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);

    useEffect(() => {
        setMinCheckout(store.minCheckoutMinutes.toString());
        setAutoCheckoutTolerance((store.autoCheckoutToleranceMinutes || 15).toString());
        setAutoCheckoutWarning((store.autoCheckoutWarningMinutes || 3).toString());
        setLocations(store.workLocations || []);
        setBackupKey(store.backupKey || '');
        setBreakStartTime(store.breakStartTime || "09:00");
        setBreakEndTime(store.breakEndTime || "09:15");
    }, [store.minCheckoutMinutes, store.autoCheckoutToleranceMinutes, store.autoCheckoutWarningMinutes, store.workLocations, store.backupKey, store.breakStartTime, store.breakEndTime]);

    const handleCoordinateInput = (val: string, type: 'lat' | 'lng') => {
        if (val.includes(',')) {
            const parts = val.split(',');
            if (parts.length >= 2) {
                setLocLat(parts[0].trim());
                setLocLng(parts[1].trim());
                toast({ title: 'Coordenadas detectadas!', description: 'Latitude e Longitude foram divididas e preenchidas automaticamente.' });
                return;
            }
        }
        if (type === 'lat') {
            setLocLat(val);
        } else {
            setLocLng(val);
        }
    };

    const handleCaptureLocation = () => {
        if (!navigator.geolocation) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Geolocalização não suportada por este navegador.' });
            return;
        }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocLat(pos.coords.latitude.toFixed(6));
                setLocLng(pos.coords.longitude.toFixed(6));
                setGpsLoading(false);
                toast({ title: 'Localização Obtida!', description: 'Coordenadas preenchidas com a sua posição atual.' });
            },
            (err) => {
                setGpsLoading(false);
                toast({ variant: 'destructive', title: 'Erro ao obter localização', description: 'Verifique se a permissão de GPS está concedida.' });
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSetFormosaCoords = () => {
        setLocLat('-15.552214');
        setLocLng('-47.326528');
        setLocRadius('100');
        toast({ title: 'Coordenadas Formosa (Igreja) inseridas no formulário!' });
    };

    const handleAddOrUpdateLocation = () => {
        if (!locName.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira o nome do local.' });
            return;
        }
        if (!locLat.trim() || !locLng.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira a Latitude e Longitude.' });
            return;
        }
        const radiusVal = parseInt(locRadius, 10);
        if (isNaN(radiusVal) || radiusVal < 1) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira um raio de tolerância válido.' });
            return;
        }

        const newLoc: WorkLocation = {
            name: locName.trim(),
            lat: locLat.trim(),
            lng: locLng.trim(),
            radius: radiusVal
        };

        const updatedLocations = [...locations];
        if (editingIndex !== null) {
            updatedLocations[editingIndex] = newLoc;
            setEditingIndex(null);
            toast({ title: 'Local Atualizado!', description: `"${newLoc.name}" foi atualizado na lista.` });
        } else {
            if (locations.some(l => l.name.toLowerCase() === newLoc.name.toLowerCase())) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Já existe um local de trabalho com este nome.' });
                return;
            }
            updatedLocations.push(newLoc);
            toast({ title: 'Local Adicionado!', description: `"${newLoc.name}" foi adicionado à lista.` });
        }

        setLocations(updatedLocations);
        setLocName('');
        setLocLat('');
        setLocLng('');
        setLocRadius('100');
    };

    const handleEditLocation = (index: number) => {
        const loc = locations[index];
        setLocName(loc.name);
        setLocLat(loc.lat);
        setLocLng(loc.lng);
        setLocRadius(loc.radius.toString());
        setEditingIndex(index);
    };

    const handleDeleteLocation = (index: number) => {
        const updatedLocations = locations.filter((_, i) => i !== index);
        setLocations(updatedLocations);
        toast({ title: 'Local Removido!', description: 'O local de trabalho foi removido da lista.' });
        if (editingIndex === index) {
            setEditingIndex(null);
            setLocName('');
            setLocLat('');
            setLocLng('');
            setLocRadius('100');
        }
    };

    const handleSave = async () => {
        const val = parseInt(minCheckout, 10);
        if (isNaN(val) || val < 1) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Insira um valor maior que zero para o tempo mínimo.' });
            return;
        }

        const toleranceVal = parseInt(autoCheckoutTolerance, 10);
        if (isNaN(toleranceVal) || toleranceVal < 1) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Insira um valor maior que zero para a tolerância de saída automática.' });
            return;
        }

        const warningVal = parseInt(autoCheckoutWarning, 10);
        if (isNaN(warningVal) || warningVal < 1) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Insira um valor maior que zero para a tolerância de início do alerta.' });
            return;
        }

        if (warningVal > toleranceVal) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O tempo de início do alerta não pode ser maior que o tempo de encerramento automático.' });
            return;
        }

        try {
            const res = await store.updateSettings({ 
                minCheckoutMinutes: val,
                autoCheckoutToleranceMinutes: toleranceVal,
                autoCheckoutWarningMinutes: warningVal,
                workLocations: locations,
                breakStartTime: breakStartTime,
                breakEndTime: breakEndTime
            });
            
            if (res && !res.success) {
                throw res.error;
            }
            
            toast({ title: 'Configurações Salvas!', description: 'O tempo de permanência, os horários do intervalo de café, os parâmetros de encerramento automático e os locais foram atualizados.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message || String(err) });
        }
    };

    const handleSaveBackupKey = async () => {
        if (!backupKey.trim()) {
            toast({ variant: 'destructive', title: 'Chave Inválida', description: 'Por favor, insira uma chave de segurança para o backup.' });
            return;
        }
        setIsSavingKey(true);
        try {
            // 1. Salva no banco de dados do Supabase
            const res = await store.updateSettings({ backupKey: backupKey.trim() });
            if (res && !res.success) {
                throw res.error;
            }

            // 2. Transmite a chave para o arquivo .key seguro no servidor
            const response = await fetch('/backup.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'save_key',
                    key: backupKey.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`Falha ao salvar no servidor PHP (HTTP ${response.status})`);
            }

            const serverRes = await response.json();
            if (!serverRes.success) {
                throw new Error(serverRes.message || 'Erro reportado pelo servidor.');
            }

            toast({ title: 'Chave Salva com Sucesso!', description: 'A chave de segurança foi atualizada no Supabase e no servidor Hostinger.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro ao salvar chave', description: err.message || String(err) });
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleDownloadBackup = () => {
        const keyToUse = backupKey.trim() || store.backupKey || '';
        if (!keyToUse) {
            toast({ variant: 'destructive', title: 'Chave Não Configurada', description: 'Insira a chave de segurança para baixar o backup.' });
            return;
        }
        
        const downloadUrl = `/restore_backup.php?key=${encodeURIComponent(keyToUse)}&download=true`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Download Iniciado', description: 'Buscando o arquivo de backup no servidor...' });
    };

    const handleDownloadSystemClone = () => {
        const keyToUse = backupKey.trim() || store.backupKey || '';
        if (!keyToUse) {
            toast({ variant: 'destructive', title: 'Chave Não Configurada', description: 'Insira a chave de segurança para baixar o clone.' });
            return;
        }
        
        const downloadUrl = `/backup_system_clone.php?key=${encodeURIComponent(keyToUse)}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Criando Clone (.zip)', description: 'Empacotando todos os arquivos de produção no servidor Hostinger...' });
    };

    const handleRestoreBackup = async () => {
        const keyToUse = backupKey.trim() || store.backupKey || '';
        if (!keyToUse) {
            toast({ variant: 'destructive', title: 'Chave Não Configurada', description: 'Insira a chave de segurança para validar e resgatar o backup.' });
            return;
        }
        
        if (!confirm("Tem certeza de que deseja resgatar todas as marcações de ponto do backup para o Supabase? Isso realizará um upsert de todos os registros.")) {
            return;
        }

        setIsRestoring(true);
        try {
            const res = await restoreFromHostingerBackup(keyToUse);
            if (!res.success) {
                throw new Error(res.error || "Erro de rede desconhecido ao restaurar backup.");
            }
            
            toast({ 
                title: 'Backup Resgatado com Sucesso!', 
                description: `Total de ${res.count} marcações de ponto restabelecidas no Supabase.` 
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro na Restauração', description: err.message || String(err) });
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
                        Configurações Globais
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary">
                        Ajuste os parâmetros de funcionamento do sistema
                    </p>
                </div>
            </div>

            <div className="max-w-3xl">
                <div className="hud-card animate-fade-up rounded-lg p-6 sm:p-8 border border-primary/20 bg-elevated/50 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                    <div className="mb-6 flex items-center gap-4 border-b border-border pb-6">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                            <Settings className="size-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-heading text-xl font-semibold text-text-primary">Regras de Medição de Horas</h2>
                            <p className="text-sm text-text-secondary">Regras globais para o registro de horas em Quiosque ou Web.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4 bg-background/50 p-5 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="size-4 text-cyan-400" />
                                <Label className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tempo Mínimo de Permanência (Minutos)</Label>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                                <Input
                                    type="number"
                                    min="1"
                                    value={minCheckout}
                                    onChange={(e) => setMinCheckout(e.target.value)}
                                    className="w-full sm:w-32 border border-primary/30 bg-black/60 text-lg font-mono text-center tracking-widest text-cyan-400 focus-visible:ring-primary h-12 rounded-lg"
                                />
                                <p className="max-w-md text-sm text-text-muted mt-1 leading-relaxed">
                                    Estipula o <strong>período de carência</strong> que o sistema exige obrigatoriamente antes de permitir que o usuário cadastre sua Saída no mesmo dia. <br />
                                    Isso previne <i>cliques duplos e fraude</i> de registro seguidos.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 bg-background/50 p-5 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="size-4 text-rose-400" />
                                <Label className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tolerância de Saída Automática (Minutos)</Label>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                                <Input
                                    type="number"
                                    min="1"
                                    value={autoCheckoutTolerance}
                                    onChange={(e) => setAutoCheckoutTolerance(e.target.value)}
                                    className="w-full sm:w-32 border border-primary/30 bg-black/60 text-lg font-mono text-center tracking-widest text-rose-400 focus-visible:ring-primary h-12 rounded-lg"
                                />
                                <p className="max-w-md text-sm text-text-muted mt-1 leading-relaxed">
                                    Estipula o tempo de <strong>tolerância extra</strong> após o fim do turno. Ao ultrapassar este limite, a sessão é fechada automaticamente registrando <i>exatamente</i> a hora limite da tolerância e uma foto de aviso na auditoria.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 bg-background/50 p-5 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="size-4 text-amber-400" />
                                <Label className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tolerância para Início do Alerta (Minutos)</Label>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                                <Input
                                    type="number"
                                    min="1"
                                    value={autoCheckoutWarning}
                                    onChange={(e) => setAutoCheckoutWarning(e.target.value)}
                                    className="w-full sm:w-32 border border-primary/30 bg-black/60 text-lg font-mono text-center tracking-widest text-amber-400 focus-visible:ring-primary h-12 rounded-lg"
                                />
                                <p className="max-w-md text-sm text-text-muted mt-1 leading-relaxed">
                                    Estipula a <strong>carência em minutos</strong> após o fim do turno para iniciar os alertas sonoros (bipes) e vibrações no celular do colaborador.
                                </p>
                            </div>
                        </div>

                        {/* Seção Múltiplos Locais de Trabalho (GPS) */}
                        <div className="space-y-6 bg-background/50 p-5 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-1">
                                <Compass className="size-4 text-emerald-400" />
                                <Label className="text-sm font-semibold text-text-primary uppercase tracking-wider">Locais de Trabalho & Cerca Geográfica (GPS)</Label>
                            </div>
                            
                            <p className="text-xs text-text-muted leading-relaxed">
                                Cadastre os endereços permitidos para o registro de horas via mobile. <br />
                                Associe cada prestador ao seu local na aba "Prestadores". Se o prestador não possuir local assinalado, o GPS não será validado (Modo Livre).
                            </p>

                            {/* Lista de locais cadastrados */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Locais Cadastrados ({locations.length})</h3>
                                {locations.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-black/20 text-xs text-text-muted">
                                        Nenhum local cadastrado. Use o formulário abaixo para adicionar.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1">
                                        {locations.map((loc, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-black/40 hover:border-primary/20 transition-all">
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-sm text-cyan-400">{loc.name}</div>
                                                    <div className="text-[11px] font-mono text-text-muted">
                                                        GPS: {loc.lat}, {loc.lng} ({loc.radius}m)
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleEditLocation(idx)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleDeleteLocation(idx)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Formulário de Adição/Edição */}
                            <div className="pt-4 border-t border-border space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                                        {editingIndex !== null ? 'Editar Local de Trabalho' : 'Cadastrar Novo Local'}
                                    </h3>
                                    {editingIndex !== null && (
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setEditingIndex(null);
                                                setLocName('');
                                                setLocLat('');
                                                setLocLng('');
                                                setLocRadius('100');
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-text-muted hover:text-text-primary"
                                        >
                                            <X className="size-3 mr-1" /> Cancelar
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-text-secondary">Nome do Local</Label>
                                        <Input
                                            type="text"
                                            placeholder="Ex: Sede Formosa"
                                            value={locName}
                                            onChange={(e) => setLocName(e.target.value)}
                                            className="border border-primary/30 bg-black/60 text-cyan-400 focus-visible:ring-primary text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-text-secondary">Raio de Tolerância (Metros)</Label>
                                        <Input
                                            type="number"
                                            min="10"
                                            placeholder="Ex: 100"
                                            value={locRadius}
                                            onChange={(e) => setLocRadius(e.target.value)}
                                            className="border border-primary/30 bg-black/60 font-mono text-cyan-400 focus-visible:ring-primary text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-text-secondary">Latitude</Label>
                                        <Input
                                            type="text"
                                            placeholder="Ex: -15.552214"
                                            value={locLat}
                                            onChange={(e) => handleCoordinateInput(e.target.value, 'lat')}
                                            className="border border-primary/30 bg-black/60 font-mono text-cyan-400 focus-visible:ring-primary text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-text-secondary">Longitude</Label>
                                        <Input
                                            type="text"
                                            placeholder="Ex: -47.326528"
                                            value={locLng}
                                            onChange={(e) => handleCoordinateInput(e.target.value, 'lng')}
                                            className="border border-primary/30 bg-black/60 font-mono text-cyan-400 focus-visible:ring-primary text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <Button
                                        type="button"
                                        onClick={handleAddOrUpdateLocation}
                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
                                    >
                                        {editingIndex !== null ? (
                                            <>
                                                <Save className="size-3.5" />
                                                Atualizar na Lista
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="size-3.5" />
                                                Adicionar na Lista
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleCaptureLocation}
                                        disabled={gpsLoading}
                                        variant="outline"
                                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs h-9"
                                    >
                                        {gpsLoading ? 'Obtendo GPS...' : (
                                            <>
                                                <MapPin className="size-3.5 mr-1" />
                                                Capturar Meu GPS
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleSetFormosaCoords}
                                        variant="outline"
                                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs h-9"
                                    >
                                        Preset Formosa (Igreja)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO SEGURANÇA E BACKUP DO SERVIDOR */}
                        <div className="space-y-4 bg-background/50 p-5 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="size-4 text-emerald-400" />
                                <Label className="text-sm font-semibold text-text-primary uppercase tracking-wider">Segurança & Backups do Servidor</Label>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed">
                                Configure a chave de segurança para encriptar e acessar os backups automáticos salvos na Hostinger de forma independente.
                            </p>
                            
                            <div className="space-y-3">
                                <div className="flex flex-col gap-2">
                                    <Label className="text-xs text-text-secondary">Chave de Segurança do Backup</Label>
                                    <div className="flex gap-2 max-w-md relative">
                                        <Input
                                            type={showKey ? "text" : "password"}
                                            placeholder="Chave secreta de backup"
                                            value={backupKey}
                                            onChange={(e) => setBackupKey(e.target.value)}
                                            className="border border-primary/30 bg-black/60 font-mono text-emerald-400 focus-visible:ring-primary text-xs pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-28 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary animate-fade"
                                            style={{ right: "120px" }}
                                        >
                                            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                        <Button
                                            type="button"
                                            onClick={handleSaveBackupKey}
                                            disabled={isSavingKey}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4"
                                        >
                                            {isSavingKey ? "Salvando..." : "Salvar Chave"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleDownloadBackup}
                                        disabled={isDownloading}
                                        variant="outline"
                                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs h-9 gap-1.5"
                                    >
                                        <Download className="size-3.5" />
                                        {isDownloading ? "Baixando..." : "Baixar Backup (.json)"}
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleDownloadSystemClone}
                                        variant="outline"
                                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-xs h-9 gap-1.5"
                                    >
                                        <Download className="size-3.5" />
                                        Baixar Clone do Sistema (.zip)
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleRestoreBackup}
                                        disabled={isRestoring}
                                        variant="outline"
                                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs h-9 gap-1.5"
                                    >
                                        <RefreshCw className={`size-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                                        {isRestoring ? "Restaurando..." : "Resgatar Backup"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ===== VOZ DO SISTEMA ===== */}
                        <div className="space-y-4 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                    <Volume2 className="size-4 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-200">Voz do Sistema</h3>
                                    <p className="text-xs text-slate-500">Voz Azure Neural falada ao registrar entrada/saída</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {VOICE_OPTIONS.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => handleVoiceSelect(v.id)}
                                        className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedVoice === v.id
                                                ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <span className="text-2xl">{v.gender}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${
                                                selectedVoice === v.id ? 'text-violet-300' : 'text-slate-200'
                                            }`}>{v.label}</p>
                                            <p className="text-xs text-slate-500 truncate">{v.desc}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleVoicePreview(v.id); }}
                                            disabled={previewLoading}
                                            title="Ouvir prévia"
                                            className="shrink-0 size-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 transition-colors disabled:opacity-40"
                                        >
                                            <Volume2 className="size-3.5" />
                                        </button>
                                        {selectedVoice === v.id && (
                                            <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-600">✅ A voz é salva automaticamente ao clicar no card.</p>
                        </div>

                        <div className="pt-2">
                            <Button onClick={handleSave} className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:scale-[1.02]">
                                <Save className="size-4" />
                                Salvar Todas as Configurações
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
