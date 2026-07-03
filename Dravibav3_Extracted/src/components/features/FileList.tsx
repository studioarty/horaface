import { useState } from 'react';
import { formatBytes, formatDate, getFileIcon } from '@/lib/mockData';
import { MoreVertical, Download, Share2, Trash2, Eye, Edit, Star, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFiles } from '@/hooks/useFiles';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useTags } from '@/hooks/useTags';
import FileViewer from '@/components/features/FileViewer';
import EditFileDialog from '@/components/features/EditFileDialog';
import ShareDialog from '@/components/features/ShareDialog';
import TagManager from '@/components/features/TagManager';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FileListProps {
  files: any[];
}

export default function FileList({ files }: FileListProps) {
  const { deleteFile, updateFile, isDeleting, isUpdating } = useFiles();
  const { user } = useAuth();
  const { favorites, isFavorite, toggleFavorite, isToggling } = useFavorites();
  const { tags } = useTags();
  const [viewerFile, setViewerFile] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editFile, setEditFile] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [shareFile, setShareFile] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [tagFile, setTagFile] = useState<any>(null);
  const [tagOpen, setTagOpen] = useState(false);

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, keyof typeof Icons> = {
      'file-text': 'FileText',
      'file-spreadsheet': 'FileSpreadsheet',
      'presentation': 'Presentation',
      'image': 'Image',
      'video': 'Video',
      'music': 'Music',
      'file-archive': 'Archive',
      'file': 'File',
    };
    
    const IconComponent = Icons[iconMap[iconName] || 'File'] as Icons.LucideIcon;
    return IconComponent;
  };

  const handleView = (file: any) => {
    console.log('Opening file viewer:', file.name);
    setViewerFile(file);
    setViewerOpen(true);
  };

  const handleDownload = (file: any) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const handleEdit = (file: any) => {
    setEditFile(file);
    setEditOpen(true);
  };

  const handleShare = (file: any) => {
    setShareFile(file);
    setShareOpen(true);
  };

  const handleTagsClick = (file: any) => {
    setTagFile(file);
    setTagOpen(true);
  };

  const handleFavoriteToggle = (fileId: string) => {
    toggleFavorite(fileId);
  };

  const getFileTags = (fileId: string) => {
    return tags.filter(tag => tag.file_id === fileId);
  };

  const handleSaveEdit = (id: string, updates: { name: string; folder_id?: string }) => {
    updateFile({ id, updates });
    setEditOpen(false);
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Tem certeza que deseja excluir este arquivo?')) {
      deleteFile(fileId);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Nome
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Tamanho
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Data
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {files.map((file) => {
              const FileIcon = getIcon(getFileIcon(file.type));
              const fileTags = getFileTags(file.id);
              const isFileFavorite = isFavorite(file.id);
              
              return (
                <tr key={file.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                  <td className="px-6 py-4" onClick={() => handleView(file)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          {isFileFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{file.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                          {fileTags.length > 0 && (
                            <div className="flex gap-1">
                              {fileTags.slice(0, 2).map(tag => (
                                <span
                                  key={tag.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                  style={{ backgroundColor: tag.tag_color }}
                                >
                                  {tag.tag_name}
                                </span>
                              ))}
                              {fileTags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{fileTags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(file);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "w-8 h-8",
                          isFileFavorite && "text-yellow-500 hover:text-yellow-600"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavoriteToggle(file.id);
                        }}
                        disabled={isToggling}
                      >
                        <Star className={cn("w-4 h-4", isFileFavorite && "fill-current")} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagsClick(file);
                        }}
                      >
                        <Tag className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(file);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(file);
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FileViewer 
        file={viewerFile} 
        open={viewerOpen} 
        onOpenChange={setViewerOpen} 
      />
      <EditFileDialog
        file={editFile}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />
      <ShareDialog
        file={shareFile}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
      {tagFile && (
        <Dialog open={tagOpen} onOpenChange={setTagOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerenciar Tags</DialogTitle>
            </DialogHeader>
            <TagManager fileId={tagFile.id} />
            <div className="flex justify-end pt-4">
              <Button onClick={() => setTagOpen(false)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
