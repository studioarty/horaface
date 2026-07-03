import { Shield, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePermissions, PERMISSION_LABELS, PermissionType } from '@/hooks/usePermissions';

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export default function PermissionsDialog({ open, onOpenChange, userId, userName }: PermissionsDialogProps) {
  const { permissions, grantPermission, revokePermission } = usePermissions(userId);

  const allPermissions = Object.keys(PERMISSION_LABELS) as PermissionType[];

  const hasPermission = (permType: PermissionType) => {
    return permissions.some(p => p.permission_type === permType);
  };

  const togglePermission = (permType: PermissionType) => {
    if (hasPermission(permType)) {
      revokePermission({ userId, permissionType: permType });
    } else {
      grantPermission({ userId, permissionType: permType });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Gerenciar Permissões - {userName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          {allPermissions.map((permType) => (
            <div
              key={permType}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  hasPermission(permType) ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {hasPermission(permType) ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Shield className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{PERMISSION_LABELS[permType]}</p>
                  <p className="text-xs text-muted-foreground">{permType}</p>
                </div>
              </div>
              <Button
                variant={hasPermission(permType) ? 'destructive' : 'default'}
                size="sm"
                onClick={() => togglePermission(permType)}
              >
                {hasPermission(permType) ? 'Revogar' : 'Conceder'}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
