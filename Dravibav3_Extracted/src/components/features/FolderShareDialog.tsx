import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Share2, UserPlus, Trash2, Shield, Eye, Edit } from 'lucide-react';
import { useFolderShares, FolderPermission } from '@/hooks/useFolderShares';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';

interface FolderShareDialogProps {
  folder: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERMISSIONS: { value: FolderPermission; label: string; icon: any; description: string }[] = [
  { 
    value: 'read', 
    label: 'Leitura', 
    icon: Eye,
    description: 'Apenas visualizar arquivos' 
  },
  { 
    value: 'write', 
    label: 'Escrita', 
    icon: Edit,
    description: 'Visualizar e fazer upload de arquivos' 
  },
  { 
    value: 'admin', 
    label: 'Administrador', 
    icon: Shield,
    description: 'Controle total da pasta' 
  },
];

export default function FolderShareDialog({ folder, open, onOpenChange }: FolderShareDialogProps) {
  const { user: currentUser } = useAuth();
  const { shares, shareFolder, updateShare, removeShare, isSharing, isUpdating, isRemoving } = useFolderShares(folder?.id);
  const { users } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<FolderPermission>('read');

  const availableUsers = users.filter(
    (u) => u.id !== currentUser?.id && !shares.some((s) => s.shared_with_user_id === u.id)
  );

  const handleShare = () => {
    if (!selectedUserId || !folder) return;

    shareFolder({
      folderId: folder.id,
      sharedWithUserId: selectedUserId,
      permission: selectedPermission,
    });

    setSelectedUserId('');
    setSelectedPermission('read');
  };

  const getPermissionInfo = (permission: FolderPermission) => {
    return PERMISSIONS.find((p) => p.value === permission);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhar Pasta: {folder?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new share */}
          <div className="space-y-4 pb-4 border-b border-border">
            <div className="space-y-2">
              <Label>Compartilhar com usuário</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0 ? 'Nenhum usuário disponível' : 'Selecione um usuário'}
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nível de permissão</Label>
              <div className="space-y-2">
                {PERMISSIONS.map((perm) => {
                  const PermIcon = perm.icon;
                  return (
                    <label
                      key={perm.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPermission === perm.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="permission"
                        value={perm.value}
                        checked={selectedPermission === perm.value}
                        onChange={(e) => setSelectedPermission(e.target.value as FolderPermission)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                          <PermIcon className="w-4 h-4" />
                          {perm.label}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{perm.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleShare}
              disabled={!selectedUserId || isSharing}
              className="w-full gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isSharing ? 'Compartilhando...' : 'Adicionar Acesso'}
            </Button>
          </div>

          {/* Existing shares */}
          <div className="space-y-3">
            <Label>Usuários com acesso ({shares.length})</Label>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Esta pasta ainda não foi compartilhada
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shares.map((share) => {
                  const permInfo = getPermissionInfo(share.permission);
                  const PermIcon = permInfo?.icon || Eye;
                  
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {share.shared_with_user?.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {share.shared_with_user?.email}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            updateShare({
                              shareId: share.id,
                              permission: e.target.value as FolderPermission,
                            })
                          }
                          disabled={isUpdating}
                          className="px-2 py-1 text-xs border border-border rounded bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {PERMISSIONS.map((perm) => (
                            <option key={perm.value} value={perm.value}>
                              {perm.label}
                            </option>
                          ))}
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive hover:text-destructive"
                          onClick={() => removeShare(share.id)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
