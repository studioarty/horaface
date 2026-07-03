import { HardDrive, TrendingUp, Database, Archive } from 'lucide-react';
import QuotaCard from '@/components/features/QuotaCard';
import StatsCard from '@/components/features/StatsCard';
import { currentUser, mockUsers, formatBytes } from '@/lib/mockData';

export default function Storage() {
  console.log('Storage page renderizada');

  // Calculate total storage across all users
  const totalUsed = mockUsers.reduce((sum, user) => sum + user.quotaUsed, 0);
  const totalLimit = mockUsers.reduce((sum, user) => sum + user.quotaLimit, 0);
  
  // Calculate average usage
  const avgUsage = totalUsed / mockUsers.length;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Armazenamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o uso de espaço em disco da plataforma
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Espaço Total"
          value={formatBytes(totalLimit)}
          subtitle="Capacidade da plataforma"
          icon={Database}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Espaço Usado"
          value={formatBytes(totalUsed)}
          subtitle="Total utilizado"
          icon={HardDrive}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Espaço Livre"
          value={formatBytes(totalLimit - totalUsed)}
          subtitle="Disponível para uso"
          icon={Archive}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Uso Médio"
          value={formatBytes(avgUsage)}
          subtitle="Por usuário"
          icon={TrendingUp}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* Current user quota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Sua Quota</h3>
          <QuotaCard used={currentUser.quotaUsed} total={currentUser.quotaLimit} />
        </div>

        {/* Storage breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição por Usuário</h3>
          <div className="bg-white rounded-lg border border-border p-6 space-y-4">
            {mockUsers.map((user) => {
              const percentage = (user.quotaUsed / user.quotaLimit) * 100;
              const isWarning = percentage > 80;

              return (
                <div key={user.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{user.name}</span>
                    <span className="text-muted-foreground">
                      {formatBytes(user.quotaUsed)} / {formatBytes(user.quotaLimit)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isWarning ? 'bg-orange-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
