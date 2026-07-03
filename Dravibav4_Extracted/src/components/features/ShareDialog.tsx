import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Share2, Copy, Check, Lock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ShareDialogProps {
  file: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('7');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateShareLink = async () => {
    if (!file || !user) return;

    setIsGenerating(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

      const { error } = await supabase.from('shared_links').insert({
        file_id: file.id,
        user_id: user.id,
        token,
        password_hash: password ? btoa(password) : null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      const link = `${window.location.origin}/share/${token}`;
      setShareLink(link);
      toast.success('Link de compartilhamento criado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShareLink('');
    setPassword('');
    setExpiresIn('7');
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Compartilhar "{file?.name}"
          </DialogTitle>
        </DialogHeader>

        {!shareLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha (opcional)
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para link público"
              />
              <p className="text-xs text-muted-foreground">
                Proteja o link com uma senha
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Expira em
              </Label>
              <select
                id="expires"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="1">1 dia</option>
                <option value="3">3 dias</option>
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
              </select>
            </div>

            <Button onClick={generateShareLink} disabled={isGenerating} className="w-full">
              {isGenerating ? 'Gerando...' : 'Gerar Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link de compartilhamento</Label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {password && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Link protegido por senha
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Expira em {expiresIn} {parseInt(expiresIn) === 1 ? 'dia' : 'dias'}
              </p>
            </div>

            <Button onClick={handleClose} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
