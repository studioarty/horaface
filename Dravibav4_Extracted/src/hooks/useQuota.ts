import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useQuota() {
  const { user } = useAuth();

  const quotaQuery = useQuery({
    queryKey: ['quota', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    quota: quotaQuery.data,
    isLoading: quotaQuery.isLoading,
  };
}
