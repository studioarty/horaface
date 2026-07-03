import { useState, useRef } from 'react';
import { Upload, X, FileIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFiles } from '@/hooks/useFiles';
import { formatBytes } from '@/lib/mockData';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId?: string | null;
}

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function UploadDialog({ open, onOpenChange, currentFolderId }: UploadDialogProps) {
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useFiles();

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newItems: FileUploadItem[] = files.map(file => ({
      file,
      id: `${Date.now()}_${Math.random()}`,
      status: 'pending',
      progress: 0,
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadQueue.filter(item => item.status === 'pending');

    for (const item of pendingFiles) {
      // Update status to uploading
      setUploadQueue(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'uploading' as const, progress: 50 } : i))
      );

      try {
        await new Promise<void>((resolve, reject) => {
          uploadFile(
            { file: item.file, folderId: currentFolderId },
            {
              onSuccess: () => {
                setUploadQueue(prev =>
                  prev.map(i => (i.id === item.id ? { ...i, status: 'success' as const, progress: 100 } : i))
                );
                resolve();
              },
              onError: (error: any) => {
                setUploadQueue(prev =>
                  prev.map(i =>
                    i.id === item.id
                      ? { ...i, status: 'error' as const, progress: 0, error: error.message }
                      : i
                  )
                );
                reject(error);
              },
            }
          );
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  const removeItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(item => item.status !== 'success'));
  };

  const handleClose = () => {
    setUploadQueue([]);
    onOpenChange(false);
  };

  const hasFiles = uploadQueue.length > 0;
  const hasPending = uploadQueue.some(item => item.status === 'pending');
  const allCompleted = uploadQueue.every(item => item.status === 'success' || item.status === 'error');
  const successCount = uploadQueue.filter(item => item.status === 'success').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Enviar Arquivos</h3>
            {hasFiles && (
              <p className="text-xs text-muted-foreground mt-1">
                {successCount} de {uploadQueue.length} concluídos
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasFiles ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">
                Clique para selecionar arquivos
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode selecionar múltiplos arquivos de uma vez
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg relative overflow-hidden"
                >
                  {/* Progress bar background */}
                  {item.status === 'uploading' && (
                    <div
                      className="absolute inset-0 bg-primary/10 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  )}

                  <div className="relative z-10 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {item.status === 'pending' && <FileIcon className="w-5 h-5 text-blue-600" />}
                    {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                    {item.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {item.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>

                  <div className="relative z-10 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.status === 'uploading' && ` • ${item.progress}%`}
                      {item.status === 'error' && ` • ${item.error}`}
                    </p>
                  </div>

                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="relative z-10 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasFiles && (
          <div className="p-6 border-t border-border flex gap-3">
            {!allCompleted && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                Adicionar Mais
              </Button>
            )}
            {allCompleted && successCount > 0 && (
              <Button variant="outline" onClick={clearCompleted} className="flex-1">
                Limpar Concluídos
              </Button>
            )}
            {hasPending ? (
              <Button onClick={handleUploadAll} className="flex-1 gap-2">
                Enviar Todos
                <Upload className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleClose} className="flex-1">
                Fechar
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
