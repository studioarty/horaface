import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface Prediction {
  id: string;
  user_id: string;
  prediction_type: 'monthly_spending' | 'supplier_trends' | 'tax_forecast' | 'anomaly_detection';
  period: string;
  predicted_value?: number;
  confidence_score?: number;
  insights?: any;
  model_version?: string;
  created_at: string;
  updated_at: string;
}

export function usePredictions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const predictionsQuery = useQuery({
    queryKey: ['predictions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Prediction[];
    },
    enabled: !!user,
  });

  const generatePredictionsMutation = useMutation({
    mutationFn: async () => {
      console.log('Generating predictions...');

      const { data, error } = await supabase.functions.invoke('generate-predictions', {
        body: {},
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
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast.success('Análise preditiva gerada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Prediction error:', error);
      toast.error(error.message || 'Erro ao gerar previsões');
    },
  });

  return {
    predictions: predictionsQuery.data || [],
    isLoading: predictionsQuery.isLoading,
    generatePredictions: generatePredictionsMutation.mutate,
    isGenerating: generatePredictionsMutation.isPending,
  };
}
