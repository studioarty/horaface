import { TrendingUp, Sparkles, AlertTriangle, CheckCircle2, Loader, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePredictions } from '@/hooks/usePredictions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PredictiveAnalysis() {
  const { predictions, isLoading, generatePredictions, isGenerating } = usePredictions();

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'monthly_spending': return TrendingUp;
      case 'tax_forecast': return AlertTriangle;
      case 'supplier_trends': return CheckCircle2;
      case 'anomaly_detection': return AlertTriangle;
      default: return Brain;
    }
  };

  const getPredictionColor = (type: string) => {
    switch (type) {
      case 'monthly_spending': return 'from-blue-500 to-blue-700';
      case 'tax_forecast': return 'from-orange-500 to-orange-700';
      case 'supplier_trends': return 'from-green-500 to-green-700';
      case 'anomaly_detection': return 'from-red-500 to-red-700';
      default: return 'from-purple-500 to-purple-700';
    }
  };

  const getPredictionTitle = (type: string) => {
    switch (type) {
      case 'monthly_spending': return 'Previsão de Gastos';
      case 'tax_forecast': return 'Previsão de Impostos';
      case 'supplier_trends': return 'Tendências de Fornecedores';
      case 'anomaly_detection': return 'Anomalias Detectadas';
      default: return 'Análise';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader className="w-12 h-12 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-muted-foreground">Carregando análises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            Análise Preditiva com IA
          </h3>
          <p className="text-muted-foreground mt-1">
            Insights e previsões baseadas em machine learning
          </p>
        </div>
        <Button
          onClick={() => generatePredictions()}
          disabled={isGenerating}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar Novas Previsões
            </>
          )}
        </Button>
      </div>

      {/* Predictions Grid */}
      {predictions.length === 0 ? (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-12 text-center">
          <Brain className="w-20 h-20 mx-auto mb-4 text-purple-400 opacity-50" />
          <h4 className="text-lg font-semibold mb-2">Nenhuma previsão disponível</h4>
          <p className="text-muted-foreground mb-6">
            Clique em "Gerar Novas Previsões" para criar análises preditivas baseadas nos seus dados
          </p>
          <Button
            onClick={() => generatePredictions()}
            disabled={isGenerating}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Começar Análise
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => {
            const Icon = getPredictionIcon(prediction.prediction_type);
            const colorClass = getPredictionColor(prediction.prediction_type);
            const title = getPredictionTitle(prediction.prediction_type);

            return (
              <div
                key={prediction.id}
                className={`group relative bg-gradient-to-br ${colorClass} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{title}</h4>
                        <p className="text-sm opacity-80">{formatMonth(prediction.period)}</p>
                      </div>
                    </div>
                    {prediction.confidence_score && (
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {(prediction.confidence_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs opacity-80">Confiança</div>
                      </div>
                    )}
                  </div>

                  {prediction.predicted_value !== undefined && (
                    <div className="mb-4">
                      <div className="text-3xl font-bold">
                        {prediction.prediction_type === 'tax_forecast' 
                          ? `${prediction.predicted_value.toFixed(2)}%`
                          : prediction.prediction_type === 'anomaly_detection'
                          ? `${prediction.predicted_value} anomalias`
                          : formatCurrency(prediction.predicted_value)
                        }
                      </div>
                      <div className="text-sm opacity-80 mt-1">Valor Previsto</div>
                    </div>
                  )}

                  {prediction.insights && (
                    <div className="space-y-2 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      {Object.entries(prediction.insights).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <span className="opacity-80 capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-medium ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs opacity-70 mt-4">
                    Gerado {formatDistanceToNow(new Date(prediction.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
