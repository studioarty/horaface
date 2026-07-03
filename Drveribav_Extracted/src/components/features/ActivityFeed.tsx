import { Upload, Download, Trash2, Share2 } from 'lucide-react';
import { Activity } from '@/types';
import { formatDate } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return { icon: Upload, color: 'text-green-600', bg: 'bg-green-100' };
      case 'download':
        return { icon: Download, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'delete':
        return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100' };
      case 'share':
        return { icon: Share2, color: 'text-purple-600', bg: 'bg-purple-100' };
    }
  };

  const getActivityLabel = (type: Activity['type']) => {
    switch (type) {
      case 'upload':
        return 'enviou';
      case 'download':
        return 'baixou';
      case 'delete':
        return 'excluiu';
      case 'share':
        return 'compartilhou';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Atividades Recentes</h3>
        <p className="text-sm text-muted-foreground mt-1">Últimas ações realizadas</p>
      </div>

      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const { icon: Icon, color, bg } = getActivityIcon(activity.type);
          const actionLabel = getActivityLabel(activity.type);

          return (
            <div key={activity.id} className="p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon className={cn('w-5 h-5', color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.userName}</span>
                    {' '}{actionLabel}{' '}
                    <span className="font-medium">{activity.fileName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
