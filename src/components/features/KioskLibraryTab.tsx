import { useRef, useState } from "react";
import { Upload, Video, Trash2, Link as LinkIcon, Loader2, StopCircle, PlayCircle, PlusCircle, LayoutTemplate, Youtube, Cloud, Clock, MonitorSmartphone, AlignLeft, Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKioskStore } from "@/stores/useKioskStore";
import { useToast } from "@/hooks/use-toast";
import { uploadKioskMedia, deleteKioskMedia } from "@/lib/api";

export function LibraryTab() {
    const kioskStore = useKioskStore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showAddUrl, setShowAddUrl] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleAddByUrl = async () => {
        if (!newUrl) {
            toast({ variant: 'destructive', title: 'URL obrigatória' });
            return;
        }
        const isVideo = newUrl.match(/\.(mp4|webm|ogv)$/i);
        await kioskStore.addLibraryItem({
            url: newUrl,
            label: newLabel || (isVideo ? 'Vídeo Institucional' : 'Imagem'),
            type: isVideo ? 'video' : 'image',
        });
        setNewUrl('');
        setNewLabel('');
        setShowAddUrl(false);
        toast({ title: 'Mídia adicionada na Biblioteca' });
    };

    // State for Widget Dialog
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [widgetType, setWidgetType] = useState<'youtube' | 'weather' | 'clock' | 'iframe' | 'richtext'>('youtube');
    const [widgetLabel, setWidgetLabel] = useState("");
    const [widgetUrl, setWidgetUrl] = useState("");
    const [widgetContent, setWidgetContent] = useState("");

    const handleCreateWidget = async () => {
        if (!widgetLabel) {
            toast({ variant: 'destructive', title: 'Dê um nome ao Widget' });
            return;
        }
        if ((widgetType === 'youtube' || widgetType === 'iframe') && !widgetUrl) {
            toast({ variant: 'destructive', title: 'Forneça a URL do conteúdo' });
            return;
        }

        await kioskStore.addLibraryItem({
            url: widgetUrl || "",
            label: widgetLabel,
            type: widgetType,
            content: widgetContent,
            options: {}, // Default options
            durationSec: 15 // Default duration for non-interactive things
        });

        setIsWidgetModalOpen(false);
        setWidgetLabel("");
        setWidgetUrl("");
        setWidgetContent("");
        toast({ title: 'Widget Adicionado com Sucesso!' });
    };

    const getVideoDuration = (file: File): Promise<number> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(Math.round(video.duration));
            };
            video.src = URL.createObjectURL(file);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        const total = files.length;
        let completed = 0;
        let success = 0;

        for (const file of Array.from(files)) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');

            if (!isImage && !isVideo) {
                toast({ variant: 'destructive', title: `"${file.name}" formato não suportado` });
                completed++;
                setUploadProgress(Math.round((completed / total) * 100));
                continue;
            }

            const maxSize = isVideo ? 250 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                toast({ variant: 'destructive', title: `"${file.name}" excede limite` });
                completed++;
                setUploadProgress(Math.round((completed / total) * 100));
                continue;
            }

            try {
                let videoDur: number | undefined;
                if (isVideo) {
                    videoDur = await getVideoDuration(file);
                }

                const res = await uploadKioskMedia(file);
                if (res.url) {
                    const label = file.name.replace(/\.[^.]+$/, '');
                    await kioskStore.addLibraryItem({
                        url: res.url,
                        label,
                        type: isVideo ? 'video' : 'image',
                        durationSec: videoDur,
                    });
                    success++;
                } else {
                    toast({ variant: 'destructive', title: `Falha no Servidor`, description: res.errorMsg || 'Erro' });
                }
            } catch (err: any) {
                console.error('Upload error:', err);
                toast({ variant: 'destructive', title: `Falha na Rede`, description: err.message || 'Erro inesperado' });
            }

            completed++;
            setUploadProgress(Math.round((completed / total) * 100));
        }

        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (success > 0) {
            toast({ title: `${success} mídia(s) inseridas na Biblioteca` });
        }
    };

    const handleRemoveMedia = async (id: string, url: string) => {
        if (url.includes('kiosk-images') || url.includes('/media/')) {
            await deleteKioskMedia(url);
        }
        await kioskStore.removeLibraryItem(id);
        toast({ title: 'Mídia removida da Biblioteca' });
    };

    return (
        <div className="space-y-6 mt-4">
            <div className="mb-4 space-y-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Botão Upload Arquivo */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex flex-col flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/40 bg-slate-900/40 hover:bg-cyan-500/5 p-6 transition-all duration-200 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="size-8 text-cyan-400 animate-spin" />
                                <p className="text-sm font-medium text-cyan-400">Enviando... {uploadProgress}%</p>
                                <div className="w-full max-w-[200px] h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                                    <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex size-14 items-center justify-center rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                    <Upload className="size-6 text-cyan-400" />
                                </div>
                                <div className="text-center mt-1">
                                    <p className="text-sm font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">
                                        Upload de Mídia Local (Foto/Vídeo)
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">MP4, WebM, JPG, PNG Instatâneo</p>
                                </div>
                            </>
                        )}
                    </button>

                    {/* Botão Adicionar Widget (Dialog Trigger) */}
                    <Dialog open={isWidgetModalOpen} onOpenChange={setIsWidgetModalOpen}>
                        <DialogTrigger 
                          className="flex w-full flex-col flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-700/50 hover:border-purple-500/60 bg-purple-900/10 hover:bg-purple-500/10 p-6 transition-all duration-200 cursor-pointer group"
                        >
                                <div className="flex size-14 items-center justify-center rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors relative">
                                    <LayoutTemplate className="size-6 text-purple-400" />
                                    <PlusCircle className="size-4 text-purple-300 absolute -bottom-1 -right-1 bg-[#0d1317] rounded-full" />
                                </div>
                                <div className="text-center mt-1">
                                    <p className="text-sm font-semibold text-purple-300 group-hover:text-purple-400 transition-colors">
                                        Novo Widget ou Smart-App
                                    </p>
                                    <p className="text-[11px] text-purple-500/60 mt-0.5">Clima, YouTube, Relógios, Links Externos</p>
                                </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-slate-200">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                    <LayoutTemplate className="size-5" /> Adicionar App à Biblioteca
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-3">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Tipo de Aplicativo/Widget</Label>
                                    <Select value={widgetType} onValueChange={(v: any) => setWidgetType(v)}>
                                        <SelectTrigger className="w-full bg-slate-900 border-slate-700 h-10">
                                            <SelectValue placeholder="Selecione um tipo..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                            <SelectItem value="youtube"><div className="flex items-center gap-2"><Youtube className="size-4 text-red-500" /> YouTube Video</div></SelectItem>
                                            <SelectItem value="weather"><div className="flex items-center gap-2"><Cloud className="size-4 text-blue-400" /> Previsão do Tempo</div></SelectItem>
                                            <SelectItem value="rss"><div className="flex items-center gap-2"><Newspaper className="size-4 text-orange-400" /> Feed de Notícias (RSS)</div></SelectItem>
                                            <SelectItem value="clock"><div className="flex items-center gap-2"><Clock className="size-4 text-slate-300" /> Relógio Dinâmico</div></SelectItem>
                                            <SelectItem value="iframe"><div className="flex items-center gap-2"><MonitorSmartphone className="size-4 text-emerald-400" /> Link de Webpage (IFrame)</div></SelectItem>
                                            <SelectItem value="richtext"><div className="flex items-center gap-2"><AlignLeft className="size-4 text-amber-400" /> Texto Animado / Mural</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Nome de Identificação</Label>
                                    <Input 
                                      value={widgetLabel} onChange={(e) => setWidgetLabel(e.target.value)} 
                                      placeholder="Ex: Vídeo de Boas Vindas" 
                                      className="bg-slate-900 border-slate-700 placeholder:text-slate-600 h-10" 
                                    />
                                </div>

                                {(widgetType === 'youtube' || widgetType === 'iframe') && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">{widgetType === 'youtube' ? 'Link do YouTube' : 'URL do Site (IFrame HTTPS)'}</Label>
                                        <Input 
                                          type="url"
                                          value={widgetUrl} onChange={(e) => setWidgetUrl(e.target.value)} 
                                          placeholder={widgetType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'} 
                                          className="bg-slate-900 border-slate-700 placeholder:text-slate-600 h-10" 
                                        />
                                    </div>
                                )}

                                {widgetType === 'richtext' && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Texto ou Recado (Aceita quebras de linha)</Label>
                                        <textarea 
                                          value={widgetContent} onChange={(e) => setWidgetContent(e.target.value)} 
                                          placeholder="Digite o aviso para aparecer na tela..." 
                                          className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 min-h-[100px] resize-none"
                                        />
                                    </div>
                                )}
                                
                                <div className="pt-2">
                                    <Button onClick={handleCreateWidget} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium h-10">
                                        <PlusCircle className="size-4 mr-2" /> Salvar App na Biblioteca
                                    </Button>
                                    <p className="text-[10px] text-slate-500 text-center mt-3">Uma vez na biblioteca, você poderá arrastá-lo para suas Campanhas de Mídia.</p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {kioskStore.library.map((m) => (
                    <div key={m.id} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video hover:border-cyan-500/50 transition-colors">
                        {m.type === 'video' ? (
                            <video src={m.url} className="w-full h-full object-cover opacity-60" />
                        ) : m.type === 'image' ? (
                            <img src={m.url} className="w-full h-full object-cover opacity-80" alt={m.label} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                {m.type === 'youtube' && <Youtube className="size-12 text-red-500/80" />}
                                {m.type === 'weather' && <Cloud className="size-12 text-blue-400/80" />}
                                {m.type === 'rss' && <Newspaper className="size-12 text-orange-400/80" />}
                                {m.type === 'clock' && <Clock className="size-12 text-slate-300/80" />}
                                {m.type === 'iframe' && <MonitorSmartphone className="size-12 text-emerald-400/80" />}
                                {m.type === 'richtext' && <AlignLeft className="size-12 text-amber-400/80" />}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2 pointer-events-none">
                            <p className="text-xs font-medium text-white truncate">{m.label}</p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 backdrop-blur text-white uppercase font-bold">{m.type}</span>
                                {m.durationSec && <span className="text-[10px] items-center flex gap-1 text-slate-300"><StopCircle className="size-3" /> {m.durationSec}s</span>}
                            </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full shadow-lg" onClick={() => handleRemoveMedia(m.id, m.url)}>
                                <Trash2 className="size-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {kioskStore.library.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-800 py-12 text-center bg-slate-900/20">
                    <Video className="size-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">Biblioteca Vazia</p>
                    <p className="text-xs text-slate-500">Faça o upload de vídeos ou imagens para usá-los em campanhas futuras.</p>
                </div>
            )}
        </div>
    );
}
