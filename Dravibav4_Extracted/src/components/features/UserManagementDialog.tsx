import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserCog, HardDrive } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';
import { UserRole } from '@/types/database';

interface UserManagementDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, updates: any) => void;
  onUpdateQuota?: (userId: string, quota: number) => void;
  isSaving?: boolean;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'user', label: 'Usuário' },
];

const QUOTA_PRESETS = [
  { label: '1 GB', value: 1073741824 },
  { label: '5 GB', value: 5368709120 },
  { label: '10 GB', value: 10737418240 },
  { label: '50 GB', value: 53687091200 },
  { label: '100 GB', value: 107374182400 },
];

export default function UserManagementDialog({
  user,
  open,
  onOpenChange,
  onSave,
  onUpdateQuota,
  isSaving,
}: UserManagementDialogProps) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [department, setDepartment] = useState('');
  const [quotaGB, setQuotaGB] = useState('5');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setRole(user.role);
      setDepartment(user.department || '');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    onSave(user.id, {
      username: username.trim(),
      role,
      department: department.trim() || undefined,
    });
  };

  const handleQuotaUpdate = () => {
    if (!user || !onUpdateQuota) return;
    const quotaBytes = parseFloat(quotaGB) * 1073741824; // Convert GB to bytes
    onUpdateQuota(user.id, quotaBytes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Gerenciar Usuário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail (somente leitura)</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-secondary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite o nome"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Ex: TI, RH, Financeiro"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </form>

        {/* Quota Management */}
        {onUpdateQuota && (
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <HardDrive className="w-4 h-4" />
              Gerenciar Quota de Armazenamento
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota">Limite de armazenamento (GB)</Label>
              <Input
                id="quota"
                type="number"
                min="0.1"
                step="0.1"
                value={quotaGB}
                onChange={(e) => setQuotaGB(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {QUOTA_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuotaGB((preset.value / 1073741824).toString())}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleQuotaUpdate}
              disabled={isSaving}
              className="w-full"
              variant="secondary"
            >
              Atualizar Quota
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
