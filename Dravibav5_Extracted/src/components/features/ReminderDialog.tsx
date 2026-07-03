import { useState } from 'react';
import { Bell, Calendar, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReminders } from '@/hooks/useReminders';

interface ReminderDialogProps {
  fileId: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReminderDialog({ fileId, fileName, open, onOpenChange }: ReminderDialogProps) {
  const { createReminder, isCreating } = useReminders();
  const [reminderType, setReminderType] = useState<'expiration' | 'review' | 'payment' | 'custom'>('expiration');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReminder({
      file_id: fileId,
      reminder_type: reminderType,
      title,
      description,
      reminder_date: new Date(reminderDate).toISOString(),
    });
    onOpenChange(false);
    // Reset form
    setTitle('');
    setDescription('');
    setReminderDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Criar Lembrete - {fileName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Lembrete</label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value as any)}
              className="w-full border border-border rounded-md px-3 py-2"
              required
            >
              <option value="expiration">Vencimento</option>
              <option value="review">Revisão</option>
              <option value="payment">Pagamento</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <Input
              placeholder="Ex: Pagamento da nota fiscal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
            <Textarea
              placeholder="Detalhes adicionais sobre o lembrete..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data e Hora do Lembrete</label>
            <Input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Você receberá uma notificação 24 horas antes da data definida.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Lembrete'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
