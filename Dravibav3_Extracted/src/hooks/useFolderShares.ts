import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type FolderPermission = 'read' | 'write' | 'admin';

export interface FolderShare {
  id: string;
  folder_id: string;
  owner_id: string;
  shared_with_user_id: string;
  permission: FolderPermission;
  created_at: string;
  shared_with_user?: {
    username: string;
    email: string;
  };
  folder?: {
    name: string;
  };
}

export function useFolderShares(folderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get shares for a specific folder (as owner)
  const sharesQuery = useQuery({
    queryKey: ['folder-shares', folderId, user?.id],
    queryFn: async () => {
      if (!user || !folderId) return [];

      const { data, error } = await supabase
        .from('folder_shares')
        .select(`
          *,
          shared_with_user:user_profiles!shared_with_user_id(username, email)
        `)
        .eq('folder_id', folderId)
        .eq('owner_id', user.id);

      if (error) throw error;
      return data as FolderShare[];
    },
    enabled: !!user && !!folderId,
  });

  // Get folders shared with me
  const sharedWithMeQuery = useQuery({
    queryKey: ['folders-shared-with-me', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('folder_shares')
        .select(`
          *,
          folder:folders(name, id, parent_id, created_at)
        `)
        .eq('shared_with_user_id', user.id);

      if (error) throw error;
      return data as FolderShare[];
    },
    enabled: !!user,
  });

  // Share folder with user
  const shareFolderMutation = useMutation({
    mutationFn: async ({
      folderId,
      sharedWithUserId,
      permission,
    }: {
      folderId: string;
      sharedWithUserId: string;
      permission: FolderPermission;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('folder_shares').insert({
        folder_id: folderId,
        owner_id: user.id,
        shared_with_user_id: sharedWithUserId,
        permission,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-shares'] });
      queryClient.invalidateQueries({ queryKey: ['folders-shared-with-me'] });
      toast.success('Pasta compartilhada com sucesso!');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate key')) {
        toast.error('Esta pasta já foi compartilhada com este usuário');
      } else {
        toast.error(error.message || 'Erro ao compartilhar pasta');
      }
    },
  });

  // Update share permission
  const updateShareMutation = useMutation({
    mutationFn: async ({
      shareId,
      permission,
    }: {
      shareId: string;
      permission: FolderPermission;
    }) => {
      const { error } = await supabase
        .from('folder_shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-shares'] });
      toast.success('Permissão atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissão');
    },
  });

  // Remove share
  const removeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('folder_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-shares'] });
      queryClient.invalidateQueries({ queryKey: ['folders-shared-with-me'] });
      toast.success('Compartilhamento removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover compartilhamento');
    },
  });

  return {
    shares: sharesQuery.data || [],
    sharedWithMe: sharedWithMeQuery.data || [],
    isLoading: sharesQuery.isLoading || sharedWithMeQuery.isLoading,
    shareFolder: shareFolderMutation.mutate,
    updateShare: updateShareMutation.mutate,
    removeShare: removeShareMutation.mutate,
    isSharing: shareFolderMutation.isPending,
    isUpdating: updateShareMutation.isPending,
    isRemoving: removeShareMutation.isPending,
  };
}
