import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PublicFolderLink {
  id: string;
  folder_id: string;
  user_id: string;
  token: string;
  password_hash?: string;
  expires_at: string;
  max_downloads?: number;
  download_count: number;
  created_at: string;
}

export function usePublicFolderLinks(folderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ['public-folder-links', folderId],
    queryFn: async () => {
      if (!user || !folderId) return [];

      const { data, error } = await supabase
        .from('public_folder_links')
        .select('*')
        .eq('folder_id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as PublicFolderLink[];
    },
    enabled: !!user && !!folderId,
  });

  const createLinkMutation = useMutation({
    mutationFn: async ({
      folderId,
      expiresInDays,
      password,
      maxDownloads,
    }: {
      folderId: string;
      expiresInDays: number;
      password?: string;
      maxDownloads?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase.from('public_folder_links').insert({
        folder_id: folderId,
        user_id: user.id,
        token,
        password_hash: password ? btoa(password) : null,
        expires_at: expiresAt.toISOString(),
        max_downloads: maxDownloads,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-folder-links'] });
      toast.success('Link público criado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar link');
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('public_folder_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-folder-links'] });
      toast.success('Link removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover link');
    },
  });

  return {
    links: linksQuery.data || [],
    isLoading: linksQuery.isLoading,
    createLink: createLinkMutation.mutate,
    deleteLink: deleteLinkMutation.mutate,
    isCreating: createLinkMutation.isPending,
    isDeleting: deleteLinkMutation.isPending,
  };
}
