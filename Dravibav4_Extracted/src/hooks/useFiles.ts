import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FileFilters {
  query?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  minSize?: number;
  maxSize?: number;
  folderId?: string | null;
}

export function useFiles(filters?: FileFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const filesQuery = useQuery({
    queryKey: ['files', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.query) {
        query = query.ilike('name', `%${filters.query}%`);
      }
      if (filters?.type) {
        query = query.like('type', `${filters.type}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.minSize) {
        query = query.gte('size', filters.minSize * 1024 * 1024);
      }
      if (filters?.maxSize) {
        query = query.lte('size', filters.maxSize * 1024 * 1024);
      }
      if (filters?.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folderId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      console.log('Uploading file:', file.name);

      // Check quota before upload
      const { data: quota } = await supabase
        .from('user_quotas')
        .select('quota_used, quota_limit')
        .eq('user_id', user.id)
        .single();

      if (quota && quota.quota_used + file.size > quota.quota_limit) {
        throw new Error('Quota excedida! Exclua alguns arquivos primeiro.');
      }

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pontocloud-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pontocloud-files')
        .getPublicUrl(filePath);

      // Insert file metadata
      const { data, error } = await supabase
        .from('files')
        .insert({
          name: file.name,
          type: file.type,
          size: file.size,
          user_id: user.id,
          storage_path: filePath,
          url: publicUrl,
          folder_id: folderId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Arquivo enviado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast.error(error.message || 'Erro ao enviar arquivo');
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; folder_id?: string | null } }) => {
      const { error } = await supabase
        .from('files')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Arquivo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar arquivo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      console.log('Deleting file:', fileId);

      // Get file info first
      const { data: file } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (!file) throw new Error('File not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pontocloud-files')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Arquivo excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      toast.error(error.message || 'Erro ao excluir arquivo');
    },
  });

  return {
    files: filesQuery.data || [],
    isLoading: filesQuery.isLoading,
    uploadFile: uploadMutation.mutate,
    updateFile: updateFileMutation.mutate,
    deleteFile: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isUpdating: updateFileMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
