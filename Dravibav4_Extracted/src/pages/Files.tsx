import { useState } from 'react';
import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileList from '@/components/features/FileList';
import SearchBar, { SearchFilters } from '@/components/features/SearchBar';
import FolderManager from '@/components/features/FolderManager';
import { useFiles } from '@/hooks/useFiles';

export default function Files() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    minSize: '',
    maxSize: '',
  });

  const { files, isLoading } = useFiles({
    query: filters.query,
    type: filters.type,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    minSize: filters.minSize ? parseFloat(filters.minSize) : undefined,
    maxSize: filters.maxSize ? parseFloat(filters.maxSize) : undefined,
    folderId: currentFolderId,
  });

  console.log('Files page renderizada');
  console.log('Total de arquivos:', files.length);
  console.log('Pasta atual:', currentFolderId);

  const handleSearch = (newFilters: SearchFilters) => {
    console.log('Aplicando filtros:', newFilters);
    setFilters(newFilters);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando arquivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Arquivos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e organize seus documentos
          </p>
        </div>
      </div>

      {/* Search bar */}
      <SearchBar onSearch={handleSearch} />

      {/* Folder manager */}
      <FolderManager currentFolderId={currentFolderId} onFolderChange={setCurrentFolderId} />

      {/* File list */}
      {files.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground mb-2">Nenhum arquivo encontrado</p>
          <p className="text-sm text-muted-foreground">Comece enviando seu primeiro arquivo</p>
        </div>
      ) : (
        <FileList files={files} />
      )}
    </div>
  );
}
