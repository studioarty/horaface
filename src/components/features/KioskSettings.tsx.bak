import { useState, useRef } from 'react';
import { Plus, Trash2, Settings2, Image as ImageIcon, GripVertical, Monitor, Upload, Loader2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKioskStore } from '@/stores/useKioskStore';
import { useToast } from '@/hooks/use-toast';
import { uploadKioskImage, deleteKioskImage } from '@/lib/api';

export default function KioskSettings() {
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
    await kioskStore.addImage(newUrl, newLabel || 'Imagem');
    setNewUrl('');
    setNewLabel('');
    setShowAddUrl(false);
    toast({ title: 'Imagem adicionada ao quiosque' });
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: `"${file.name}" não é uma imagem válida` });
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
        continue;
      }

      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: `"${file.name}" excede 10MB` });
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
        continue;
      }

      try {
        const url = await uploadKioskImage(file);
        if (url) {
          const label = file.name.replace(/\.[^.]+$/, '');
          await kioskStore.addImage(url, label);
          success++;
        } else {
          toast({ variant: 'destructive', title: `Erro ao enviar "${file.name}"` });
        }
      } catch (err) {
        console.error('Upload error:', err);
        toast({ variant: 'destructive', title: `Erro ao enviar "${file.name}"` });
      }

      completed++;
      setUploadProgress(Math.round((completed / total) * 100));
    }

    setUploading(false);
    setUploadProgress(0);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (success > 0) {
      toast({ title: `${success} imagem${success > 1 ? 'ns' : ''} adicionada${success > 1 ? 's' : ''} com sucesso` });
    }
  };

  const handleRemoveImage = async (id: string) => {
    const img = kioskStore.images.find((i) => i.id === id);
    if (img && img.url.includes('kiosk-images')) {
      await deleteKioskImage(img.url);
    }
    await kioskStore.removeImage(id);
    toast({ title: 'Imagem removida' });
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="hud-card rounded-lg p-5 animate-fade-up">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
          <h3
            style={{
              fontFamily: 'Rajdhani, system-ui, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Configurações do Quiosque
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-text-secondary text-xs">Tempo Inatividade (seg)</Label>
            <Input
              type="number"
              value={kioskStore.idleTimeoutSec}
              onChange={(e) => kioskStore.updateSettings({ idleTimeoutSec: Number(e.target.value) })}
              className="mt-1 border-border bg-elevated"
            />
          </div>
          <div>
            <Label className="text-text-secondary text-xs">Intervalo Slides (seg)</Label>
            <Input
              type="number"
              value={kioskStore.slideIntervalSec}
              onChange={(e) => kioskStore.updateSettings({ slideIntervalSec: Number(e.target.value) })}
              className="mt-1 border-border bg-elevated"
            />
          </div>
        </div>

        <div>
          <Label className="text-text-secondary text-xs">Mensagem da Tela</Label>
          <Input
            value={kioskStore.message}
            onChange={(e) => kioskStore.updateSettings({ message: e.target.value })}
            className="mt-1 border-border bg-elevated"
            placeholder="Toque na tela para registrar..."
          />
        </div>

        {/* Screensaver Images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-text-secondary text-xs flex items-center gap-1.5">
              <ImageIcon className="size-3.5" />
              Imagens do Screensaver
              {kioskStore.images.length > 0 && (
                <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400">
                  {kioskStore.images.length}
                </span>
              )}
            </Label>
          </div>

          {/* Upload area */}
          <div className="mb-3 space-y-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Upload drop zone / button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/40 bg-slate-900/30 hover:bg-cyan-500/5 p-5 transition-all duration-200 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-8 text-cyan-400 animate-spin" />
                  <p className="text-sm font-medium text-cyan-400">Enviando... {uploadProgress}%</p>
                  <div className="w-full max-w-[200px] h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                    <Upload className="size-6 text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">
                      Carregar imagens do computador
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      JPG, PNG, WebP ou GIF • Máx. 10MB cada • Selecione várias de uma vez
                    </p>
                  </div>
                </>
              )}
            </button>

            {/* Add by URL toggle */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-800" />
              <button
                onClick={() => setShowAddUrl(!showAddUrl)}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <LinkIcon className="size-3" />
                {showAddUrl ? 'Fechar' : 'Ou adicionar por URL'}
              </button>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {showAddUrl && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="border-slate-700 bg-slate-800/50 text-sm"
                />
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="border-slate-700 bg-slate-800/50 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddByUrl} className="flex-1 text-xs h-8">
                    <Plus className="size-3 mr-1" />
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setShowAddUrl(false); setNewUrl(''); setNewLabel(''); }}
                    className="text-xs h-8 border-slate-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Image list */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {kioskStore.images.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <ImageIcon className="size-8 text-slate-600" />
                <p className="text-xs text-slate-500">Nenhuma imagem configurada</p>
                <p className="text-[10px] text-slate-600">
                  Carregue imagens acima para exibir no screensaver dos quiosques
                </p>
              </div>
            ) : (
              kioskStore.images.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-800/50 bg-slate-900/30 p-1.5 group hover:border-slate-700 transition-colors"
                >
                  <GripVertical className="size-3.5 text-slate-600 shrink-0 cursor-grab" />
                  <img
                    src={img.url}
                    alt={img.label}
                    className="size-10 rounded-md object-cover border border-slate-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23333" width="40" height="40"/></svg>';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-xs text-slate-300">{img.label}</span>
                    <span className="block truncate text-[10px] text-slate-600 font-mono">
                      {img.url.includes('kiosk-images') ? 'Arquivo local' : 'URL externa'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="shrink-0 rounded-md p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover imagem"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Multi-kiosk URL info */}
        <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Monitor className="size-3.5 text-cyan-400" />
            <p className="text-xs font-medium text-cyan-400">URLs dos Quiosques</p>
          </div>
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Quiosque padrão:</p>
              <p className="font-mono text-[11px] text-slate-400 break-all">{origin}/quiosque</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Com identificador:</p>
              <p className="font-mono text-[11px] text-slate-400 break-all">
                {origin}/quiosque?id=entrada-1&name=Entrada Principal&location=Térreo
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Cada quiosque se registra automaticamente. Veja a <a href="/docs" className="text-cyan-400 hover:underline">documentação</a> completa.
          </p>
        </div>
      </div>
    </div>
  );
}
