import { Search, Bell, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </Button>
      </div>
    </header>
  );
}
