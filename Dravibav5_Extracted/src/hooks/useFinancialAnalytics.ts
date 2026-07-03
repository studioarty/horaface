import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierAnalytics {
  supplier_name: string;
  supplier_cnpj: string;
  total_amount: number;
  tax_amount: number;
  invoice_count: number;
}

export interface MonthlyAnalytics {
  month: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  invoice_count: number;
}

export interface UpcomingPayment {
  id: string;
  invoice_number: string;
  supplier_name: string;
  total_amount: number;
  due_date: string;
  days_until_due: number;
  file_name: string;
}

export function useFinancialAnalytics() {
  const { user } = useAuth();

  // Get all completed invoices
  const invoicesQuery = useQuery({
    queryKey: ['financial-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('invoice_data')
        .select('*, file:files(name)')
        .eq('user_id', user.id)
        .eq('extraction_status', 'completed')
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Aggregate by supplier
  const supplierAnalyticsQuery = useQuery({
    queryKey: ['supplier-analytics', user?.id],
    queryFn: async () => {
      const invoices = invoicesQuery.data || [];
      
      const supplierMap = new Map<string, SupplierAnalytics>();
      
      invoices.forEach((invoice: any) => {
        const key = invoice.supplier_cnpj || invoice.supplier_name || 'Desconhecido';
        const existing = supplierMap.get(key);
        
        if (existing) {
          existing.total_amount += Number(invoice.total_amount) || 0;
          existing.tax_amount += Number(invoice.tax_amount) || 0;
          existing.invoice_count += 1;
        } else {
          supplierMap.set(key, {
            supplier_name: invoice.supplier_name || 'Desconhecido',
            supplier_cnpj: invoice.supplier_cnpj || '',
            total_amount: Number(invoice.total_amount) || 0,
            tax_amount: Number(invoice.tax_amount) || 0,
            invoice_count: 1,
          });
        }
      });

      return Array.from(supplierMap.values())
        .sort((a, b) => b.total_amount - a.total_amount);
    },
    enabled: !!user && !!invoicesQuery.data,
  });

  // Monthly analytics
  const monthlyAnalyticsQuery = useQuery({
    queryKey: ['monthly-analytics', user?.id],
    queryFn: async () => {
      const invoices = invoicesQuery.data || [];
      
      const monthMap = new Map<string, MonthlyAnalytics>();
      
      invoices.forEach((invoice: any) => {
        if (!invoice.issue_date) return;
        
        const date = new Date(invoice.issue_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existing = monthMap.get(monthKey);
        
        if (existing) {
          existing.total_amount += Number(invoice.total_amount) || 0;
          existing.tax_amount += Number(invoice.tax_amount) || 0;
          existing.net_amount += Number(invoice.net_amount) || 0;
          existing.invoice_count += 1;
        } else {
          monthMap.set(monthKey, {
            month: monthKey,
            total_amount: Number(invoice.total_amount) || 0,
            tax_amount: Number(invoice.tax_amount) || 0,
            net_amount: Number(invoice.net_amount) || 0,
            invoice_count: 1,
          });
        }
      });

      return Array.from(monthMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12); // Last 12 months
    },
    enabled: !!user && !!invoicesQuery.data,
  });

  // Upcoming payments
  const upcomingPaymentsQuery = useQuery({
    queryKey: ['upcoming-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('invoice_data')
        .select('*, file:files(name)')
        .eq('user_id', user.id)
        .eq('extraction_status', 'completed')
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching upcoming payments:', error);
        return [];
      }

      return (data || []).map((invoice: any) => {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: invoice.id,
          invoice_number: invoice.invoice_number || 'N/A',
          supplier_name: invoice.supplier_name || 'Desconhecido',
          total_amount: invoice.total_amount,
          due_date: invoice.due_date,
          days_until_due: daysUntilDue,
          file_name: invoice.file?.name || 'Sem nome',
        };
      }) as UpcomingPayment[];
    },
    enabled: !!user?.id,
  });

  // Calculate totals
  const totals = {
    total_spent: invoicesQuery.data?.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0) || 0,
    total_taxes: invoicesQuery.data?.reduce((sum: number, inv: any) => sum + (Number(inv.tax_amount) || 0), 0) || 0,
    total_net: invoicesQuery.data?.reduce((sum: number, inv: any) => sum + (Number(inv.net_amount) || 0), 0) || 0,
    invoice_count: invoicesQuery.data?.length || 0,
  };

  return {
    invoices: invoicesQuery.data || [],
    supplierAnalytics: supplierAnalyticsQuery.data || [],
    monthlyAnalytics: monthlyAnalyticsQuery.data || [],
    upcomingPayments: upcomingPaymentsQuery.data || [],
    totals,
    isLoading: invoicesQuery.isLoading,
  };
}
