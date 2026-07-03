import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reminder {
  id: string;
  file_id: string;
  user_id: string;
  reminder_type: 'expiration' | 'review' | 'payment' | 'custom';
  title: string;
  description?: string;
  reminder_date: string;
  notified: boolean;
  created_at: string;
  file?: {
    name: string;
    type: string;
  };
}

export function useReminders(fileId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const remindersQuery = useQuery({
    queryKey: ['reminders', user?.id, fileId],
    queryFn: async () => {
      let query = supabase
        .from('document_reminders')
        .select('*, file:files(name, type)')
        .eq('user_id', user!.id)
        .order('reminder_date', { ascending: true });

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });

  const upcomingRemindersQuery = useQuery({
    queryKey: ['reminders-upcoming', user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('document_reminders')
        .select('*, file:files(name, type)')
        .eq('user_id', user!.id)
        .gte('reminder_date', now)
        .lte('reminder_date', sevenDaysLater)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });

  const createReminderMutation = useMutation({
    mutationFn: async (reminder: {
      file_id: string;
      reminder_type: 'expiration' | 'review' | 'payment' | 'custom';
      title: string;
      description?: string;
      reminder_date: string;
    }) => {
      const { error } = await supabase.from('document_reminders').insert({
        ...reminder,
        user_id: user!.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar lembrete');
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover lembrete');
    },
  });

  return {
    reminders: remindersQuery.data || [],
    upcomingReminders: upcomingRemindersQuery.data || [],
    isLoading: remindersQuery.isLoading,
    createReminder: createReminderMutation.mutate,
    deleteReminder: deleteReminderMutation.mutate,
    isCreating: createReminderMutation.isPending,
  };
}
