import { FileText, FolderOpen, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatsCard from '@/components/features/StatsCard';
import QuotaCard from '@/components/features/QuotaCard';
import ActivityFeed from '@/components/features/ActivityFeed';
import { Button } from '@/components/ui/button';
import { useFiles } from '@/hooks/useFiles';
import { useQuota } from '@/hooks/useQuota';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#ec4899', '#f97316', '#6b7280'];

export default function Dashboard() {
  const { user } = useAuth();
  const { files } = useFiles();
  const { quota } = useQuota();
  const { activities } = useActivities();

  console.log('Dashboard renderizado');
  console.log('Usuário:', user);
  console.log('Total de arquivos:', files.length);
  console.log('Quota:', quota);

  // Map activities to the format expected by ActivityFeed
  const mappedActivities = activities.map(activity => ({
    id: activity.id,
    type: activity.type,
    fileName: activity.file_name,
    userName: user?.username || 'Você',
    timestamp: activity.created_at,
  }));

  // Prepare data for file type distribution chart
  const fileTypeData = files.reduce((acc, file) => {
    const type = file.type.split('/')[0] || 'outros';
    const typeLabel = type === 'image' ? 'Imagens' :
                     type === 'video' ? 'Vídeos' :
                     type === 'application' ? 'Documentos' :
                     type === 'text' ? 'Textos' : 'Outros';
    
    const existing = acc.find(item => item.name === typeLabel);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: typeLabel, value: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Prepare data for storage usage over time (simulated)
  const storageOverTime = activities
    .filter(a => a.type === 'upload')
    .reduce((acc, activity, index) => {
      const date = new Date(activity.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.arquivos++;
      } else {
        acc.push({ date, arquivos: 1 });
      }
      return acc;
    }, [] as Array<{ date: string; arquivos: number }>)
    .slice(-7); // Last 7 days

  const exportReport = () => {
    const reportData = {
      usuario: user?.username,
      data: new Date().toLocaleString('pt-BR'),
      totalArquivos: files.length,
      espacoUsado: quota?.quota_used || 0,
      espacoTotal: quota?.quota_limit || 0,
      atividades: activities.length,
      tiposDeArquivos: fileTypeData,
    };

    const csvContent = `Relatório PontoCloud\n\nUsuário,${reportData.usuario}\nData,${reportData.data}\nTotal de Arquivos,${reportData.totalArquivos}\nEspaço Usado (bytes),${reportData.espacoUsado}\nEspaço Total (bytes),${reportData.espacoTotal}\nAtividades,${reportData.atividades}\n\nDistribuição de Arquivos\nTipo,Quantidade\n${fileTypeData.map(item => `${item.name},${item.value}`).join('\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_pontocloud_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral detalhada da sua plataforma de gestão documental
          </p>
        </div>
        <Button onClick={exportReport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Arquivos"
          value={files.length}
          subtitle="Arquivos enviados"
          icon={FileText}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Espaço Usado"
          value={quota ? `${((quota.quota_used / quota.quota_limit) * 100).toFixed(0)}%` : '0%'}
          subtitle="Do total disponível"
          icon={FolderOpen}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Atividades"
          value={activities.length}
          subtitle="Ações recentes"
          icon={TrendingUp}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Uploads Hoje"
          value={activities.filter(a => {
            const today = new Date().toDateString();
            const actDate = new Date(a.created_at).toDateString();
            return actDate === today && a.type === 'upload';
          }).length}
          subtitle="Arquivos enviados"
          icon={FileText}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage Over Time */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Uploads nos Últimos Dias</h3>
          {storageOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={storageOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="arquivos" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Arquivos"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum dado de upload disponível
            </div>
          )}
        </div>

        {/* File Type Distribution */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição de Tipos de Arquivos</h3>
          {fileTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={fileTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fileTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum arquivo para análise
            </div>
          )}
        </div>
      </div>

      {/* Quota and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <QuotaCard 
            used={quota?.quota_used || 0} 
            total={quota?.quota_limit || 5368709120} 
          />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed activities={mappedActivities} />
        </div>
      </div>
    </div>
  );
}
