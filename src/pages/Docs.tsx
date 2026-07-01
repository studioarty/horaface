import { BookOpen, Server, Monitor, Globe, ShieldCheck, Settings, Terminal, Database, Wifi, Camera, Users, ArrowRight, CheckCircle2, Copy, ExternalLink, Upload, HardDrive, FolderOpen, Sparkles, Clock, RefreshCw, MapPin, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-400 border border-cyan-500/20">
          {number}
        </div>
        <div className="mt-2 flex-1 w-px bg-slate-800" />
      </div>
      <div className="pb-8 flex-1">
        <h3 className="text-base font-bold text-slate-200 mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
          {title}
        </h3>
        <div className="space-y-3 text-sm text-slate-400">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Copiado!" });
    });
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0d1117] overflow-hidden">
      {label && (
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <Copy className="size-3" />
            Copiar
          </button>
        </div>
      )}
      <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-cyan-400" />
        <h4 className="text-sm font-semibold text-cyan-400" style={{ fontFamily: "Rajdhani, sans-serif" }}>{title}</h4>
      </div>
      <div className="text-xs text-slate-400 space-y-1">{children}</div>
    </div>
  );
}

export default function Docs() {
  const [activeTab, setActiveTab] = useState<"install" | "hosting" | "kiosk" | "admin" | "faq" | "updates">("updates");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://seudominio.com";

  const tabs = [
    { id: "install" as const, label: "Instalação", icon: Server },
    { id: "hosting" as const, label: "Hostinger", icon: HardDrive },
    { id: "kiosk" as const, label: "Quiosque", icon: Monitor },
    { id: "admin" as const, label: "Admin", icon: ShieldCheck },
    { id: "faq" as const, label: "FAQ", icon: BookOpen },
    { id: "updates" as const, label: "Atualizações", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="size-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            Documentação de Instalação
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Guia completo para instalar e configurar o HoraFace no seu servidor e nos PCs de quiosque.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-900/50 p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        {activeTab === "install" && (
          <div className="space-y-2">
            <InfoCard icon={Globe} title="Arquitetura do Sistema">
              <p>O HoraFace é um sistema web que funciona com:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li><strong className="text-slate-300">Painel Admin</strong> — Acessado pelo navegador do servidor/PC admin</li>
                <li><strong className="text-slate-300">Quiosque(s)</strong> — Acessado pelo navegador dos PCs na entrada da empresa</li>
                <li><strong className="text-slate-300">Backend (Supabase Cloud)</strong> — Banco de dados, autenticação e armazenamento de fotos na nuvem</li>
              </ul>
              <p className="mt-2 text-amber-400/80">Ambos admin e quiosque acessam a mesma URL publicada, apenas com rotas diferentes.</p>
            </InfoCard>

            <div className="mt-6">
              <Step number={1} title="Publicar o Sistema">
                <p>O frontend do HoraFace é uma SPA (Single Page Application) estática que se conecta diretamente à API do seu banco de dados na nuvem.</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Configure as credenciais do banco nos arquivos de ambiente do build</li>
                  <li>Envie os arquivos compilados da pasta <code className="text-cyan-400">dist/</code> para o seu servidor (ex: Hostinger)</li>
                </ol>
                <CodeBlock label="URL publicada (exemplo)" code={`${origin}`} />
              </Step>

              <Step number={2} title="Acessar e Inicializar o Painel">
                <p>Acesse a URL publicada no navegador para criar as credenciais iniciais:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Você será redirecionado para a tela de login administrativo</li>
                  <li>Clique no botão <strong className="text-slate-300">"Primeira Instalação?"</strong> no rodapé da página</li>
                  <li>O sistema criará automaticamente a conta root padrão com o usuário <code className="text-cyan-400">admin</code> e senha <code className="text-cyan-400">admin</code></li>
                  <li>Faça login e, em seguida, altere a senha na página de Administradores para garantir a segurança</li>
                </ol>
              </Step>

              <Step number={3} title="Configurar Turnos">
                <p>No painel admin, acesse <strong className="text-slate-300">Turnos</strong> no menu lateral:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Os turnos Manhã (06:00–14:00), Tarde (14:00–22:00) e Noite (22:00–06:00) já estão pré-cadastrados</li>
                  <li>Edite os horários conforme necessário</li>
                  <li>Adicione novos turnos se precisar</li>
                </ol>
              </Step>

              <Step number={4} title="Cadastrar Prestadores">
                <p>Em <strong className="text-slate-300">Prestadores</strong>, cadastre cada parceiro:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Preencha nome, CPF, cargo e empresa</li>
                  <li>Selecione o(s) turno(s): Só Manhã, Só Tarde, ou Manhã + Tarde</li>
                  <li>Na etapa de captura facial, o sistema guiará 4 posições (frontal, esquerda, direita, inclinado)</li>
                  <li>A captura é automática — basta posicionar o rosto conforme indicado</li>
                </ol>
              </Step>

              <Step number={5} title="Configurar Quiosque(s)">
                <p>Cada PC de quiosque precisa:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong className="text-slate-300">Webcam USB</strong> conectada e funcionando</li>
                  <li><strong className="text-slate-300">Navegador</strong> Chrome ou Edge atualizado</li>
                  <li><strong className="text-slate-300">Conexão de rede</strong> com acesso à internet</li>
                  <li>Acesse a URL do quiosque no navegador (veja aba "Quiosque")</li>
                </ol>
              </Step>

              <Step number={6} title="Monitorar no Painel">
                <p>No <strong className="text-slate-300">Painel de Controle</strong> (Dashboard):</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>O <strong className="text-slate-300">Monitor de Quiosques</strong> mostra todos os quiosques registrados</li>
                  <li>Veja status online/offline de cada um em tempo real</li>
                  <li>Clique no ícone de câmera para visualizar a transmissão</li>
                  <li>Edite nome e localização de cada quiosque</li>
                </ol>
              </Step>
            </div>
          </div>
        )}

        {activeTab === "hosting" && (
          <div className="space-y-2">
            <InfoCard icon={HardDrive} title="Publicar na Hostinger">
              <p>O HoraFace é uma aplicação web estática (SPA). Você pode hospedá-la em qualquer serviço que sirva arquivos HTML, incluindo a <strong className="text-slate-300">Hostinger</strong>.</p>
              <p className="mt-1 text-amber-400/80">O backend (banco de dados, autenticação, storage) roda totalmente na nuvem do **Supabase** — você só precisa hospedar os arquivos compilados do frontend.</p>
            </InfoCard>

            <div className="mt-6">
              <Step number={1} title="Configurar o Ambiente Local">
                <p>Verifique o arquivo de ambiente para o build do frontend. Certifique-se de configurar um arquivo <code className="text-cyan-400">.env</code> na raiz do projeto:</p>
                <CodeBlock label=".env de Produção" code={`VITE_SUPABASE_URL=https://seu-projeto.supabase.co\nVITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui`} />
              </Step>

              <Step number={2} title="Instalar Node.js">
                <p>Para compilar o projeto, você precisa do Node.js instalado:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Acesse <a href="https://nodejs.org" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">nodejs.org</a> e baixe a versão LTS</li>
                  <li>Instale normalmente (Next, Next, Finish)</li>
                  <li>Abra o <strong className="text-slate-300">Prompt de Comando</strong> ou <strong className="text-slate-300">PowerShell</strong></li>
                </ol>
                <CodeBlock label="Verificar instalação" code={`node --version\nnpm --version`} />
              </Step>

              <Step number={3} title="Compilar o Projeto (Build)">
                <p>No terminal, navegue até a pasta do projeto extraído e execute:</p>
                <CodeBlock label="Instalar dependências" code={`cd pasta-do-projeto\nnpm install`} />
                <CodeBlock label="Gerar build de produção" code={`npm run build`} />
                <p className="mt-2">Isso criará uma pasta <code className="text-cyan-400">dist/</code> com todos os arquivos otimizados para produção.</p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 mt-2">
                  <p className="text-xs text-emerald-400">A pasta <code>dist/</code> contém: <code>index.html</code>, <code>.htaccess</code>, arquivos CSS, JS e assets. Estes são os únicos arquivos que você precisa enviar para a Hostinger.</p>
                </div>
              </Step>

              <Step number={4} title="Acessar o Gerenciador de Arquivos da Hostinger">
                <p>No painel da Hostinger:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Faça login em <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">hpanel.hostinger.com</a></li>
                  <li>Selecione o seu domínio/site</li>
                  <li>No menu lateral, clique em <strong className="text-slate-300">"Gerenciador de Arquivos"</strong></li>
                  <li>Ou acesse via <strong className="text-slate-300">"Avançado" → "Gerenciador de Arquivos"</strong></li>
                </ol>
              </Step>

              <Step number={5} title="Fazer Upload dos Arquivos">
                <p>No Gerenciador de Arquivos da Hostinger:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Navegue até a pasta <code className="text-cyan-400">public_html</code></li>
                  <li><strong className="text-red-400">Apague todo o conteúdo existente</strong> dentro de <code>public_html</code> (exceto <code>.htaccess</code> se houver)</li>
                  <li>Clique em <strong className="text-slate-300">"Enviar Arquivos"</strong> (Upload)</li>
                  <li>Selecione <strong className="text-slate-300">TODOS os arquivos e pastas de dentro da pasta <code>dist/</code></strong></li>
                  <li>Aguarde o upload concluir</li>
                </ol>
                <CodeBlock label="Estrutura final em public_html" code={`public_html/\n├── .htaccess          ← Roteamento SPA (já incluído no build)\n├── index.html         ← Página principal\n├── assets/\n│   ├── index-xxxxx.js ← JavaScript compilado\n│   ├── index-xxxxx.css← CSS compilado\n│   └── hero-hud-xxxxx.jpg\n└── _redirects          ← Fallback (opcional)`} />
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-2">
                  <p className="text-xs text-amber-400"><strong>IMPORTANTE:</strong> Envie o <strong>conteúdo</strong> da pasta <code>dist/</code>, não a pasta <code>dist/</code> em si. O <code>index.html</code> deve ficar diretamente dentro de <code>public_html/</code>.</p>
                </div>
              </Step>

              <Step number={6} title="Verificar o .htaccess">
                <p>O arquivo <code className="text-cyan-400">.htaccess</code> é essencial para o roteamento funcionar. Ele já é incluído automaticamente no build. Verifique que está presente em <code>public_html/</code>:</p>
                <CodeBlock label="Conteúdo do .htaccess (já incluído)" code={`<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteBase /\n  RewriteRule ^index\\.html$ - [L]\n  RewriteCond %{REQUEST_FILENAME} !-f\n  RewriteCond %{REQUEST_FILENAME} !-d\n  RewriteRule . /index.html [L]\n</IfModule>`} />
                <p className="mt-2">Sem esse arquivo, acessar URLs como <code>/quiosque</code> ou <code>/login</code> diretamente resultará em erro 404.</p>
              </Step>

              <Step number={7} title="Configurar SSL (HTTPS)">
                <p>O reconhecimento facial requer HTTPS para acessar a câmera:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>No painel Hostinger, vá em <strong className="text-slate-300">"Segurança" → "SSL"</strong></li>
                  <li>Ative o <strong className="text-slate-300">SSL gratuito</strong> (Let's Encrypt)</li>
                  <li>Ative <strong className="text-slate-300">"Forçar HTTPS"</strong> nas configurações</li>
                </ol>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 mt-2">
                  <p className="text-xs text-red-400"><strong>OBRIGATÓRIO:</strong> Sem HTTPS, os navegadores bloqueiam o acesso à webcam. O SSL é gratuito na Hostinger.</p>
                </div>
              </Step>

              <Step number={8} title="Testar">
                <p>Após o upload e SSL ativo:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Acesse <code className="text-cyan-400">https://seudominio.com</code> — deve carregar a tela de login</li>
                  <li>Crie sua conta de administrador</li>
                  <li>Teste o quiosque em <code className="text-cyan-400">https://seudominio.com/quiosque</code></li>
                  <li>Verifique se a câmera abre corretamente</li>
                </ol>
              </Step>
            </div>

            <InfoCard icon={Upload} title="Alternativa: Upload via FTP">
              <p>Se preferir usar FTP em vez do Gerenciador de Arquivos:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>No painel Hostinger: <strong className="text-slate-300">Avançado → Contas FTP</strong></li>
                <li>Copie os dados de conexão (host, usuário, senha, porta)</li>
                <li>Use um cliente FTP como <a href="https://filezilla-project.org" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">FileZilla</a></li>
                <li>Conecte e envie o conteúdo de <code>dist/</code> para <code>public_html/</code></li>
              </ol>
              <CodeBlock label="Dados de conexão FTP (exemplo)" code={`Host: ftp.seudominio.com\nPorta: 21\nUsuário: u123456789\nSenha: (sua senha FTP da Hostinger)`} />
            </InfoCard>

            <InfoCard icon={FolderOpen} title="Atualizações Futuras">
              <p>Para atualizar o sistema após realizar alterações locais no código-fonte:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Abra o terminal na pasta raiz do projeto</li>
                <li>Execute <code className="text-cyan-400">npm run build</code> novamente</li>
                <li>Envie o conteúdo gerado dentro da pasta local <code>dist/</code> para a pasta <code>public_html/</code> na Hostinger</li>
              </ol>
              <p className="mt-1 text-emerald-400">Os dados cadastrados (colaboradores, pontos, turnos) ficam salvos no Supabase na nuvem e não são perdidos nas atualizações do frontend.</p>
            </InfoCard>

            <InfoCard icon={Terminal} title="Solução de Problemas">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-slate-300">Erro 404 ao acessar /login ou /quiosque:</strong> O <code>.htaccess</code> não está no <code>public_html/</code> ou o <code>mod_rewrite</code> está desativado</li>
                <li><strong className="text-slate-300">Tela branca:</strong> Os arquivos JS/CSS não foram enviados. Verifique se a pasta <code>assets/</code> está dentro de <code>public_html/</code></li>
                <li><strong className="text-slate-300">Câmera não abre:</strong> SSL (HTTPS) não está ativo. Ative em Segurança → SSL</li>
                <li><strong className="text-slate-300">Erro de conexão com o banco:</strong> Verifique se a internet do local está ativa e se as chaves da API do Supabase no arquivo <code>.env</code> do build estavam corretas.</li>
              </ul>
            </InfoCard>
          </div>
        )}

        {activeTab === "kiosk" && (
          <div className="space-y-6">
            <InfoCard icon={Monitor} title="URL do Quiosque">
              <p>Cada quiosque usa um identificador único via parâmetro de URL:</p>
            </InfoCard>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Formato da URL
              </h3>
              <CodeBlock
                label="Estrutura"
                code={`${origin}/quiosque?id=IDENTIFICADOR&name=NOME&location=LOCAL`}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-xs font-mono text-cyan-400 mb-1">Parâmetros</p>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    <li><code className="text-emerald-400">id</code> — Identificador único (obrigatório). Ex: <code>entrada-principal</code></li>
                    <li><code className="text-emerald-400">name</code> — Nome exibido no painel (opcional). Ex: <code>Recepção</code></li>
                    <li><code className="text-emerald-400">location</code> — Localização (opcional). Ex: <code>Térreo</code></li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-xs font-mono text-cyan-400 mb-1">Auto-registro</p>
                  <p className="text-xs text-slate-400">
                    O quiosque se registra automaticamente no banco de dados ao conectar pela primeira vez. Não é necessário configurar no painel antes.
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-200 mt-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Exemplos de Configuração
              </h3>

              <CodeBlock
                label="Quiosque único (padrão)"
                code={`${origin}/quiosque`}
              />
              <CodeBlock
                label="Entrada principal"
                code={`${origin}/quiosque?id=entrada-principal&name=Entrada Principal&location=Térreo`}
              />
              <CodeBlock
                label="Recepção 2º andar"
                code={`${origin}/quiosque?id=recepcao-2&name=Recepção 2º Andar&location=2º Andar`}
              />
              <CodeBlock
                label="Portaria"
                code={`${origin}/quiosque?id=portaria&name=Portaria&location=Estacionamento`}
              />

              <h3 className="text-lg font-bold text-slate-200 mt-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Configurar no Windows (Inicialização Automática)
              </h3>
              <p className="text-sm text-slate-400">
                Para o quiosque abrir automaticamente ao ligar o PC:
              </p>

              <CodeBlock
                label="1. Crie um atalho na área de trabalho com o comando"
                code={`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk --start-fullscreen --disable-session-crashed-bubble --noerrdialogs "${origin}/quiosque?id=entrada-principal&name=Entrada Principal&location=Térreo"`}
              />

              <CodeBlock
                label="2. Mova o atalho para a pasta de inicialização automática"
                code={`Win + R → shell:startup → Cole o atalho nessa pasta`}
              />

              <CodeBlock
                label="3. (Opcional) Script BAT para reiniciar Chrome automaticamente"
                code={`@echo off
:loop
start /wait "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk --start-fullscreen "${origin}/quiosque?id=entrada-principal&name=Entrada Principal&location=Térreo"
timeout /t 5
goto loop`}
              />

              <InfoCard icon={Settings} title="Dicas para o PC do Quiosque">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Desative protetor de tela e hibernação do Windows</li>
                  <li>Configure o Chrome para <strong className="text-slate-300">permitir câmera automaticamente</strong> para o domínio</li>
                  <li>Use uma webcam USB de boa qualidade (720p mínimo, recomendado 1080p)</li>
                  <li>Posicione a webcam na altura dos olhos dos prestadores</li>
                  <li>Garanta boa iluminação frontal (evitar contraluz)</li>
                  <li>O sistema funciona melhor em um monitor touchscreen</li>
                </ul>
              </InfoCard>

              <InfoCard icon={Camera} title="Como Obter a Melhor Resolução da Webcam">
                <p className="mb-2">O sistema solicita automaticamente imagens em alta definição (HD 720p ou superior) da câmera para o algoritmo de inteligência artificial trabalhar com alta fidelidade de detalhes. Para garantir que sua webcam entregue a melhor qualidade:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Conexão em Porta USB 3.0:</strong> Conecte a webcam preferencialmente em portas USB azuis (USB 3.0/3.1) para garantir largura de banda de dados suficiente para resoluções HD/Full HD sem gargalos de hardware.</li>
                  <li><strong>Ajuste de Foco e Iluminação:</strong> Se a sua câmera possuir anel de foco manual, ajuste-o até que as linhas do rosto fiquem nítidas. A IA necessita de boa iluminação frontal (evite contra-luz de janelas ou lâmpadas fortes atrás da pessoa).</li>
                  <li><strong>Resolução de Captura no SO:</strong> No Linux/Windows, certifique-se de que a webcam não está sendo limitada por softwares de terceiros. A IA ajusta dinamicamente a grade neural (224x224 no modo leve ou 416x416 no modo de precisão superior).</li>
                </ul>
              </InfoCard>

              <InfoCard icon={Camera} title="Permissão de Câmera no Chrome">
                <p>Para permitir câmera automaticamente sem popup:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Acesse <code className="text-cyan-400">chrome://settings/content/camera</code></li>
                  <li>Em "Permitir", adicione a URL do seu site</li>
                  <li>Ou use a flag: <code className="text-cyan-400">--use-fake-ui-for-media-stream</code> no atalho do Chrome</li>
                </ol>
              </InfoCard>
            </div>
          </div>
        )}

        {activeTab === "admin" && (
          <div className="space-y-6">
            <InfoCard icon={ShieldCheck} title="Painel Administrativo">
              <p>O painel admin é protegido por autenticação. Apenas usuários com conta podem acessar.</p>
            </InfoCard>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                Funcionalidades do Admin
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Monitor, title: "Painel de Controle", desc: "Dashboard com estatísticas em tempo real, notificações de atraso, monitor de câmera dos quiosques e configurações." },
                  { icon: Camera, title: "Timesheet", desc: "Registrar medição via webcam diretamente do admin. Mesmo reconhecimento facial dos quiosques." },
                  { icon: Users, title: "Prestadores", desc: "Cadastrar, editar e remover prestadores com captura facial em 4 posições para máxima precisão." },
                  { icon: Settings, title: "Turnos", desc: "Gerenciar turnos de trabalho com horários, dias da semana e cores de identificação." },
                  { icon: Database, title: "Relatórios", desc: "Relatórios semanais, quinzenais e mensais com horas trabalhadas por prestador." },
                  { icon: Wifi, title: "Multi-Quiosque", desc: "Monitorar câmera e status de múltiplos quiosques individualmente." },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="size-4 text-cyan-400" />
                      <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-bold text-slate-200 mt-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                URLs de Acesso
              </h3>

              <div className="space-y-2">
                {[
                  { path: "/", label: "Painel de Controle (Dashboard)" },
                  { path: "/ponto", label: "Ponto Eletrônico" },
                  { path: "/prestadores", label: "Gestão de Prestadores" },
                  { path: "/turnos", label: "Gestão de Turnos" },
                  { path: "/relatorios", label: "Relatórios" },
                  { path: "/docs", label: "Esta documentação" },
                  { path: "/quiosque", label: "Modo Quiosque (sem autenticação)" },
                ].map((route) => (
                  <div key={route.path} className="flex items-center gap-3 rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-2">
                    <code className="text-xs font-mono text-cyan-400 min-w-[140px]">{origin}{route.path}</code>
                    <ArrowRight className="size-3 text-slate-700" />
                    <span className="text-xs text-slate-400">{route.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "faq" && (
          <div className="space-y-4">
            {[
              {
                q: "Quantos quiosques posso ter?",
                a: "Não há limite. Cada quiosque é identificado por um ID único na URL. O admin pode monitorar todos individualmente no Dashboard.",
              },
              {
                q: "O sistema funciona offline?",
                a: "Não. Tanto o painel admin quanto os quiosques precisam de conexão com a internet para acessar o banco de dados na nuvem.",
              },
              {
                q: "Qual a precisão do reconhecimento facial?",
                a: "O sistema captura 4 posições faciais (frontal, esquerda, direita, inclinado) para máxima precisão. Em condições normais de iluminação, a taxa de acerto é superior a 95%. Recomenda-se boa iluminação frontal.",
              },
              {
                q: "Posso usar no celular ou tablet?",
                a: "Sim. O quiosque funciona em qualquer dispositivo com navegador e câmera. Tablets com tela touch são ideais para pontos de entrada.",
              },
              {
                q: "Como o admin monitora a câmera do quiosque?",
                a: "No Dashboard, o 'Monitor de Quiosques' exibe todos os quiosques registrados. Clique no ícone de câmera para ativar a transmissão de snapshots a cada 3 segundos.",
              },
              {
                q: "O que acontece se o quiosque perder conexão?",
                a: "O status no admin mudará para 'Offline' após 30 segundos sem heartbeat. Quando a conexão retornar, o quiosque se reconecta automaticamente.",
              },
              {
                q: "Como funciona o tempo mínimo de Medição?",
                a: "Após registrar a entrada, o prestador só pode registrar a saída após aguardar o tempo dinâmico determinado pelo Administrador nas Configurações Globais. Isso previne cadastros acidentais duplos e garante o controle.",
              },
              {
                q: "Posso personalizar as imagens do screensaver?",
                a: "Sim. No Dashboard > Configurações do Quiosque, adicione URLs de imagens que serão exibidas como slideshow durante o modo de espera.",
              },
              {
                q: "O sistema suporta múltiplos administradores?",
                a: "Sim. Qualquer pessoa pode criar uma conta de administrador através do processo de verificação por e-mail.",
              },
              {
                q: "Posso usar com domínio personalizado?",
                a: "Sim. Na publicação, escolha 'Adicionar Domínio Existente' e configure o DNS do seu domínio conforme as instruções.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                  {item.q}
                </h4>
                <p className="text-xs text-slate-400 pl-6">{item.a}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "updates" && (
          <div className="space-y-6">
            <InfoCard icon={Sparkles} title="Melhorias e Atualizações do Sistema">
              <p>O HoraFace recebeu atualizações importantes para aumentar o controle, a segurança e a velocidade de distribuição de novas versões. Abaixo está o resumo das últimas implementações de jornada e auditoria.</p>
            </InfoCard>

            <div className="grid gap-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>1. Cadastro de Período de Atividades Customizado</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Agora é possível cadastrar horários específicos de <strong>Início das Atividades</strong> e <strong>Fim das Atividades</strong> diretamente na ficha de cada colaborador. 
                    </p>
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li>O colaborador fica <strong>bloqueado</strong> de registrar o ponto antes do horário programado.</li>
                      <li>Cartões de colaboradores com horários configurados exibem um badge verde esmeralda no painel (ex: <span className="text-emerald-400">🕒 Horário: 08:00 - 17:00</span>).</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>2. Colaboradores Livres (Qualquer Local - Sem GPS)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Criada a opção <strong>"Qualquer Local (Livre - Sem GPS)"</strong> nas configurações do colaborador.
                    </p>
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li>Permite que prestadores específicos batam ponto a qualquer hora e em qualquer lugar, ignorando restrições de turnos e cercas virtuais.</li>
                      <li>Por segurança, os pontos registrados ainda enviam as coordenadas GPS para registro no histórico.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>3. Auditoria Silenciosa de Tentativas Bloqueadas</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Mecanismo antifraude de auditoria implementado no aplicativo de marcação de ponto:
                    </p>
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li>Se um colaborador normal tentar bater o ponto fora do horário permitido ou fora da cerca de GPS, o sistema realiza a captura facial e das coordenadas de geolocalização.</li>
                      <li>Esses dados de auditoria sobem para o servidor silenciosamente antes de mostrar a mensagem de erro na tela do dispositivo, registrando tentativas de fraudes.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Camera className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>4. Registro Fotográfico no Check-out (Saída)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      A auditoria fotográfica foi expandida para cobrir todo o ciclo de presença:
                    </p>
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li>Agora, a saída (check-out) também exige o registro facial e geolocalização, gerando fotos de auditoria tanto para a entrada quanto para a saída do colaborador.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                    <RefreshCw className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "Rajdhani, sans-serif" }}>5. Atualização Instantânea do Aplicativo (PWA Auto-Update)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Solução para evitar cache antigo nos navegadores de quiosques e celulares:
                    </p>
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li>Sempre que o usuário abre o aplicativo ou volta a focar na aba dele, o HoraFace busca novas atualizações da plataforma em segundo plano.</li>
                      <li>Caso uma atualização seja detectada e instalada pelo Service Worker, o aplicativo reinicia de forma automatizada instantaneamente para aplicar as melhorias e correções imediatamente.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
