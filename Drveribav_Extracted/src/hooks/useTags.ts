import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FileTag {
  id: string;
  file_id: string;
  tag_name: string;
  tag_color: string;
  user_id: string;
  created_at: string;
}

export function useTags(fileId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['tags', fileId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('file_tags')
        .select('*')
        .eq('user_id', user.id);

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FileTag[];
    },
    enabled: !!user,
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ 
      fileId, 
      tagName, 
      tagColor 
    }: { 
      fileId: string; 
      tagName: string; 
      tagColor: string 
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('file_tags')
        .insert({
          file_id: fileId,
          tag_name: tagName,
          tag_color: tagColor,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag adicionada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar tag');
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('file_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover tag');
    },
  });

  const getAllUniqueTags = () => {
    const tags = tagsQuery.data || [];
    const uniqueTags = new Map<string, { name: string; color: string; count: number }>();
    
    tags.forEach(tag => {
      const existing = uniqueTags.get(tag.tag_name);
      if (existing) {
        existing.count++;
      } else {
        uniqueTags.set(tag.tag_name, { 
          name: tag.tag_name, 
          color: tag.tag_color, 
          count: 1 
        });
      }
    });

    return Array.from(uniqueTags.values());
  };

  return {
    tags: tagsQuery.data || [],
    uniqueTags: getAllUniqueTags(),
    isLoading: tagsQuery.isLoading,
    addTag: addTagMutation.mutate,
    removeTag: removeTagMutation.mutate,
    isAdding: addTagMutation.isPending,
    isRemoving: removeTagMutation.isPending,
  };
}
