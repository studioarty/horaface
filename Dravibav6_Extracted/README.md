# 📁 CloudIBAV

![CloudIBAV Banner](docs/images/banner.png)

**CloudIBAV** é uma plataforma SaaS completa de gestão documental e análise financeira com inteligência artificial, desenvolvida especificamente para IBAV (Instituto Brasileiro de Administração de Valores).

## 🚀 Principais Recursos

### 📂 Gestão Documental
- Upload e armazenamento seguro de documentos
- Organização hierárquica com pastas e subpastas
- Visualizador integrado (PDF, imagens, vídeos, documentos)
- Sistema de versionamento automático
- Busca avançada com filtros

### 🤝 Colaboração
- Compartilhamento de pastas com permissões granulares (read/write/admin)
- Comentários em arquivos com threads e menções
- Links públicos com senha e expiração
- Notificações em tempo real
- Dashboard de compartilhamentos

### 💰 Análise Financeira IA
- **Processamento de Notas Fiscais**: Extração automática de dados (OnSpace AI)
- **Dashboard Executivo 3D**: Gráficos interativos e KPIs em tempo real
- **Análise Preditiva**: Machine Learning para previsão de gastos
- **Alertas Inteligentes**: Notificações configuráveis de vencimentos e anomalias
- **Exportação Contábil**: Integração com Conta Azul, Omie, Totvs

### 🛡️ Segurança & Compliance
- Row Level Security (RLS) em todas as tabelas
- Controle de acesso baseado em roles (Admin/Manager/User)
- Auditoria completa de ações (audit logs)
- Quotas de armazenamento por usuário
- Backups automáticos agendados

### ⚙️ Workflows
- Sistema de aprovação multi-etapa
- Fluxos customizáveis por departamento
- Rastreamento de status
- Notificações de pendências

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │  Files   │  │Financial │  │ Settings │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ONSPACE CLOUD BACKEND                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │   Storage    │  │Edge Functions│          │
│  │   + RLS      │  │    Bucket    │  │    (Deno)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ONSPACE AI SERVICE                          │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  GPT-5, Gemini 2.5/3 para processamento de NF-e     │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Stack Tecnológico

### Frontend
- **Framework**: React 18.3.1 + TypeScript 5.5.3
- **Build**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.11
- **UI Components**: shadcn/ui + lucide-react
- **State**: React Query 5.x (server state) + Context API
- **Forms**: react-hook-form + zod
- **Charts**: Recharts
- **Routing**: React Router DOM 6.x

### Backend
- **Database**: PostgreSQL (OnSpace Cloud)
- **Auth**: OnSpace Cloud Auth (OTP + Password)
- **Storage**: OnSpace Cloud Storage
- **Serverless**: Edge Functions (Deno)
- **AI**: OnSpace AI (GPT-5.x, Gemini)

## 🎯 Casos de Uso

1. **Departamento Financeiro**: Processar e analisar notas fiscais automaticamente
2. **Gestão de Documentos**: Centralizar e organizar toda documentação da empresa
3. **Compliance**: Manter auditoria completa e controle de acesso
4. **Colaboração**: Compartilhar pastas entre equipes com segurança
5. **Previsibilidade**: Antecipar gastos e identificar anomalias

## 📖 Documentação

- [📥 Guia de Instalação](INSTALLATION.md) - Setup local e configuração
- [🚀 Guia de Deploy](DEPLOYMENT.md) - Deploy em servidor próprio
- [✨ Funcionalidades](FEATURES.md) - Documentação completa de recursos
- [🔌 API Reference](API.md) - Edge Functions e endpoints
- [🗄️ Database Schema](DATABASE.md) - Estrutura do banco de dados
- [👤 Manual do Usuário](USER_GUIDE.md) - Guia para usuários finais

## ⚡ Quick Start

```bash
# 1. Clone o repositório (após download do OnSpace)
cd cloudibav

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
# Já configurado automaticamente pelo OnSpace Cloud

# 4. Executar em desenvolvimento
npm run dev

# 5. Acessar aplicação
# http://localhost:5173
```

**Credenciais de teste:**
- Usuário: `admin`
- Senha: `admin`

## 📦 Estrutura do Projeto

```
cloudibav/
├── src/
│   ├── components/          # Componentes React
│   │   ├── features/       # Componentes de funcionalidades
│   │   ├── layout/         # Layout (Header, Sidebar)
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # Context API (Auth, Theme)
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities (supabase, auth)
│   ├── pages/              # Páginas/rotas
│   └── types/              # TypeScript types
├── supabase/
│   └── functions/          # Edge Functions
│       ├── process-invoice/      # Processar NF com IA
│       └── generate-predictions/ # Análise preditiva
├── docs/                   # Documentação
└── public/                 # Assets estáticos
```

## 🔐 Segurança

- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Autenticação OTP + Password
- ✅ Tokens JWT com refresh automático
- ✅ Validação de input com Zod
- ✅ CORS configurado
- ✅ Sanitização de dados
- ✅ Audit logs completos

## 🎨 Temas

CloudIBAV oferece 5 temas visuais:
- 🌞 **Light** - Tema claro padrão
- 🌙 **Dark** - Tema escuro para reduzir fadiga visual
- 🌊 **Ocean** - Tons de azul oceano
- 🌲 **Forest** - Tons verdes natureza
- 🌅 **Sunset** - Tons quentes laranja/vermelho

## 📊 Métricas do Sistema

| Métrica | Valor |
|---------|-------|
| Tabelas do Banco | 23 |
| Edge Functions | 2 |
| Componentes React | 45+ |
| Hooks Customizados | 18 |
| Páginas/Rotas | 8 |
| RLS Policies | 80+ |

## 🤝 Contribuindo

Este projeto foi desenvolvido especificamente para IBAV. Para modificações:

1. Criar branch de feature
2. Implementar mudanças
3. Testar localmente
4. Criar pull request

## 📄 Licença

Proprietary - © 2026 IBAV (Instituto Brasileiro de Administração de Valores)

## 👥 Suporte

Para suporte técnico:
- 📧 Email: suporte@ibav.com.br
- 📱 Telefone: +55 11 XXXX-XXXX
- 💬 Chat: Disponível no sistema (usuários autenticados)

## 🗺️ Roadmap

### Em Desenvolvimento
- [ ] Mobile App (React Native)
- [ ] OCR para digitalização de documentos físicos
- [ ] Integração com APIs bancárias
- [ ] Relatórios customizáveis

### Planejado
- [ ] Dashboard em tempo real com WebSockets
- [ ] Assinatura digital de documentos
- [ ] Integração com e-Social
- [ ] Módulo de contratos

---

**Desenvolvido com ❤️ para IBAV usando OnSpace Platform**

![OnSpace Logo](docs/images/onspace.png)
