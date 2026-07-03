import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserTable from '@/components/features/UserTable';
import UserManagementDialog from '@/components/features/UserManagementDialog';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { users, updateUser, updateUserQuota, isUpdating } = useUsers();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  console.log('Users page renderizada');
  console.log('Total de usuários:', users.length);
  console.log('Usuário atual é admin?', currentUser?.role === 'admin');

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSaveUser = (userId: string, updates: any) => {
    updateUser({ userId, updates });
    setDialogOpen(false);
  };

  const handleUpdateQuota = (userId: string, quota: number) => {
    updateUserQuota({ userId, quotaLimit: quota });
  };

  // Only admins can see users page
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800 font-medium">Acesso Restrito</p>
          <p className="text-sm text-yellow-700 mt-2">
            Somente administradores podem gerenciar usuários.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie usuários, perfis e permissões da plataforma
          </p>
        </div>
      </div>

      {/* Users table */}
      <UserTable users={users} onEditUser={handleEditUser} />

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-2">Administrador</h4>
          <p className="text-xs text-purple-700">
            Acesso completo ao sistema. Pode gerenciar usuários, configurações e todos os arquivos.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Gestor</h4>
          <p className="text-xs text-blue-700">
            Gerencia departamentos e usuários subordinados. Acesso a relatórios e aprovações.
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Usuário</h4>
          <p className="text-xs text-gray-700">
            Acesso padrão. Pode fazer upload, organizar e compartilhar seus próprios arquivos.
          </p>
        </div>
      </div>

      <UserManagementDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveUser}
        onUpdateQuota={handleUpdateQuota}
        isSaving={isUpdating}
      />
    </div>
  );
}
