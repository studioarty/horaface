import { UserProfile } from '@/hooks/useUsers';
import { formatBytes } from '@/lib/mockData';
import { UserCog, Trash2, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import ChatPanel from './ChatPanel';
import PermissionsDialog from './PermissionsDialog';
import { useAuth } from '@/contexts/AuthContext';

interface UserTableProps {
  users: UserProfile[];
  onEditUser?: (user: UserProfile) => void;
  onDeleteUser?: (userId: string) => void;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'manager':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'manager':
      return 'Gestor';
    default:
      return 'Usuário';
  }
};

export default function UserTable({ users, onEditUser, onDeleteUser }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const [activeChat, setActiveChat] = useState<{ userId: string; userName: string } | null>(null);
  const [permissionsDialog, setPermissionsDialog] = useState<{ userId: string; userName: string } | null>(null);

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      onDeleteUser?.(userId);
    }
  };
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Usuário
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Perfil
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Departamento
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              return (
                <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {user.department || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* Chat Button */}
                      {currentUser?.id !== user.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8"
                          onClick={() => setActiveChat({ userId: user.id, userName: user.username })}
                          title="Enviar mensagem"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Permissions Button (Admin only) */}
                      {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8"
                          onClick={() => setPermissionsDialog({ userId: user.id, userName: user.username })}
                          title="Gerenciar permissões"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Edit Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={() => onEditUser?.(user)}
                        title="Editar usuário"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                      
                      {/* Delete Button (Admin only, can't delete self) */}
                      {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Active Chat Panel */}
      {activeChat && (
        <ChatPanel
          otherUserId={activeChat.userId}
          otherUserName={activeChat.userName}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Permissions Dialog */}
      {permissionsDialog && (
        <PermissionsDialog
          open={!!permissionsDialog}
          onOpenChange={(open) => !open && setPermissionsDialog(null)}
          userId={permissionsDialog.userId}
          userName={permissionsDialog.userName}
        />
      )}
    </div>
  );
}
