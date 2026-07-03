import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFolders } from '@/hooks/useFolders';
import { FileEdit, Folder } from 'lucide-react';

interface EditFileDialogProps {
  file: {
    id: string;
    name: string;
    folder_id?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { name: string; folder_id?: string }) => void;
  isSaving?: boolean;
}

export default function EditFileDialog({ file, open, onOpenChange, onSave, isSaving }: EditFileDialogProps) {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const { folders } = useFolders();

  useEffect(() => {
    if (file) {
      setName(file.name);
      setFolderId(file.folder_id || '');
    }
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    onSave(file.id, {
      name: name.trim(),
      folder_id: folderId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Editar Arquivo
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Nome do arquivo</Label>
            <Input
              id="filename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome do arquivo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Pasta de destino</Label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                id="folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Raiz (sem pasta)</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
