import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlerts } from '@/hooks/useAlerts';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AlertManager() {
  const { rules, notifications, unreadCount, createRule, toggleRule, deleteRule, markAsRead } = useAlerts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'due_date' as any,
    days_before: '7',
  });

  const handleCreateRule = () => {
    const conditions: any = {};
    
    if (formData.rule_type === 'due_date') {
      conditions.days_before = parseInt(formData.days_before);
    }

    createRule({
      rule_name: formData.rule_name,
      rule_type: formData.rule_type,
      conditions,
      notification_channels: ['in_app'],
      is_active: true,
    });

    setDialogOpen(false);
    setFormData({ rule_name: '', rule_type: 'due_date', days_before: '7' });
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      due_date: 'Vencimento próximo',
      budget_exceeded: 'Orçamento excedido',
      duplicate_supplier: 'Fornecedor duplicado',
      anomaly: 'Anomalia detectada',
      high_tax: 'Imposto elevado',
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Alertas Inteligentes
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <p className="text-muted-foreground mt-1">
            Configure notificações automáticas para eventos importantes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Regra de Alerta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome da Regra</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="Ex: Alertar 7 dias antes do vencimento"
                />
              </div>
              <div>
                <Label>Tipo de Alerta</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData({ ...formData, rule_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Vencimento próximo</SelectItem>
                    <SelectItem value="budget_exceeded">Orçamento excedido</SelectItem>
                    <SelectItem value="duplicate_supplier">Fornecedor duplicado</SelectItem>
                    <SelectItem value="anomaly">Anomalia detectada</SelectItem>
                    <SelectItem value="high_tax">Imposto elevado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.rule_type === 'due_date' && (
                <div>
                  <Label>Dias de Antecedência</Label>
                  <Input
                    type="number"
                    value={formData.days_before}
                    onChange={(e) => setFormData({ ...formData, days_before: e.target.value })}
                    min="1"
                    max="90"
                  />
                </div>
              )}
              <Button onClick={handleCreateRule} className="w-full">
                Criar Regra
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Rules */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h4 className="font-semibold mb-4">Regras Ativas</h4>
        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma regra configurada ainda
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{rule.rule_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getRuleTypeLabel(rule.rule_type)}
                      {rule.conditions?.days_before && ` (${rule.conditions.days_before} dias antes)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleRule({ id: rule.id, isActive: !rule.is_active })}
                  >
                    {rule.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Remover esta regra?')) {
                        deleteRule(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h4 className="font-semibold mb-4">Notificações Recentes</h4>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação ainda
            </p>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.read ? 'bg-secondary/10' : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    getSeverityColor(notification.severity)
                  }`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{notification.title}</p>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.notified_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
