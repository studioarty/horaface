import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface InvoiceData {
  id: string;
  file_id: string;
  user_id: string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  supplier_name?: string;
  supplier_cnpj?: string;
  total_amount?: number;
  tax_amount?: number;
  net_amount?: number;
  currency: string;
  items?: any[];
  raw_data?: any;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_date?: string;
  created_at: string;
  updated_at: string;
  file?: {
    name: string;
    type: string;
    url: string;
  };
}

export function useInvoiceProcessing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_data')
        .select('*, file:files(name, type, url)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InvoiceData[];
    },
    enabled: !!user,
  });

  const processInvoiceMutation = useMutation({
    mutationFn: async ({ fileId, fileUrl, fileName }: { fileId: string; fileUrl: string; fileName: string }) => {
      console.log('Processing invoice with AI:', fileName);

      const { data, error } = await supabase.functions.invoke('process-invoice', {
        body: { fileId, fileUrl, fileName },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Nota fiscal processada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Invoice processing error:', error);
      toast.error(error.message || 'Erro ao processar nota fiscal');
    },
  });

  const updateInvoiceDataMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InvoiceData> }) => {
      const { error } = await supabase
        .from('invoice_data')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Dados atualizados!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar dados');
    },
  });

  const deleteInvoiceDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoice_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Dados removidos!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover dados');
    },
  });

  // Get totals for accounting
  const totalsQuery = useQuery({
    queryKey: ['invoice-totals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_data')
        .select('total_amount, tax_amount, net_amount, currency')
        .eq('user_id', user!.id)
        .eq('extraction_status', 'completed');

      if (error) throw error;

      const totals = data.reduce((acc, invoice) => {
        const currency = invoice.currency || 'BRL';
        if (!acc[currency]) {
          acc[currency] = { total: 0, tax: 0, net: 0, count: 0 };
        }
        acc[currency].total += Number(invoice.total_amount) || 0;
        acc[currency].tax += Number(invoice.tax_amount) || 0;
        acc[currency].net += Number(invoice.net_amount) || 0;
        acc[currency].count++;
        return acc;
      }, {} as Record<string, { total: number; tax: number; net: number; count: number }>);

      return totals;
    },
    enabled: !!user,
  });

  return {
    invoices: invoicesQuery.data || [],
    totals: totalsQuery.data || {},
    isLoading: invoicesQuery.isLoading,
    processInvoice: processInvoiceMutation.mutate,
    isProcessing: processInvoiceMutation.isPending,
    updateInvoiceData: updateInvoiceDataMutation.mutate,
    deleteInvoiceData: deleteInvoiceDataMutation.mutate,
  };
}
