import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface InvoiceData {
  issue_date: string;
  total_amount: number;
  tax_amount: number;
  supplier_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    console.log('Generating predictions for user:', user.id);

    // Fetch invoice data
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoice_data')
      .select('issue_date, total_amount, tax_amount, supplier_name')
      .eq('user_id', user.id)
      .eq('extraction_status', 'completed')
      .order('issue_date', { ascending: true });

    if (invoicesError) throw invoicesError;

    if (!invoices || invoices.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient data for predictions. Need at least 3 invoices.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Simple predictive analytics
    const predictions = [];

    // 1. Monthly spending trend
    const monthlyData = groupByMonth(invoices);
    const months = Object.keys(monthlyData).sort();
    
    if (months.length >= 2) {
      const recentMonths = months.slice(-3);
      const avgSpending = recentMonths.reduce((sum, m) => sum + monthlyData[m].total, 0) / recentMonths.length;
      const trend = calculateTrend(recentMonths.map(m => monthlyData[m].total));
      
      const nextMonth = getNextMonth(months[months.length - 1]);
      const predictedSpending = avgSpending * (1 + trend);

      predictions.push({
        user_id: user.id,
        prediction_type: 'monthly_spending',
        period: nextMonth,
        predicted_value: predictedSpending,
        confidence_score: Math.max(0.5, Math.min(0.95, 0.7 + (recentMonths.length * 0.1))),
        insights: {
          avg_spending: avgSpending,
          trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
          trend_percentage: (trend * 100).toFixed(1),
        },
      });
    }

    // 2. Tax forecast
    const avgTaxRate = invoices.reduce((sum, inv) => {
      const total = Number(inv.total_amount) || 0;
      const tax = Number(inv.tax_amount) || 0;
      return sum + (total > 0 ? tax / total : 0);
    }, 0) / invoices.length;

    predictions.push({
      user_id: user.id,
      prediction_type: 'tax_forecast',
      period: getNextMonth(months[months.length - 1]),
      predicted_value: avgTaxRate * 100,
      confidence_score: 0.85,
      insights: {
        avg_tax_rate: (avgTaxRate * 100).toFixed(2) + '%',
        recommendation: avgTaxRate > 0.2 ? 'Alta carga tributária. Considere revisão fiscal.' : 'Carga tributária normal.',
      },
    });

    // 3. Supplier trends
    const supplierData = invoices.reduce((acc: any, inv: InvoiceData) => {
      const supplier = inv.supplier_name || 'Desconhecido';
      if (!acc[supplier]) {
        acc[supplier] = { count: 0, total: 0 };
      }
      acc[supplier].count++;
      acc[supplier].total += Number(inv.total_amount) || 0;
      return acc;
    }, {});

    const topSupplier = Object.entries(supplierData)
      .sort(([, a]: any, [, b]: any) => b.total - a.total)[0];

    if (topSupplier) {
      predictions.push({
        user_id: user.id,
        prediction_type: 'supplier_trends',
        period: getNextMonth(months[months.length - 1]),
        predicted_value: topSupplier[1].total,
        confidence_score: 0.75,
        insights: {
          top_supplier: topSupplier[0],
          spending_concentration: ((topSupplier[1].total / invoices.reduce((s, i) => s + Number(i.total_amount), 0)) * 100).toFixed(1) + '%',
          recommendation: topSupplier[1].total > avgSpending * 0.5 ? 'Alta dependência de um fornecedor. Considere diversificar.' : 'Distribuição saudável entre fornecedores.',
        },
      });
    }

    // 4. Anomaly detection
    const amounts = invoices.map(inv => Number(inv.total_amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length);
    const anomalies = invoices.filter(inv => Math.abs(Number(inv.total_amount) - mean) > stdDev * 2);

    if (anomalies.length > 0) {
      predictions.push({
        user_id: user.id,
        prediction_type: 'anomaly_detection',
        period: months[months.length - 1],
        predicted_value: anomalies.length,
        confidence_score: 0.9,
        insights: {
          anomaly_count: anomalies.length,
          mean_spending: mean.toFixed(2),
          std_deviation: stdDev.toFixed(2),
          recommendation: `${anomalies.length} transação(ões) atípica(s) detectada(s). Revisar para possíveis erros.`,
        },
      });
    }

    // Save predictions
    const { error: insertError } = await supabase
      .from('predictions')
      .upsert(
        predictions.map(p => ({
          ...p,
          model_version: '1.0.0',
        })),
        { onConflict: 'user_id,prediction_type,period' }
      );

    if (insertError) throw insertError;

    console.log(`Generated ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ success: true, predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Prediction error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function groupByMonth(invoices: InvoiceData[]): Record<string, { total: number; count: number }> {
  return invoices.reduce((acc: any, inv) => {
    const date = new Date(inv.issue_date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0 };
    }
    acc[month].total += Number(inv.total_amount) || 0;
    acc[month].count++;
    return acc;
  }, {});
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope / (sumY / n);
}

function getNextMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number);
  const nextDate = new Date(year, month, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
}
