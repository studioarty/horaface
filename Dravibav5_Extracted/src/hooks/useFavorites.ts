import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('file_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(f => f.file_id);
    },
    enabled: !!user,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      if (!user) throw new Error('User not authenticated');

      const isFavorite = favoritesQuery.data?.includes(fileId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('file_id', fileId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            file_id: fileId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      return !isFavorite;
    },
    onSuccess: (isFavorite) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(isFavorite ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar favorito');
    },
  });

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    isFavorite: (fileId: string) => favoritesQuery.data?.includes(fileId) || false,
    toggleFavorite: toggleFavoriteMutation.mutate,
    isToggling: toggleFavoriteMutation.isPending,
  };
}
