import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PermissionType = 
  | 'upload_files'
  | 'download_files'
  | 'delete_files'
  | 'share_files'
  | 'create_folders'
  | 'delete_folders'
  | 'manage_users'
  | 'view_analytics'
  | 'process_invoices'
  | 'manage_workflows'
  | 'view_audit_logs'
  | 'manage_backups';

export interface UserPermission {
  id: string;
  user_id: string;
  permission_type: PermissionType;
  granted_by: string;
  granted_at: string;
}

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  upload_files: 'Upload de Arquivos',
  download_files: 'Download de Arquivos',
  delete_files: 'Deletar Arquivos',
  share_files: 'Compartilhar Arquivos',
  create_folders: 'Criar Pastas',
  delete_folders: 'Deletar Pastas',
  manage_users: 'Gerenciar Usuários',
  view_analytics: 'Ver Analytics',
  process_invoices: 'Processar Notas Fiscais',
  manage_workflows: 'Gerenciar Workflows',
  view_audit_logs: 'Ver Logs de Auditoria',
  manage_backups: 'Gerenciar Backups',
};

export function usePermissions(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get permissions for a user
  const permissionsQuery = useQuery({
    queryKey: ['user-permissions', targetUserId || user?.id],
    queryFn: async () => {
      const userId = targetUserId || user!.id;
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!(targetUserId || user),
  });

  // Grant permission
  const grantPermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionType }: { userId: string; permissionType: PermissionType }) => {
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          permission_type: permissionType,
          granted_by: user!.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissão concedida');
    },
    onError: (error: any) => {
      toast.error('Erro ao conceder permissão');
      console.error(error);
    },
  });

  // Revoke permission
  const revokePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionType }: { userId: string; permissionType: PermissionType }) => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission_type', permissionType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissão revogada');
    },
    onError: (error: any) => {
      toast.error('Erro ao revogar permissão');
      console.error(error);
    },
  });

  // Helper: Check if user has permission
  const hasPermission = (permissionType: PermissionType) => {
    if (user?.role === 'admin') return true; // Admins have all permissions
    return permissionsQuery.data?.some(p => p.permission_type === permissionType) || false;
  };

  return {
    permissions: permissionsQuery.data || [],
    isLoading: permissionsQuery.isLoading,
    grantPermission: grantPermissionMutation.mutate,
    revokePermission: revokePermissionMutation.mutate,
    hasPermission,
  };
}
