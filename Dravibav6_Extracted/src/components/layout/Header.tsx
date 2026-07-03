import { Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NotificationBell from '@/components/features/NotificationBell';

interface HeaderProps {
  onUploadClick: () => void;
}

export default function Header({ onUploadClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar arquivos, pastas ou usuários..."
            className="pl-10 pr-4"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onUploadClick}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload</span>
        </Button>

        <NotificationBell />
      </div>
    </header>
  );
}
