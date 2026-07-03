import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AlertRule {
  id: string;
  user_id: string;
  rule_type: 'due_date' | 'budget_exceeded' | 'duplicate_supplier' | 'anomaly' | 'high_tax';
  rule_name: string;
  conditions: any;
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertNotification {
  id: string;
  user_id: string;
  rule_id?: string;
  alert_type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  related_data?: any;
  notified_at: string;
  read: boolean;
  created_at: string;
}

export function useAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['alert-rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertRule[];
    },
    enabled: !!user,
  });

  const notificationsQuery = useQuery({
    queryKey: ['alert-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AlertNotification[];
    },
    enabled: !!user,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AlertRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('alert_rules').insert({
        user_id: user!.id,
        ...rule,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Regra de alerta criada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar regra');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('alert_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar regra');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Regra removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover regra');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-notifications'] });
    },
  });

  return {
    rules: rulesQuery.data || [],
    notifications: notificationsQuery.data || [],
    unreadCount: notificationsQuery.data?.filter(n => !n.read).length || 0,
    isLoading: rulesQuery.isLoading || notificationsQuery.isLoading,
    createRule: createRuleMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
  };
}
