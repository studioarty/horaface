import { Clock, Download, RotateCcw, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFileVersions } from '@/hooks/useFileVersions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBytes } from '@/lib/mockData';

interface FileVersionsDialogProps {
  fileId: string | null;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FileVersionsDialog({
  fileId,
  fileName,
  open,
  onOpenChange,
}: FileVersionsDialogProps) {
  const { versions, isLoading, restoreVersion, isRestoring } = useFileVersions(fileId || undefined);

  const handleRestore = (versionId: string) => {
    if (!fileId) return;
    if (confirm('Tem certeza que deseja restaurar esta versão?')) {
      restoreVersion({ fileId, versionId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Histórico de Versões - {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando versões...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma versão anterior encontrada</p>
            </div>
          ) : (
            versions.map((version, index) => (
              <div
                key={version.id}
                className="bg-secondary/30 rounded-lg p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {version.user?.avatar ? (
                        <img
                          src={version.user.avatar}
                          alt=""
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                          {index === 0 ? 'Atual' : `v${version.version_number}`}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatBytes(version.size)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        Por {version.user?.username || 'Desconhecido'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => window.open(version.url, '_blank')}
                    >
                      <Download className="w-3 h-3" />
                      Baixar
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleRestore(version.id)}
                        disabled={isRestoring}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
