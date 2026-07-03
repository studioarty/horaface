import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: 'file' | 'folder' | 'share' | 'user';
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    username: string;
    email: string;
  };
}

export function useAuditLogs() {
  const { user } = useAuth();

  const logsQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_profiles(username, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: user?.role === 'admin',
  });

  return {
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
  };
}
