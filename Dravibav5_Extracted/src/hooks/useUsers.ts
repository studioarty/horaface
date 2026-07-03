import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/types/database';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  created_at?: string;
}

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Only admins can fetch all users
      if (user?.role !== 'admin') return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: user?.role === 'admin',
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<Pick<UserProfile, 'role' | 'department' | 'username'>>
    }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar usuário');
    },
  });

  const updateUserQuotaMutation = useMutation({
    mutationFn: async ({ userId, quotaLimit }: { userId: string; quotaLimit: number }) => {
      const { error } = await supabase
        .from('user_quotas')
        .update({ quota_limit: quotaLimit })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Quota atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar quota');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete from user_profiles (will cascade delete related data)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    updateUser: updateUserMutation.mutate,
    updateUserQuota: updateUserQuotaMutation.mutate,
    deleteUser: deleteUserMutation.mutateAsync,
    isUpdating: updateUserMutation.isPending || updateUserQuotaMutation.isPending,
  };
}
