import { useState } from 'react';
import { Shield, Clock, Database, Play, Calendar, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBackups } from '@/hooks/useBackups';
import { formatBytes } from '@/lib/mockData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function BackupManager() {
  const { backups, schedules, createBackup, createSchedule, toggleSchedule, deleteSchedule, isCreatingBackup } = useBackups();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('incremental');
  const [timeOfDay, setTimeOfDay] = useState('02:00');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleCreateSchedule = () => {
    createSchedule({ schedule_type: scheduleType, backup_type: backupType, time_of_day: timeOfDay });
    setScheduleOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Backups Rápidos
        </h3>
        <div className="flex gap-3">
          <Button
            onClick={() => createBackup('full')}
            disabled={isCreatingBackup}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Backup Completo
          </Button>
          <Button
            onClick={() => createBackup('incremental')}
            disabled={isCreatingBackup}
            variant="outline"
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Backup Incremental
          </Button>
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                Agendar Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Backup Automático</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Frequência</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as any)}
                    className="w-full border border-border rounded-md px-3 py-2"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Backup</label>
                  <select
                    value={backupType}
                    onChange={(e) => setBackupType(e.target.value as any)}
                    className="w-full border border-border rounded-md px-3 py-2"
                  >
                    <option value="incremental">Incremental</option>
                    <option value="full">Completo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Horário</label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateSchedule} className="w-full">
                  Criar Agendamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scheduled Backups */}
      {schedules.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Backups Agendados</h3>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {schedule.schedule_type === 'daily' ? 'Diário' : schedule.schedule_type === 'weekly' ? 'Semanal' : 'Mensal'}
                      {' - '}
                      {schedule.backup_type === 'full' ? 'Completo' : 'Incremental'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      às {schedule.time_of_day}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.is_active}
                      onChange={(e) => toggleSchedule({ id: schedule.id, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup History */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de Backups</h3>
        <div className="space-y-3">
          {backups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum backup realizado ainda</p>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getStatusIcon(backup.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">{backup.backup_type}</p>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                        backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                        backup.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {backup.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {backup.total_files} arquivos • {formatBytes(backup.total_size)}
                    </p>
                    {backup.error_message && (
                      <p className="text-xs text-red-600 mt-1">{backup.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {backup.completed_at ? (
                    formatDistanceToNow(new Date(backup.completed_at), { addSuffix: true, locale: ptBR })
                  ) : backup.started_at ? (
                    formatDistanceToNow(new Date(backup.started_at), { addSuffix: true, locale: ptBR })
                  ) : (
                    'Aguardando'
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
