import { useFolderShares } from '@/hooks/useFolderShares';
import { usePublicFolderLinks } from '@/hooks/usePublicFolderLinks';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Share2, Link2, Activity, Folder, Users, ExternalLink, Clock, Shield, Eye, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

export default function Shares() {
  const { user } = useAuth();
  const { sharedWithMe } = useFolderShares();
  const { logs } = useAuditLogs();

  const getPermissionInfo = (permission: string) => {
    switch (permission) {
      case 'read':
        return { label: 'Leitura', icon: Eye, color: 'text-blue-600' };
      case 'write':
        return { label: 'Escrita', icon: Edit, color: 'text-green-600' };
      case 'admin':
        return { label: 'Admin', icon: Shield, color: 'text-purple-600' };
      default:
        return { label: permission, icon: Eye, color: 'text-gray-600' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Central de Compartilhamentos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie todos os seus compartilhamentos e acessos
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pastas Compartilhadas Comigo</p>
              <p className="text-3xl font-bold mt-2">{sharedWithMe.length}</p>
            </div>
            <Users className="w-12 h-12 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Links Públicos Ativos</p>
              <p className="text-3xl font-bold mt-2">0</p>
            </div>
            <Link2 className="w-12 h-12 opacity-20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Ações Recentes</p>
              <p className="text-3xl font-bold mt-2">{logs.slice(0, 10).length}</p>
            </div>
            <Activity className="w-12 h-12 opacity-20" />
          </div>
        </div>
      </div>

      {/* Folders shared with me */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Pastas Compartilhadas Comigo
          </h3>
        </div>

        {sharedWithMe.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma pasta compartilhada com você</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sharedWithMe.map((share) => {
              const permInfo = getPermissionInfo(share.permission);
              const PermIcon = permInfo.icon;
              
              return (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Folder className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {share.folder?.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className={`flex items-center gap-1 text-xs ${permInfo.color}`}>
                          <PermIcon className="w-3 h-3" />
                          {permInfo.label}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(share.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit logs (only for admins) */}
      {user?.role === 'admin' && logs.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Logs de Auditoria Recentes
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">
                    Usuário
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">
                    Ação
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">
                    Recurso
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-2">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {log.user?.username || 'Sistema'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                      {log.resource_type}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
