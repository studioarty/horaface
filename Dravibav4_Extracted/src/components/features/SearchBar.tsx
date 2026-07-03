import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  minSize: string;
  maxSize: string;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    minSize: '',
    maxSize: '',
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      query: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      minSize: '',
      maxSize: '',
    };
    setFilters(emptyFilters);
    onSearch(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar arquivos por nome..."
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-secondary')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
        <Button onClick={handleSearch}>
          Buscar
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg border border-border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de arquivo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
              <option value="application/pdf">PDFs</option>
              <option value="text">Documentos de texto</option>
              <option value="application">Outros</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data inicial</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data final</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tamanho mínimo (MB)</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={filters.minSize}
              onChange={(e) => setFilters({ ...filters, minSize: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tamanho máximo (MB)</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={filters.maxSize}
              onChange={(e) => setFilters({ ...filters, maxSize: e.target.value })}
              placeholder="Ilimitado"
            />
          </div>
        </div>
      )}
    </div>
  );
}
