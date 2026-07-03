import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Backup {
  id: string;
  user_id: string;
  backup_type: 'full' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_files: number;
  total_size: number;
  backup_path?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface BackupSchedule {
  id: string;
  user_id: string;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  backup_type: 'full' | 'incremental';
  time_of_day: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

export function useBackups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const backupsQuery = useQuery({
    queryKey: ['backups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Backup[];
    },
    enabled: !!user,
  });

  const schedulesQuery = useQuery({
    queryKey: ['backup-schedules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_schedules')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BackupSchedule[];
    },
    enabled: !!user,
  });

  const createBackupMutation = useMutation({
    mutationFn: async (backupType: 'full' | 'incremental') => {
      // Create backup record
      const { error } = await supabase.from('backups').insert({
        user_id: user!.id,
        backup_type: backupType,
        status: 'pending',
        started_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup iniciado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao iniciar backup');
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: {
      schedule_type: 'daily' | 'weekly' | 'monthly';
      backup_type: 'full' | 'incremental';
      time_of_day: string;
    }) => {
      const { error } = await supabase.from('backup_schedules').insert({
        user_id: user!.id,
        ...schedule,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar agendamento');
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('backup_schedules')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar agendamento');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backup_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });
      toast.success('Agendamento removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover agendamento');
    },
  });

  return {
    backups: backupsQuery.data || [],
    schedules: schedulesQuery.data || [],
    isLoading: backupsQuery.isLoading || schedulesQuery.isLoading,
    createBackup: createBackupMutation.mutate,
    createSchedule: createScheduleMutation.mutate,
    toggleSchedule: toggleScheduleMutation.mutate,
    deleteSchedule: deleteScheduleMutation.mutate,
    isCreatingBackup: createBackupMutation.isPending,
  };
}
