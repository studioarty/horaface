import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useActivities() {
  const { user } = useAuth();

  const activitiesQuery = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
  };
}
