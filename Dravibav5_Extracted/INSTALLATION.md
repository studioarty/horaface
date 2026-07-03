# 📥 Guia de Instalação - CloudIBAV

Este guia detalha o processo completo de instalação e configuração do CloudIBAV.

## 📋 Pré-requisitos

### Software Necessário

| Software | Versão Mínima | Propósito |
|----------|---------------|-----------|
| Node.js | 18.x ou superior | Runtime JavaScript |
| npm | 9.x ou superior | Gerenciador de pacotes |
| Git | 2.x | Controle de versão |
| Navegador Moderno | Chrome 90+, Firefox 88+, Safari 14+ | Acesso à aplicação |

### Conhecimentos Recomendados

- ✅ Básico de linha de comando
- ✅ Conceitos de React (desejável)
- ✅ Noções de banco de dados (desejável)

## 🚀 Instalação Local

### Passo 1: Obter o Código

Se você está desenvolvendo no OnSpace:

```bash
# O código já está disponível no projeto OnSpace
# Acesse via interface web do OnSpace
```

Se você fez download do código fonte:

```bash
# Extrair arquivo ZIP baixado do OnSpace
unzip cloudibav.zip
cd cloudibav
```

### Passo 2: Instalar Dependências

```bash
# Instalar todas as dependências do projeto
npm install

# Aguardar conclusão (pode levar 2-5 minutos)
```

**O que será instalado:**

```
Dependências principais:
├── react@18.3.1              # Framework UI
├── react-router-dom@6.x      # Roteamento
├── @tanstack/react-query@5.x # State management
├── @supabase/supabase-js@2.x # Cliente OnSpace Cloud
├── recharts@2.x              # Gráficos
├── lucide-react@0.x          # Ícones
├── tailwindcss@3.4.11        # CSS Framework
├── zod@3.x                   # Validação
└── date-fns@3.x              # Manipulação de datas
```

### Passo 3: Configurar Variáveis de Ambiente

**No OnSpace (Automático):**

O arquivo `.env` é gerado automaticamente com:

```env
VITE_SUPABASE_URL=https://qorbbmeyplkzpfocqorb.backend.onspace.ai
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Não é necessário modificar manualmente!**

**Fora do OnSpace (Manual):**

Crie arquivo `.env` na raiz do projeto:

```env
# OnSpace Cloud Configuration
VITE_SUPABASE_URL=<SEU_BACKEND_URL>
VITE_SUPABASE_ANON_KEY=<SUA_ANON_KEY>
```

### Passo 4: Executar em Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

**Saída esperada:**

```
  VITE v5.4.1  ready in 823 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Passo 5: Acessar Aplicação

Abra o navegador e acesse:

```
http://localhost:5173
```

**Tela de Login:**

```
┌─────────────────────────────────────┐
│          🌥️ CloudIBAV               │
│  Plataforma de Gestão Documental   │
│                                     │
│  ┌───────────────────────────┐     │
│  │ E-mail                    │     │
│  │ [seu@email.com ou admin  ]│     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │ Senha                     │     │
│  │ [••••••••            ]    │     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │      ENTRAR  →            │     │
│  └───────────────────────────┘     │
│                                     │
│  MODO DE TESTE                      │
│  Use admin / admin para entrar     │
└─────────────────────────────────────┘
```

**Credenciais de Teste:**
- Usuário: `admin`
- Senha: `admin`

## 🗄️ Configuração do Banco de Dados

O banco de dados já está configurado no OnSpace Cloud com:

### Tabelas Criadas (23 no total)

```
📊 Principais Tabelas:

user_profiles        # Perfis de usuários
├── folders          # Estrutura de pastas
│   └── files        # Arquivos armazenados
│       ├── file_versions        # Histórico de versões
│       ├── file_comments        # Comentários
│       └── file_tags            # Tags de organização
├── folder_shares    # Compartilhamentos
├── shared_links     # Links públicos
├── favorites        # Favoritos do usuário
├── activities       # Log de atividades
├── notifications    # Notificações
├── audit_logs       # Auditoria completa
├── backups          # Histórico de backups
├── backup_schedules # Agendamento de backups
├── document_reminders  # Lembretes
├── invoice_data     # Dados de NF processadas
├── predictions      # Previsões ML
├── alert_rules      # Regras de alerta
├── alert_notifications  # Notificações de alertas
├── workflows        # Templates de workflow
├── workflow_steps   # Etapas dos workflows
├── workflow_instances   # Instâncias ativas
├── workflow_approvals   # Aprovações
├── public_folder_links  # Links públicos de pastas
└── user_quotas      # Quotas de armazenamento
```

### Verificar Status do Banco

1. Acesse OnSpace Dashboard
2. Clique em "Cloud" (painel direito)
3. Vá para aba "Data"
4. Verifique se todas as 23 tabelas estão listadas

## 🪣 Configuração de Storage

**Bucket Criado:**

```
pontocloud-files/
├── <user_id>/
│   ├── documents/
│   ├── images/
│   ├── videos/
│   └── backups/
```

**Políticas RLS Configuradas:**

```sql
✅ authenticated_upload_own_files    # Usuários podem fazer upload
✅ authenticated_select_own_files    # Usuários podem ver seus arquivos
✅ authenticated_delete_own_files    # Usuários podem deletar seus arquivos
```

### Testar Upload

1. Faça login na aplicação
2. Vá para página "Arquivos"
3. Clique em "Upload"
4. Selecione um arquivo
5. Aguarde conclusão

## ⚙️ Edge Functions

### Funções Disponíveis

#### 1. process-invoice

**Localização:** `supabase/functions/process-invoice/index.ts`

**Propósito:** Processar notas fiscais com OnSpace AI

**Tecnologias:**
- Deno runtime
- OnSpace AI (GPT-5.x / Gemini)
- Supabase SDK

**Testar função:**

```bash
# Via interface da aplicação
1. Faça login
2. Vá para "Arquivos"
3. Visualize um PDF de nota fiscal
4. Clique em "Processar Nota Fiscal com IA"
5. Aguarde extração automática
```

#### 2. generate-predictions

**Localização:** `supabase/functions/generate-predictions/index.ts`

**Propósito:** Gerar previsões financeiras com ML

**Algoritmos:**
- Linear regression para tendências
- Média móvel para previsões
- Detecção de anomalias (Z-score)
- Análise de fornecedores

**Testar função:**

```bash
# Via interface da aplicação
1. Faça login
2. Vá para "Financeiro"
3. Clique na aba "Análise Preditiva"
4. Clique em "Gerar Previsões"
5. Aguarde processamento
```

## 🔐 Configuração de Autenticação

### Métodos Habilitados

✅ **Email + OTP + Password** (Padrão)
- OTP de 4 dígitos
- Expiração: 1 hora
- Senha mínima: 6 caracteres

❌ **Google OAuth** (Desabilitado por padrão)

### Configurar Email Provider (Opcional)

Se desejar emails reais de OTP:

1. Acesse OnSpace Dashboard
2. Cloud → Users → Auth Settings
3. Configure SMTP:
   - Host: smtp.gmail.com (exemplo)
   - Porta: 587
   - Usuário: seu-email@gmail.com
   - Senha: senha-app-específica

### Modo de Teste (Atual)

```javascript
// Bypass de autenticação para testes
if (email === 'admin' && password === 'admin') {
  // Login direto sem OTP
  login({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@cloudibav.com',
    username: 'Administrador',
    role: 'admin',
  });
}
```

## 🎨 Personalização de Temas

### Temas Disponíveis

Altere em: `src/contexts/ThemeContext.tsx`

```typescript
const themes = {
  light: { /* Tema claro */ },
  dark: { /* Tema escuro */ },
  ocean: { /* Azul oceano */ },
  forest: { /* Verde natureza */ },
  sunset: { /* Laranja/vermelho */ },
};
```

### Adicionar Novo Tema

```typescript
// Adicionar em ThemeContext.tsx
const themes = {
  // ... temas existentes
  custom: {
    primary: 'bg-purple-600',
    secondary: 'bg-purple-100',
    accent: 'bg-pink-500',
    background: 'bg-white',
    foreground: 'text-gray-900',
    // ... outras cores
  },
};
```

## 🧪 Testar Instalação

### Checklist Completo

```bash
# ✅ 1. Dependências instaladas
npm list --depth=0

# ✅ 2. Servidor rodando
# Acesse http://localhost:5173

# ✅ 3. Login funcionando
# Use admin/admin

# ✅ 4. Backend conectado
# Dashboard deve carregar sem erros

# ✅ 5. Storage funcionando
# Faça upload de um arquivo

# ✅ 6. Edge Functions ativas
# Processe uma nota fiscal
```

### Verificar Logs

**Frontend (Navegador):**

```javascript
// Abra DevTools (F12)
// Console deve mostrar:
console.log('Backend URL:', import.meta.env.VITE_SUPABASE_URL);
// Sem erros de CORS ou 401
```

**Backend (OnSpace Dashboard):**

```
1. Cloud → Log
2. Selecione tipo: "postgres" ou "edge_function"
3. Verifique erros recentes
```

## 🐛 Troubleshooting

### Problema: npm install falha

**Solução:**

```bash
# Limpar cache
npm cache clean --force

# Deletar node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### Problema: Erro CORS

**Sintoma:**
```
Access to fetch at 'https://...backend.onspace.ai' has been blocked by CORS
```

**Solução:**
- Verificar se `VITE_SUPABASE_URL` está correto no `.env`
- Confirmar que backend está ativo no OnSpace

### Problema: Login não funciona

**Sintoma:**
```
Invalid credentials / Network error
```

**Solução:**

```bash
# 1. Verificar se modo teste está ativo
# src/pages/Login.tsx deve ter:
if (email === 'admin' && password === 'admin') { ... }

# 2. Verificar se tabela user_profiles existe
# OnSpace Dashboard → Cloud → Data → user_profiles

# 3. Verificar logs do backend
# OnSpace Dashboard → Cloud → Log → Auth
```

### Problema: Upload falha

**Sintoma:**
```
Error uploading file / Quota exceeded
```

**Solução:**

```bash
# 1. Verificar quota do usuário
# OnSpace Dashboard → Cloud → Data → user_quotas

# 2. Aumentar limite (se necessário)
UPDATE user_quotas 
SET quota_limit = 10737418240  -- 10GB
WHERE user_id = '<USER_ID>';

# 3. Verificar políticas RLS do bucket
# OnSpace Dashboard → Cloud → Storage → pontocloud-files
```

### Problema: Página em branco

**Sintoma:**
- Tela branca após login
- Console mostra erro de JavaScript

**Solução:**

```bash
# 1. Verificar erro no Console (F12)

# 2. Limpar build
rm -rf dist

# 3. Rebuild
npm run build

# 4. Restart dev server
npm run dev
```

## 📊 Monitoramento

### Métricas Importantes

```bash
# 1. Performance do Frontend
# Chrome DevTools → Lighthouse
# Target: Performance > 90

# 2. Tamanho do Bundle
npm run build
# dist/ deve ter < 2MB

# 3. Queries do Banco
# OnSpace Dashboard → Cloud → Log → Postgres
# Verificar queries lentas (> 1s)

# 4. Edge Functions
# OnSpace Dashboard → Cloud → Log → Edge Functions
# Verificar erros e latência
```

### Health Check

Acesse endpoints de saúde:

```bash
# Backend status
curl https://<seu-projeto>.backend.onspace.ai/rest/v1/

# Storage status
curl https://<seu-projeto>.backend.onspace.ai/storage/v1/bucket/pontocloud-files
```

## 🎓 Próximos Passos

Após instalação bem-sucedida:

1. 📖 Leia o [Manual do Usuário](USER_GUIDE.md)
2. 🚀 Consulte o [Guia de Deploy](DEPLOYMENT.md)
3. ✨ Explore as [Funcionalidades](FEATURES.md)
4. 🔌 Entenda a [API Reference](API.md)
5. 🗄️ Estude o [Database Schema](DATABASE.md)

---

## 💡 Dicas de Desenvolvimento

### VSCode Extensions Recomendadas

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Scripts Úteis

```json
{
  "scripts": {
    "dev": "vite",                    // Desenvolvimento
    "build": "tsc && vite build",     // Build produção
    "preview": "vite preview",        // Preview build
    "lint": "eslint src --ext ts,tsx" // Lint código
  }
}
```

---

**✅ Instalação concluída com sucesso!**

Você agora tem o CloudIBAV rodando localmente. Continue para o [Guia de Deploy](DEPLOYMENT.md) para colocar em produção.
