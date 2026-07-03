import { useState } from 'react';
import { Shield, Bell, Palette, Database, Key, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import BackupManager from '@/components/features/BackupManager';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');
  const { theme, setTheme } = useTheme();
  console.log('Settings page renderizada');

  const themes = [
    { id: 'light' as Theme, name: 'Light', description: 'Tema claro padrão', colors: ['bg-white', 'bg-gray-100', 'bg-blue-500'] },
    { id: 'dark' as Theme, name: 'Dark', description: 'Tema escuro elegante', colors: ['bg-gray-900', 'bg-gray-800', 'bg-blue-600'] },
    { id: 'ocean' as Theme, name: 'Ocean', description: 'Tons de azul marinho', colors: ['bg-slate-50', 'bg-cyan-100', 'bg-cyan-600'] },
    { id: 'forest' as Theme, name: 'Forest', description: 'Verde floresta natural', colors: ['bg-emerald-50', 'bg-emerald-100', 'bg-emerald-600'] },
    { id: 'sunset' as Theme, name: 'Sunset', description: 'Laranja e roxo vibrante', colors: ['bg-orange-50', 'bg-orange-100', 'bg-orange-600'] },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize e configure sua plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings menu */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('appearance')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'appearance' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Palette className="w-5 h-5" />
            <span>Aparência</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'security' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Shield className="w-5 h-5" />
            <span>Segurança</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'notifications' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Bell className="w-5 h-5" />
            <span>Notificações</span>
          </button>
          <button 
            onClick={() => setActiveTab('backup')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors',
              activeTab === 'backup' 
                ? 'bg-primary text-white' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Database className="w-5 h-5" />
            <span>Backup</span>
          </button>
        </div>

        {/* Settings content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance settings */}
          {activeTab === 'appearance' && (
            <div className="bg-white rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Aparência e Temas</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Escolha seu tema
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themes.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id)}
                        className={cn(
                          'relative p-4 rounded-lg border-2 transition-all text-left',
                          theme === themeOption.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {theme === themeOption.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex gap-2 mb-3">
                          {themeOption.colors.map((color, idx) => (
                            <div key={idx} className={cn('w-8 h-8 rounded', color)} />
                          ))}
                        </div>
                        <p className="font-semibold text-foreground">{themeOption.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{themeOption.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security settings */}
          {activeTab === 'security' && (
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Configurações de Segurança</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Autenticação de Dois Fatores
                </label>
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA Desativado</p>
                    <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                  <Button variant="outline">Ativar</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Alterar Senha
                </label>
                <div className="space-y-3">
                  <Input type="password" placeholder="Senha atual" />
                  <Input type="password" placeholder="Nova senha" />
                  <Input type="password" placeholder="Confirmar nova senha" />
                  <Button>Atualizar Senha</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sessões Ativas
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Chrome - Windows</p>
                      <p className="text-xs text-muted-foreground">São Paulo, Brasil • Agora mesmo</p>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Ativa</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Safari - macOS</p>
                      <p className="text-xs text-muted-foreground">Rio de Janeiro, Brasil • 2h atrás</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Encerrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Notifications settings */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Preferências de Notificações</h3>
              <p className="text-muted-foreground mb-4">Configure como deseja receber notificações</p>
              <div className="space-y-3">
                {['Upload concluído', 'Quota atingindo limite', 'Novo compartilhamento', 'Atividade suspeita'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <span className="text-sm font-medium text-foreground">{item}</span>
                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backup settings */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <BackupManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
