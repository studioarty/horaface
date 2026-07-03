import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  file_id: string;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  initiated_by: string;
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
  file?: any;
}

export interface WorkflowApproval {
  id: string;
  instance_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
  instance?: WorkflowInstance;
}

export function useWorkflows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workflowsQuery = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Workflow[];
    },
    enabled: !!user,
  });

  const instancesQuery = useQuery({
    queryKey: ['workflow-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow:workflows(*),
          file:files(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkflowInstance[];
    },
    enabled: !!user,
  });

  const approvalsQuery = useQuery({
    queryKey: ['workflow-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_approvals')
        .select(`
          *,
          instance:workflow_instances(
            *,
            workflow:workflows(*),
            file:files(*)
          )
        `)
        .eq('approver_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkflowApproval[];
    },
    enabled: !!user,
  });

  const approveDocumentMutation = useMutation({
    mutationFn: async ({
      approvalId,
      approved,
      comments,
    }: {
      approvalId: string;
      approved: boolean;
      comments?: string;
    }) => {
      const { error } = await supabase
        .from('workflow_approvals')
        .update({
          status: approved ? 'approved' : 'rejected',
          comments,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      toast.success('Decisão registrada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao processar aprovação');
    },
  });

  return {
    workflows: workflowsQuery.data || [],
    instances: instancesQuery.data || [],
    pendingApprovals: approvalsQuery.data || [],
    isLoading: workflowsQuery.isLoading || instancesQuery.isLoading,
    approveDocument: approveDocumentMutation.mutate,
    isApproving: approveDocumentMutation.isPending,
  };
}
