import { useQuota } from '@/hooks/useQuota';
import { useActivities } from '@/hooks/useActivities';
import { useFiles } from '@/hooks/useFiles';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/contexts/AuthContext';
import { useReminders } from '@/hooks/useReminders';
import { 
  Cloud, 
  TrendingUp, 
  Users, 
  FileText, 
  Download, 
  Upload, 
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Activity as ActivityIcon,
  Bell
} from 'lucide-react';
import { formatBytes } from '@/lib/mockData';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const { quota } = useQuota();
  const { activities } = useActivities();
  const { files } = useFiles();
  const { pendingApprovals } = useWorkflows();
  const { upcomingReminders } = useReminders();

  const usagePercent = quota ? ((quota.quota_used / quota.quota_limit) * 100).toFixed(1) : 0;

  // Mock data for charts - in real app, aggregate from actual data
  const storageData = [
    { month: 'Jan', used: 1.2 },
    { month: 'Fev', used: 1.8 },
    { month: 'Mar', used: 2.3 },
    { month: 'Abr', used: 2.9 },
    { month: 'Mai', used: 3.5 },
    { month: 'Jun', used: Number((quota?.quota_used || 0) / (1024 ** 3)).toFixed(2) },
  ];

  const fileTypeData = [
    { name: 'Documentos', value: files.filter(f => f.type.includes('pdf') || f.type.includes('document')).length, color: '#3b82f6' },
    { name: 'Imagens', value: files.filter(f => f.type.startsWith('image')).length, color: '#10b981' },
    { name: 'Vídeos', value: files.filter(f => f.type.startsWith('video')).length, color: '#f59e0b' },
    { name: 'Outros', value: files.filter(f => !f.type.startsWith('image') && !f.type.startsWith('video') && !f.type.includes('pdf') && !f.type.includes('document')).length, color: '#8b5cf6' },
  ];

  const activityData = [
    { day: 'Seg', uploads: 12, downloads: 8 },
    { day: 'Ter', uploads: 19, downloads: 15 },
    { day: 'Qua', uploads: 15, downloads: 12 },
    { day: 'Qui', uploads: 25, downloads: 18 },
    { day: 'Sex', uploads: 22, downloads: 20 },
    { day: 'Sáb', uploads: 8, downloads: 5 },
    { day: 'Dom', uploads: 5, downloads: 3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 3D Header with animated gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
                Bem-vindo, {user?.username}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Painel Executivo - CloudIBAV
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Status do Sistema</p>
                  <p className="text-2xl font-bold">Operacional</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                icon: Cloud, 
                label: 'Armazenamento Usado', 
                value: formatBytes(quota?.quota_used || 0),
                subtitle: `${usagePercent}% do total`,
                gradient: 'from-blue-500 to-cyan-500',
                iconBg: 'from-blue-400 to-blue-600'
              },
              { 
                icon: FileText, 
                label: 'Total de Arquivos', 
                value: files.length.toString(),
                subtitle: '+12 esta semana',
                gradient: 'from-green-500 to-emerald-500',
                iconBg: 'from-green-400 to-green-600'
              },
              { 
                icon: ActivityIcon, 
                label: 'Atividades Hoje', 
                value: activities.slice(0, 10).length.toString(),
                subtitle: 'Últimas 24h',
                gradient: 'from-purple-500 to-pink-500',
                iconBg: 'from-purple-400 to-purple-600'
              },
              { 
                icon: CheckCircle2, 
                label: 'Aprovações Pendentes', 
                value: pendingApprovals.length.toString(),
                subtitle: 'Requerem atenção',
                gradient: 'from-orange-500 to-red-500',
                iconBg: 'from-orange-400 to-orange-600'
              },
            ].map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl"
                  style={{
                    transform: 'perspective(1000px) rotateX(0deg)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(5deg) scale(1.05) translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) scale(1) translateY(0)';
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${metric.iconBg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-blue-100 mb-2">{metric.label}</p>
                  <p className="text-3xl font-bold mb-1">{metric.value}</p>
                  <p className="text-xs text-blue-200">{metric.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Storage Trend - 3D Card */}
          <div className="group bg-white rounded-2xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Crescimento de Armazenamento</h3>
                <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={storageData}>
                <defs>
                  <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="used" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* File Types Distribution - 3D Card */}
          <div className="group bg-white rounded-2xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Distribuição de Arquivos</h3>
                <p className="text-sm text-muted-foreground">Por tipo</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {fileTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {fileTypeData.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: item.color }}></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.value} arquivos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart - Full Width 3D Card */}
        <div className="group bg-white rounded-2xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <ActivityIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Atividade Semanal</h3>
              <p className="text-sm text-muted-foreground">Uploads vs Downloads</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="uploads" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Reminders - 3D Card */}
        {upcomingReminders.length > 0 && (
          <div className="group bg-white rounded-2xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Lembretes Próximos</h3>
                <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
              </div>
            </div>
            <div className="space-y-3">
              {upcomingReminders.slice(0, 5).map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-transparent rounded-xl hover:from-yellow-100 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground">{reminder.file?.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reminder.reminder_date), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities - 3D Card */}
        <div className="group bg-white rounded-2xl p-6 shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Atividades Recentes</h3>
              <p className="text-sm text-muted-foreground">Últimas ações no sistema</p>
            </div>
          </div>
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const icons = { upload: Upload, download: Download, delete: AlertCircle, share: Share2 };
              const colors = { upload: 'text-green-600', download: 'text-blue-600', delete: 'text-red-600', share: 'text-purple-600' };
              const Icon = icons[activity.type as keyof typeof icons] || FileText;
              const color = colors[activity.type as keyof typeof colors] || 'text-gray-600';

              return (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-xl hover:from-gray-100 transition-colors">
                  <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground capitalize">{activity.type}</p>
                    <p className="text-xs text-muted-foreground">{activity.file_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
