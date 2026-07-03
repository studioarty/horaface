import { useState } from 'react';
import { Folder, FolderPlus, FolderEdit, Trash2, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFolders } from '@/hooks/useFolders';
import { cn } from '@/lib/utils';

interface FolderManagerProps {
  currentFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
}

export default function FolderManager({ currentFolderId, onFolderChange }: FolderManagerProps) {
  const { folders, createFolder, renameFolder, deleteFolder, isCreating, isRenaming, isDeleting } = useFolders();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  
  // Build breadcrumb path
  const getBreadcrumbs = () => {
    const path: Array<{ id: string | null; name: string }> = [{ id: null, name: 'Raiz' }];
    
    if (currentFolder) {
      let folder = currentFolder;
      const folderPath = [folder];
      
      while (folder.parent_id) {
        const parent = folders.find(f => f.id === folder.parent_id);
        if (!parent) break;
        folderPath.unshift(parent);
        folder = parent;
      }
      
      path.push(...folderPath.map(f => ({ id: f.id, name: f.name })));
    }
    
    return path;
  };

  const getSubfolders = (parentId: string | null) => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder({ name: newFolderName.trim(), parent_id: currentFolderId || undefined });
    setNewFolderName('');
    setCreateDialogOpen(false);
  };

  const handleEditFolder = (folder: { id: string; name: string }) => {
    setEditingFolder(folder);
    setEditDialogOpen(true);
  };

  const handleRenameFolder = () => {
    if (!editingFolder || !newFolderName.trim()) return;
    renameFolder({ id: editingFolder.id, name: newFolderName.trim() });
    setNewFolderName('');
    setEditDialogOpen(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a pasta "${name}" e todo seu conteúdo?`)) {
      deleteFolder(id);
      if (currentFolderId === id) {
        onFolderChange(null);
      }
    }
  };

  const breadcrumbs = getBreadcrumbs();
  const subfolders = getSubfolders(currentFolderId);

  return (
    <div className="space-y-4">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id || 'root'} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <button
              onClick={() => onFolderChange(crumb.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary transition-colors',
                crumb.id === currentFolderId && 'bg-secondary font-medium'
              )}
            >
              {index === 0 ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
              <span>{crumb.name}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Current folder actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Pastas</h3>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
          <FolderPlus className="w-4 h-4" />
          Nova Pasta
        </Button>
      </div>

      {/* Folder list */}
      {subfolders.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subfolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
              onClick={() => onFolderChange(folder.id)}
            >
              <Folder className="w-10 h-10 text-blue-500 mb-2" />
              <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditFolder(folder);
                  }}
                >
                  <FolderEdit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 bg-white text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma pasta neste diretório
        </div>
      )}

      {/* Create folder dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              Nova Pasta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Nome da pasta"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateFolder} disabled={isCreating || !newFolderName.trim()}>
                {isCreating ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit folder dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (open && editingFolder) {
          setNewFolderName(editingFolder.name);
        } else {
          setNewFolderName('');
          setEditingFolder(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderEdit className="w-5 h-5" />
              Renomear Pasta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              placeholder="Nome da pasta"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRenameFolder} disabled={isRenaming || !newFolderName.trim()}>
                {isRenaming ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
