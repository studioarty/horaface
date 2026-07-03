import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const foldersQuery = useQuery({
    queryKey: ['folders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parent_id }: { name: string; parent_id?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          parent_id: parent_id || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Pasta criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar pasta');
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('folders')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Pasta renomeada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao renomear pasta');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Pasta excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir pasta');
    },
  });

  return {
    folders: foldersQuery.data || [],
    isLoading: foldersQuery.isLoading,
    createFolder: createFolderMutation.mutate,
    isCreating: createFolderMutation.isPending,
    renameFolder: renameFolderMutation.mutate,
    isRenaming: renameFolderMutation.isPending,
    deleteFolder: deleteFolderMutation.mutate,
    isDeleting: deleteFolderMutation.isPending,
  };
}
