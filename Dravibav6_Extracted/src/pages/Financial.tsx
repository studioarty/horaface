import { DollarSign, TrendingUp, FileText, Calendar, Download, PieChart as PieChartIcon, Building2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PDFReportGenerator from '@/components/features/PDFReportGenerator';
import AccountingExport from '@/components/features/AccountingExport';
import PredictiveAnalysis from '@/components/features/PredictiveAnalysis';
import AlertManager from '@/components/features/AlertManager';
import { useState } from 'react';

export default function Financial() {
  const { supplierAnalytics, monthlyAnalytics, upcomingPayments, totals, isLoading } = useFinancialAnalytics();
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'alerts' | 'export'>('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = monthlyAnalytics.map(m => ({
      Mês: formatMonth(m.month),
      'Valor Total': m.total_amount,
      'Impostos': m.tax_amount,
      'Líquido': m.net_amount,
      'Quantidade': m.invoice_count,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analise-financeira-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analise-financeira-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando análise financeira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg border border-border p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'predictions'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Análise Preditiva
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'alerts'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Alertas Inteligentes
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'export'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Exportação
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Financeiro
          </h2>
          <p className="text-muted-foreground mt-1">Análise completa de notas fiscais e previsões</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PDFReportGenerator />
          <Button onClick={() => handleExport('csv')} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar JSON
          </Button>
        </div>
      </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="group relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(totals.total_spent)}</p>
            <p className="text-sm opacity-80">Gasto Total</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Impostos</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(totals.total_taxes)}</p>
            <p className="text-sm opacity-80">Total de Impostos</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">NFe</span>
            </div>
            <p className="text-3xl font-bold mb-1">{totals.invoice_count}</p>
            <p className="text-sm opacity-80">Notas Processadas</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Próximo</span>
            </div>
            <p className="text-3xl font-bold mb-1">{upcomingPayments.length}</p>
            <p className="text-sm opacity-80">Pagamentos Futuros</p>
          </div>
        </div>
      </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Evolução Mensal de Gastos
          </h3>
          {monthlyAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonth}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={formatMonth}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_amount" 
                  name="Total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tax_amount" 
                  name="Impostos" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Receipt className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p>Nenhum dado disponível</p>
              </div>
            </div>
          )}
        </div>

        {/* Supplier Distribution */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-lg hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-600" />
            Distribuição por Fornecedor
          </h3>
          {supplierAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={supplierAnalytics.slice(0, 8)}
                  dataKey="total_amount"
                  nameKey="supplier_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.supplier_name} (${((entry.total_amount / totals.total_spent) * 100).toFixed(1)}%)`}
                  labelLine={true}
                >
                  {supplierAnalytics.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Building2 className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p>Nenhum fornecedor registrado</p>
              </div>
            </div>
          )}
        </div>
      </div>

          {/* Tax Analysis Chart */}
          <div className="bg-white rounded-2xl border border-border p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-600" />
          Análise de Impostos Mensais
        </h3>
        {monthlyAnalytics.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tickFormatter={formatMonth}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                formatter={(value: any) => formatCurrency(value)}
                labelFormatter={formatMonth}
              />
              <Legend />
              <Bar dataKey="total_amount" name="Bruto" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="tax_amount" name="Impostos" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="net_amount" name="Líquido" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </div>

          {/* Upcoming Payments & Top Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Upcoming Payments */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Próximos Vencimentos
          </h3>
          <div className="space-y-3">
            {upcomingPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento futuro registrado</p>
            ) : (
              upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{payment.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">NF: {payment.invoice_number}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vence em {payment.days_until_due} dia(s) - {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(payment.total_amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.days_until_due <= 7 ? 'bg-red-100 text-red-800' :
                      payment.days_until_due <= 15 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {payment.days_until_due <= 7 ? 'Urgente' : payment.days_until_due <= 15 ? 'Atenção' : 'OK'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Principais Fornecedores
          </h3>
          <div className="space-y-3">
            {supplierAnalytics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum fornecedor registrado</p>
            ) : (
              supplierAnalytics.slice(0, 5).map((supplier, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{supplier.supplier_name}</p>
                      {supplier.supplier_cnpj && (
                        <p className="text-xs text-muted-foreground">CNPJ: {supplier.supplier_cnpj}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{supplier.invoice_count} nota(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(supplier.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((supplier.total_amount / totals.total_spent) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
          </div>
        </>
      )}

      {activeTab === 'predictions' && (
        <PredictiveAnalysis />
      )}

      {activeTab === 'alerts' && (
        <AlertManager />
      )}

      {activeTab === 'export' && (
        <div className="space-y-6">
          <AccountingExport />
          <div className="bg-white rounded-lg border border-border p-6">
            <PDFReportGenerator />
          </div>
        </div>
      )}
    </div>
  );
}
