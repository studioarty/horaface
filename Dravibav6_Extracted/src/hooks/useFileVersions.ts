import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  url: string;
  size: number;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
    avatar?: string;
  };
}

export function useFileVersions(fileId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: async () => {
      if (!fileId) return [];

      const { data, error } = await supabase
        .from('file_versions')
        .select(`
          *,
          user:user_profiles(username, avatar)
        `)
        .eq('file_id', fileId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as FileVersion[];
    },
    enabled: !!fileId && !!user,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ fileId, versionId }: { fileId: string; versionId: string }) => {
      // Get version details
      const { data: version, error: versionError } = await supabase
        .from('file_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      // Update main file record to point to this version
      const { error: updateError } = await supabase
        .from('files')
        .update({
          storage_path: version.storage_path,
          url: version.url,
          size: version.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      if (updateError) throw updateError;

      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-versions'] });
      toast.success('Versão restaurada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao restaurar versão');
    },
  });

  return {
    versions: versionsQuery.data || [],
    isLoading: versionsQuery.isLoading,
    restoreVersion: restoreVersionMutation.mutate,
    isRestoring: restoreVersionMutation.isPending,
  };
}
