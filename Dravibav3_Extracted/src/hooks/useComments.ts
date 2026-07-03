import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  file_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  mentions?: string[];
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    email: string;
    avatar?: string;
  };
}

export function useComments(fileId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['comments', fileId],
    queryFn: async () => {
      if (!fileId) return [];

      const { data, error } = await supabase
        .from('file_comments')
        .select(`
          *,
          user:user_profiles(username, email, avatar)
        `)
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!fileId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({
      fileId,
      content,
      parentId,
      mentions,
    }: {
      fileId: string;
      content: string;
      parentId?: string;
      mentions?: string[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('file_comments').insert({
        file_id: fileId,
        user_id: user.id,
        parent_id: parentId,
        content,
        mentions: mentions ? JSON.stringify(mentions) : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comentário adicionado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar comentário');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('file_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comentário removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover comentário');
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    addComment: addCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    isAdding: addCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
  };
}
