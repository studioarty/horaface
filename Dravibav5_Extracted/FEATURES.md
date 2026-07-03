# ✨ Documentação de Funcionalidades - CloudIBAV

Guia completo de todas as funcionalidades do CloudIBAV.

## 📑 Índice

1. [Autenticação](#-autenticação)
2. [Dashboard](#-dashboard)
3. [Gestão de Arquivos](#-gestão-de-arquivos)
4. [Organização](#-organização)
5. [Compartilhamento](#-compartilhamento)
6. [Análise Financeira](#-análise-financeira)
7. [Workflows](#-workflows)
8. [Configurações](#️-configurações)

---

## 🔐 Autenticação

### Login

**Localização:** Página inicial (`/login`)

**Funcionalidade:**
- Login com email + OTP + senha
- Modo de teste com credenciais `admin/admin`
- Validação de dados com Zod
- Autenticação via OnSpace Cloud Auth

**Fluxo:**

```
┌──────────────┐
│ Usuário      │
│ insere       │
│ email/senha  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌──────────────┐
│ Validação    │──X──►│ Erro exibido │
│ frontend     │      │ via toast    │
└──────┬───────┘      └──────────────┘
       │ ✓
       ▼
┌──────────────┐      ┌──────────────┐
│ OnSpace      │──X──►│ Credenciais  │
│ Cloud Auth   │      │ inválidas    │
└──────┬───────┘      └──────────────┘
       │ ✓
       ▼
┌──────────────┐
│ Busca perfil │
│ user_profiles│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Login bem    │
│ sucedido     │
│ Redirect /   │
└──────────────┘
```

**Código:**

```typescript
// src/pages/Login.tsx
const handleLogin = async (e: React.FormEvent) => {
  setLoading(true);
  
  // Modo teste
  if (email === 'admin' && password === 'admin') {
    login({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@cloudibav.com',
      username: 'Administrador',
      role: 'admin',
    });
    navigate('/');
    return;
  }
  
  // Autenticação real
  const user = await authService.signInWithPassword(email, password);
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  login({
    id: user.id,
    email: user.email!,
    username: profile?.username || user.email!.split('@')[0],
    role: profile?.role || 'user',
  });
  
  navigate('/');
};
```

### Cadastro (Sign Up)

**Localização:** `/signup`

**Funcionalidade:**
- Envio de OTP via email
- Verificação do código OTP
- Definição de senha
- Criação automática de perfil e quota

**Fluxo:**

```
1. Usuário informa email
   ↓
2. Sistema envia OTP (código de 4 dígitos)
   ↓
3. Usuário informa OTP + senha desejada
   ↓
4. Sistema verifica OTP
   ↓
5. Cria user_profiles e user_quotas
   ↓
6. Login automático
```

---

## 📊 Dashboard

**Localização:** `/` (página principal após login)

**Visão Geral:**

Dashboard executivo 3D com métricas em tempo real, gráficos interativos e lembretes de documentos.

### KPI Cards

4 cards com métricas principais:

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│  💾 Arquivos   │  📁 Pastas     │  👥 Usuários   │  ⚡ Atividade  │
│                │                │                │                │
│     234        │      45        │      12        │     156        │
│   arquivos     │    pastas      │   usuários     │  hoje          │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

**Implementação:**

```typescript
// src/pages/Dashboard.tsx
const { data: filesCount } = useQuery({
  queryKey: ['files-count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id);
    return count || 0;
  },
});
```

### Gráficos

**1. Atividades Recentes (Timeline)**

```
Linha temporal de ações:
Upload → Compartilhar → Download → Comentar
```

**2. Distribuição de Arquivos (Pie Chart)**

```
PDF: 45% 
Imagens: 30%
Vídeos: 15%
Outros: 10%
```

**3. Uso de Storage (Progress Bar)**

```
[████████████░░░░░░░░] 60% de 5GB usado
```

### Lembretes Próximos

Exibe documentos com vencimento em até 7 dias:

```
⚠️ Contrato ABC - Vence em 3 dias
📋 NF 12345 - Vence em 5 dias
```

**Código:**

```typescript
const { data: upcomingReminders } = useQuery({
  queryKey: ['upcoming-reminders'],
  queryFn: async () => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data } = await supabase
      .from('document_reminders')
      .select('*, file:files(name)')
      .eq('user_id', user!.id)
      .eq('notified', false)
      .lte('reminder_date', sevenDaysFromNow.toISOString())
      .order('reminder_date', { ascending: true });
    
    return data || [];
  },
});
```

---

## 📁 Gestão de Arquivos

### Upload de Arquivos

**Localização:** Botão "Upload" na página Files

**Funcionalidades:**
- Upload único ou em lote
- Drag & drop
- Barra de progresso individual
- Verificação de quota
- Geração automática de thumbnail (imagens)

**Tipos Suportados:**

| Categoria | Extensões |
|-----------|-----------|
| Documentos | PDF, DOC, DOCX, TXT, XLS, XLSX |
| Imagens | JPG, JPEG, PNG, GIF, SVG, WEBP |
| Vídeos | MP4, WEBM, OGG, MOV |
| Outros | ZIP, RAR, CSV, JSON |

**Fluxo de Upload:**

```
1. Usuário seleciona arquivo(s)
   ↓
2. Verifica quota disponível
   ↓
3. Upload para Storage Bucket (OnSpace Cloud)
   ↓
4. Cria registro em tabela 'files'
   ↓
5. Atualiza quota do usuário
   ↓
6. Gera thumbnail (se imagem)
   ↓
7. Cria log em 'activities'
```

**Código:**

```typescript
// src/hooks/useFiles.ts
const uploadMutation = useMutation({
  mutationFn: async ({ file, folderId }: { file: File; folderId?: string }) => {
    // 1. Verificar quota
    const { data: quota } = await supabase
      .from('user_quotas')
      .select('quota_limit, quota_used')
      .eq('user_id', user!.id)
      .single();
    
    if (quota && quota.quota_used + file.size > quota.quota_limit) {
      throw new Error('Quota excedida');
    }
    
    // 2. Upload para storage
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('pontocloud-files')
      .upload(path, file);
    
    if (uploadError) throw uploadError;
    
    // 3. Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('pontocloud-files')
      .getPublicUrl(path);
    
    // 4. Criar registro no banco
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        name: file.name,
        type: file.type,
        size: file.size,
        folder_id: folderId,
        user_id: user!.id,
        storage_path: path,
        url: publicUrl,
      });
    
    if (dbError) throw dbError;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
    toast.success('Upload concluído!');
  },
});
```

### Visualização de Arquivos

**Componente:** `FileViewer.tsx`

**Recursos:**
- Preview integrado sem download
- Zoom para imagens
- Player de vídeo nativo
- Visualizador de PDF
- Syntax highlighting para código
- Download direto

**Interface:**

```
┌───────────────────────────────────────────────────┐
│  ← Voltar    documento.pdf         ⋮ Opções       │
├───────────────────────────────────────────────────┤
│                                                   │
│              [PDF VIEWER]                         │
│                                                   │
│              Página 1 de 10                       │
│                                                   │
├───────────────────────────────────────────────────┤
│  💬 Comentários (3)    🏷️ Tags    📊 Versões     │
└───────────────────────────────────────────────────┘
```

**Código:**

```typescript
// src/components/features/FileViewer.tsx
const renderContent = () => {
  const fileType = file.type.toLowerCase();
  
  // Imagens
  if (fileType.startsWith('image/')) {
    return (
      <div className="relative">
        <img 
          src={file.url} 
          alt={file.name}
          className="max-w-full h-auto cursor-zoom-in"
          onClick={() => setZoom(!zoom)}
        />
      </div>
    );
  }
  
  // Vídeos
  if (fileType.startsWith('video/')) {
    return (
      <video controls className="w-full">
        <source src={file.url} type={file.type} />
      </video>
    );
  }
  
  // PDFs
  if (fileType === 'application/pdf') {
    return (
      <iframe 
        src={file.url} 
        className="w-full h-screen"
        title={file.name}
      />
    );
  }
  
  // Outros - oferecer download
  return (
    <div className="text-center p-8">
      <FileIcon className="w-24 h-24 mx-auto mb-4" />
      <p className="mb-4">Prévia não disponível</p>
      <Button onClick={() => window.open(file.url)}>
        <Download className="w-4 h-4 mr-2" />
        Baixar Arquivo
      </Button>
    </div>
  );
};
```

### Renomear Arquivo

**Localização:** Menu de contexto do arquivo (⋮)

**Funcionalidade:**
- Edição inline do nome
- Validação de caracteres especiais
- Atualização em tempo real

**Código:**

```typescript
const renameMutation = useMutation({
  mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
    const { error } = await supabase
      .from('files')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
    toast.success('Arquivo renomeado!');
  },
});
```

### Deletar Arquivo

**Funcionalidade:**
- Confirmação antes de deletar
- Remove arquivo do storage
- Remove registro do banco
- Atualiza quota automaticamente (via trigger)

**Código:**

```typescript
const deleteMutation = useMutation({
  mutationFn: async (fileId: string) => {
    // 1. Buscar path do storage
    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single();
    
    if (!file) throw new Error('Arquivo não encontrado');
    
    // 2. Deletar do storage
    const { error: storageError } = await supabase.storage
      .from('pontocloud-files')
      .remove([file.storage_path]);
    
    if (storageError) throw storageError;
    
    // 3. Deletar do banco (trigger atualiza quota)
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
    
    if (dbError) throw dbError;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
    toast.success('Arquivo deletado!');
  },
});
```

---

## 🗂️ Organização

### Pastas Hierárquicas

**Funcionalidade:**
- Criar pastas e subpastas (ilimitadas)
- Arrastar e soltar para mover arquivos
- Breadcrumb de navegação
- Renomear e deletar pastas

**Estrutura:**

```
📁 Raiz
├── 📁 Documentos
│   ├── 📁 Contratos
│   │   ├── 📄 Contrato_2024.pdf
│   │   └── 📄 Aditivo_01.pdf
│   └── 📁 Notas Fiscais
│       ├── 📄 NF_001.pdf
│       └── 📄 NF_002.pdf
├── 📁 Imagens
│   └── 🖼️ logo.png
└── 📁 Backups
    └── 🗜️ backup_20260326.zip
```

**Código:**

```typescript
// src/hooks/useFolders.ts
const createFolderMutation = useMutation({
  mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
    const { error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        user_id: user!.id,
      });
    
    if (error) throw error;
  },
});
```

### Tags

**Funcionalidade:**
- Adicionar múltiplas tags por arquivo
- Tags com cores customizáveis
- Filtrar arquivos por tag
- Autocomplete de tags existentes

**Interface:**

```
Tags do arquivo:
[urgente 🔴] [fiscal 🟢] [2024 🔵] [+ Adicionar]
```

**Código:**

```typescript
// src/hooks/useTags.ts
const addTagMutation = useMutation({
  mutationFn: async ({ fileId, tagName, tagColor }) => {
    const { error } = await supabase
      .from('file_tags')
      .insert({
        file_id: fileId,
        tag_name: tagName,
        tag_color: tagColor,
        user_id: user!.id,
      });
    
    if (error) throw error;
  },
});
```

### Favoritos

**Funcionalidade:**
- Marcar arquivos como favoritos
- Acesso rápido via sidebar
- Ordenação por data de adição

**Código:**

```typescript
const toggleFavoriteMutation = useMutation({
  mutationFn: async (fileId: string) => {
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('file_id', fileId)
      .eq('user_id', user!.id)
      .single();
    
    if (existing) {
      // Remover
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      // Adicionar
      await supabase.from('favorites').insert({
        file_id: fileId,
        user_id: user!.id,
      });
    }
  },
});
```

### Busca Avançada

**Funcionalidade:**
- Busca por nome do arquivo
- Filtro por tipo (PDF, imagem, vídeo)
- Filtro por data (hoje, semana, mês)
- Filtro por pasta
- Filtro por tag
- Ordenação customizável

**Interface:**

```
┌────────────────────────────────────────────────┐
│  🔍 Buscar arquivos...                         │
└────────────────────────────────────────────────┘

Filtros:
[Todos os tipos ▼] [Data ▼] [Pasta ▼] [Tags ▼]

Resultados (15):
📄 Contrato_2024.pdf - 2 dias atrás
📄 NF_001.pdf - 5 dias atrás
🖼️ logo.png - 1 semana atrás
```

**Código:**

```typescript
const searchFiles = async (query: string, filters: Filters) => {
  let queryBuilder = supabase
    .from('files')
    .select('*')
    .eq('user_id', user!.id)
    .ilike('name', `%${query}%`);
  
  // Filtro de tipo
  if (filters.type) {
    queryBuilder = queryBuilder.like('type', `${filters.type}%`);
  }
  
  // Filtro de data
  if (filters.dateRange) {
    const startDate = getStartDate(filters.dateRange);
    queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
  }
  
  // Filtro de pasta
  if (filters.folderId) {
    queryBuilder = queryBuilder.eq('folder_id', filters.folderId);
  }
  
  const { data } = await queryBuilder;
  return data;
};
```

### Versionamento

**Funcionalidade:**
- Histórico automático de alterações
- Restaurar versão anterior
- Comparação entre versões
- Download de versão específica

**Fluxo:**

```
Arquivo original (v1) → Upload nova versão → Sistema cria v2
                                               ├─ Mantém v1
                                               └─ v2 vira atual

Usuário pode:
- Ver todas versões
- Restaurar v1 (cria v3 idêntica a v1)
- Baixar qualquer versão
```

**Código:**

```typescript
// Trigger automático ao atualizar arquivo
create trigger on_file_updated_version
  after update of storage_path on public.files
  for each row 
  when (old.storage_path is distinct from new.storage_path)
  execute function create_file_version();

// Função que cria versão
create or replace function create_file_version()
returns trigger as $$
declare
  max_version integer;
begin
  select coalesce(max(version_number), 0) into max_version
  from file_versions where file_id = new.id;
  
  insert into file_versions (
    file_id, version_number, storage_path, 
    url, size, user_id
  ) values (
    new.id, max_version + 1, new.storage_path,
    new.url, new.size, new.user_id
  );
  
  return new;
end;
$$ language plpgsql;
```

---

## 🤝 Compartilhamento

### Compartilhamento de Pastas

**Funcionalidade:**
- Compartilhar pastas inteiras com outros usuários
- 3 níveis de permissão: Read, Write, Admin
- Notificação automática ao destinatário
- Dashboard de compartilhamentos

**Níveis de Permissão:**

| Nível | Visualizar | Upload | Editar | Deletar | Compartilhar |
|-------|-----------|--------|--------|---------|--------------|
| Read | ✅ | ❌ | ❌ | ❌ | ❌ |
| Write | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

**Interface:**

```
Compartilhar pasta "Documentos"

┌──────────────────────────────────────────────┐
│ 👤 Usuário:                                  │
│ [joao@empresa.com ▼]                         │
│                                              │
│ 🔐 Permissão:                                │
│ ( ) Read   (•) Write   ( ) Admin            │
│                                              │
│ [Compartilhar]                               │
└──────────────────────────────────────────────┘

Compartilhado com:
• Maria Silva (Write) - há 2 dias [✕]
• Pedro Santos (Read) - há 1 semana [✕]
```

**Código:**

```typescript
// src/hooks/useFolderShares.ts
const shareFolderMutation = useMutation({
  mutationFn: async ({ folderId, targetUserId, permission }) => {
    // 1. Criar compartilhamento
    const { error } = await supabase
      .from('folder_shares')
      .insert({
        folder_id: folderId,
        owner_id: user!.id,
        shared_with_user_id: targetUserId,
        permission,
      });
    
    if (error) throw error;
    
    // 2. Trigger cria notificação automaticamente
  },
  onSuccess: () => {
    toast.success('Pasta compartilhada!');
  },
});
```

**RLS Policy:**

```sql
-- Usuários veem arquivos de pastas compartilhadas com eles
create policy "authenticated_select_shared_files"
  on public.files for select to authenticated
  using (
    folder_id in (
      select folder_id from folder_shares
      where shared_with_user_id = auth.uid()
    )
  );
```

### Links Públicos

**Funcionalidade:**
- Gerar link público para pasta
- Proteção com senha (opcional)
- Data de expiração
- Limite de downloads
- Estatísticas de acesso

**Interface:**

```
Link Público da Pasta "Relatórios"

🔗 https://cloudibav.com/public/abc123xyz

Configurações:
┌──────────────────────────────────────┐
│ 🔒 Senha: [••••••••]      (opcional) │
│ 📅 Expira em: [7 dias ▼]            │
│ 📊 Downloads: [Ilimitado ▼]         │
│                                      │
│ [Copiar Link] [Gerar Novo] [Revogar]│
└──────────────────────────────────────┘

Acessos: 15 | Último: há 2 horas
```

**Código:**

```typescript
const createPublicLinkMutation = useMutation({
  mutationFn: async ({ folderId, password, expiresInDays, maxDownloads }) => {
    const token = generateRandomToken(); // UUID ou hash
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const { error } = await supabase
      .from('public_folder_links')
      .insert({
        folder_id: folderId,
        user_id: user!.id,
        token,
        password_hash: password ? await hashPassword(password) : null,
        expires_at: expiresAt.toISOString(),
        max_downloads: maxDownloads,
      });
    
    if (error) throw error;
    return { token };
  },
});
```

### Comentários em Arquivos

**Funcionalidade:**
- Adicionar comentários em arquivos
- Threads de discussão (respostas)
- Menções (@usuario)
- Notificações de respostas
- Editar/deletar próprios comentários

**Interface:**

```
💬 Comentários (3)

┌──────────────────────────────────────────────┐
│ Maria Silva                        há 2h      │
│ Este contrato precisa ser revisado por       │
│ @joao.silva antes da assinatura.             │
│                                              │
│   └─ João Silva                   há 1h      │
│      Ok, vou revisar hoje mesmo!            │
│                                              │
│ Pedro Santos                       ontem     │
│ Valores estão corretos ✓                    │
└──────────────────────────────────────────────┘

[Adicionar comentário...]
[@mencionar] [😊 emoji]
```

**Código:**

```typescript
const addCommentMutation = useMutation({
  mutationFn: async ({ fileId, content, parentId, mentions }) => {
    const { error } = await supabase
      .from('file_comments')
      .insert({
        file_id: fileId,
        user_id: user!.id,
        parent_id: parentId,
        content,
        mentions: mentions ? JSON.stringify(mentions) : null,
      });
    
    if (error) throw error;
    
    // Criar notificações para mencionados
    if (mentions) {
      for (const userId of mentions) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'comment_added',
          title: 'Você foi mencionado',
          message: `${user!.username} mencionou você em um comentário`,
          metadata: JSON.stringify({ file_id: fileId }),
        });
      }
    }
  },
});
```

---

## 💰 Análise Financeira

### Processamento de Notas Fiscais com IA

**Funcionalidade:**
- Upload de NF em qualquer formato (PDF, imagem, XML)
- Extração automática com OnSpace AI (GPT-5.x / Gemini)
- Dados extraídos: número NF, fornecedor, CNPJ, valores, impostos, itens
- Revisão e correção manual
- Armazenamento estruturado

**Fluxo:**

```
1. Upload de NF-e (PDF/XML/imagem)
   ↓
2. Clique em "Processar com IA"
   ↓
3. Edge Function `process-invoice` invocada
   ↓
4. OnSpace AI processa documento
   ↓
5. Dados extraídos salvos em `invoice_data`
   ↓
6. Usuário revisa e pode corrigir
   ↓
7. Status: completed
```

**Dados Extraídos:**

```typescript
interface InvoiceData {
  invoice_number: string;     // "NF-001234"
  issue_date: Date;           // Data de emissão
  due_date: Date;             // Data de vencimento
  supplier_name: string;      // "Fornecedor ABC Ltda"
  supplier_cnpj: string;      // "12.345.678/0001-90"
  total_amount: number;       // Valor bruto
  tax_amount: number;         // Total de impostos
  net_amount: number;         // Valor líquido
  currency: string;           // "BRL"
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}
```

**Edge Function:**

```typescript
// supabase/functions/process-invoice/index.ts
Deno.serve(async (req) => {
  const { fileUrl } = await req.json();
  
  // 1. Invocar OnSpace AI
  const response = await fetch(`${ONSPACE_AI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-turbo',
      messages: [{
        role: 'user',
        content: `Extraia dados estruturados desta nota fiscal: ${fileUrl}`
      }],
    }),
  });
  
  const aiResult = await response.json();
  const extractedData = JSON.parse(aiResult.choices[0].message.content);
  
  // 2. Salvar em invoice_data
  await supabase.from('invoice_data').insert({
    file_id: fileId,
    user_id: userId,
    ...extractedData,
    extraction_status: 'completed',
  });
  
  return new Response(JSON.stringify(extractedData), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Dashboard Financeiro

**Localização:** `/financial`

**Componentes:**

#### 1. KPI Cards

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Gasto Total │   Impostos  │    NFes     │  Próximos   │
│ R$ 150.000  │ R$ 35.000   │     45      │     12      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 2. Gráfico de Evolução Mensal

```
LineChart mostrando:
- Linha azul: Total gasto por mês
- Linha vermelha: Impostos por mês
- Últimos 12 meses
```

#### 3. Distribuição por Fornecedor

```
PieChart mostrando:
- Fornecedor A: 35%
- Fornecedor B: 25%
- Fornecedor C: 20%
- Outros: 20%
```

#### 4. Análise de Impostos

```
BarChart comparando:
- Valor bruto
- Impostos
- Valor líquido
Por mês
```

#### 5. Próximos Vencimentos

```
Lista ordenada por data:

⚠️ URGENTE (< 7 dias)
• Fornecedor X - R$ 5.000 - Vence em 3 dias

⚡ ATENÇÃO (7-15 dias)
• Fornecedor Y - R$ 3.000 - Vence em 10 dias

✅ OK (> 15 dias)
• Fornecedor Z - R$ 2.000 - Vence em 20 dias
```

#### 6. Top Fornecedores

```
Ranking dos 5 principais:

1. 🥇 Fornecedor ABC - R$ 50.000 (33%)
2. 🥈 Fornecedor XYZ - R$ 30.000 (20%)
3. 🥉 Fornecedor 123 - R$ 25.000 (17%)
4.     Fornecedor DEF - R$ 20.000 (13%)
5.     Fornecedor GHI - R$ 15.000 (10%)
```

### Exportação Contábil

**Funcionalidade:**
- Exportar dados para sistemas contábeis
- 3 formatos suportados: Conta Azul (XML), Omie (JSON), Totvs (TXT)
- Filtros de período e fornecedor

**Exemplo Conta Azul (XML):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<notas_fiscais>
  <nota_fiscal>
    <numero>NF-001234</numero>
    <data_emissao>2024-03-20</data_emissao>
    <data_vencimento>2024-04-20</data_vencimento>
    <fornecedor>
      <nome>Fornecedor ABC Ltda</nome>
      <cnpj>12.345.678/0001-90</cnpj>
    </fornecedor>
    <valores>
      <total>10000.00</total>
      <impostos>2300.00</impostos>
      <liquido>7700.00</liquido>
    </valores>
  </nota_fiscal>
</notas_fiscais>
```

### Análise Preditiva com ML

**Funcionalidade:**
- Previsão de gastos mensais (Linear Regression)
- Forecast de impostos
- Detecção de anomalias (Z-score)
- Análise de tendências de fornecedores
- Recomendações inteligentes

**Algoritmos:**

```typescript
// 1. Previsão de gastos (Tendência linear)
const calculateTrend = (values: number[]) => {
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope / (sumY / n); // Retorna % de crescimento
};

// 2. Detecção de anomalias
const detectAnomalies = (amounts: number[]) => {
  const mean = amounts.reduce((a, b) => a + b) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length
  );
  
  return amounts.filter(amount => 
    Math.abs(amount - mean) > stdDev * 2
  );
};
```

**Output de Previsões:**

```
📊 Análise Preditiva - Abril/2024

Gasto Mensal Previsto: R$ 48.500
├─ Baseado em média dos últimos 3 meses
├─ Tendência: +12% (crescimento)
└─ Confiança: 85%

Taxa de Impostos Prevista: 23.5%
├─ Média histórica: 23.2%
└─ Confiança: 90%

Principais Fornecedores:
1. Fornecedor ABC - R$ 18.000 (37%)
   ⚠️ Alta concentração. Considere diversificar.

Anomalias Detectadas: 2
• NF-00456 - R$ 85.000 (4x acima da média)
• NF-00789 - R$ 95.000 (4.5x acima da média)
└─ Revisar transações atípicas
```

### Alertas Inteligentes

**Funcionalidade:**
- Criar regras de alerta personalizadas
- Notificações automáticas
- 5 tipos de alertas

**Tipos de Alertas:**

1. **Vencimento Próximo** - X dias antes do due_date
2. **Orçamento Excedido** - Gasto mensal > limite
3. **Fornecedor Duplicado** - Mesma NF recebida 2x
4. **Anomalia Detectada** - Valor fora do padrão
5. **Imposto Elevado** - Taxa > X%

**Interface de Configuração:**

```
Nova Regra de Alerta

Nome: Alertar 7 dias antes do vencimento
Tipo: [Vencimento próximo ▼]
Dias de antecedência: [7]
Canais: [✓] In-app  [ ] Email  [ ] SMS

[Criar Regra]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Regras Ativas:

• Vencimento 7 dias [🟢 Ativo] [✕]
• Orçamento > R$ 50k [🟢 Ativo] [✕]
• Impostos > 25% [🔴 Inativo] [✕]
```

**Código:**

```typescript
// Trigger automático baseado em regras
create or replace function check_alert_rules()
returns void as $$
declare
  rule record;
  invoice record;
begin
  for rule in select * from alert_rules where is_active = true loop
    if rule.rule_type = 'due_date' then
      -- Verificar vencimentos próximos
      for invoice in 
        select * from invoice_data 
        where due_date between now() and now() + (rule.conditions->>'days_before')::int * interval '1 day'
      loop
        insert into alert_notifications (
          user_id, rule_id, alert_type, title, message, severity
        ) values (
          rule.user_id,
          rule.id,
          'due_date',
          'Vencimento Próximo',
          format('NF %s vence em %s dias', invoice.invoice_number, ...),
          'high'
        );
      end loop;
    end if;
  end loop;
end;
$$ language plpgsql;
```

---

## ⚙️ Workflows

### Sistema de Aprovação

**Funcionalidade:**
- Criar templates de workflow multi-etapa
- Atribuir aprovadores (por role ou usuário específico)
- Rastreamento de status
- Notificações automáticas
- Histórico completo

**Exemplo de Workflow:**

```
Template: "Aprovação de Contrato"

Etapa 1: Revisão Jurídica
├─ Aprovador: Role = Manager
├─ Prazo: 3 dias
└─ Status: Pendente

Etapa 2: Aprovação Financeira  [aguardando etapa 1]
├─ Aprovador: João Silva (CFO)
├─ Prazo: 2 dias
└─ Status: Aguardando

Etapa 3: Aprovação Final  [aguardando etapa 2]
├─ Aprovador: Role = Admin
├─ Prazo: 1 dia
└─ Status: Aguardando
```

**Fluxo:**

```
1. Usuário sobe documento
   ↓
2. Inicia workflow
   ↓
3. Sistema cria workflow_instance
   ↓
4. Cria workflow_approval para cada etapa
   ↓
5. Notifica aprovador da Etapa 1
   ↓
6. Aprovador decide: Aprovar / Rejeitar
   ↓
   Aprovado → Passa para Etapa 2
   Rejeitado → Workflow cancelado
   ↓
7. Repeat até etapa final
   ↓
8. Status final: Approved
```

**Código:**

```typescript
// Criar template de workflow
const createWorkflowMutation = useMutation({
  mutationFn: async ({ name, steps }) => {
    // 1. Criar workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        name,
        description: 'Workflow de aprovação',
        created_by: user!.id,
      })
      .select()
      .single();
    
    if (workflowError) throw workflowError;
    
    // 2. Criar etapas
    for (let i = 0; i < steps.length; i++) {
      await supabase.from('workflow_steps').insert({
        workflow_id: workflow.id,
        step_order: i + 1,
        step_name: steps[i].name,
        approver_role: steps[i].role,
        approver_user_id: steps[i].userId,
      });
    }
  },
});

// Iniciar workflow para arquivo
const startWorkflowMutation = useMutation({
  mutationFn: async ({ fileId, workflowId }) => {
    const { error } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: workflowId,
        file_id: fileId,
        current_step: 1,
        status: 'pending',
        initiated_by: user!.id,
      });
    
    if (error) throw error;
  },
});

// Aprovar etapa
const approveMutation = useMutation({
  mutationFn: async ({ approvalId, comments }) => {
    // 1. Atualizar approval
    await supabase
      .from('workflow_approvals')
      .update({
        status: 'approved',
        comments,
        approved_at: new Date().toISOString(),
      })
      .eq('id', approvalId);
    
    // 2. Avançar workflow para próxima etapa
    // (ou finalizar se for última etapa)
  },
});
```

---

## ⚙️ Configurações

### Perfil do Usuário

**Localização:** `/settings`

**Campos Editáveis:**
- Nome de usuário
- Departamento
- Avatar (upload de imagem)
- Email (somente leitura)

### Temas

**5 Temas Disponíveis:**

1. **Light** 🌞 - Tema claro padrão
2. **Dark** 🌙 - Tema escuro
3. **Ocean** 🌊 - Azul oceano
4. **Forest** 🌲 - Verde natureza
5. **Sunset** 🌅 - Laranja/vermelho

**Alternância:**

```typescript
const { theme, setTheme } = useTheme();

<select value={theme} onChange={(e) => setTheme(e.target.value)}>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="ocean">Ocean</option>
  <option value="forest">Forest</option>
  <option value="sunset">Sunset</option>
</select>
```

### Quota de Armazenamento

**Exibição:**

```
Armazenamento

[████████████░░░░░░░░] 3.2GB / 5GB usado (64%)

Detalhes:
• Documentos: 1.8GB
• Imagens: 1.0GB
• Vídeos: 0.4GB
• Outros: 0.05GB
```

**Alterar Limite (Admin):**

```sql
UPDATE user_quotas 
SET quota_limit = 10737418240  -- 10GB
WHERE user_id = '<USER_ID>';
```

### Backups Automáticos

**Configuração:**

```
Agendamento de Backups

Frequência: [Semanal ▼]
Dia: [Domingo ▼]
Horário: [02:00 ▼]
Tipo: [Completo ▼]

[✓] Backup ativo

Último backup: 20/03/2024 02:00
Próximo backup: 27/03/2024 02:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Histórico de Backups (últimos 5):

✅ 20/03/2024 - 2.1GB - Completo
✅ 13/03/2024 - 1.9GB - Completo
✅ 06/03/2024 - 1.8GB - Completo
```

**Código:**

```typescript
const createScheduleMutation = useMutation({
  mutationFn: async ({ scheduleType, backupType, timeOfDay }) => {
    const { error } = await supabase
      .from('backup_schedules')
      .insert({
        user_id: user!.id,
        schedule_type: scheduleType,  // 'daily' | 'weekly' | 'monthly'
        backup_type: backupType,      // 'full' | 'incremental'
        time_of_day: timeOfDay,       // '02:00:00'
        is_active: true,
      });
    
    if (error) throw error;
  },
});
```

### Gerenciamento de Usuários (Admin)

**Funcionalidades:**
- Listar todos os usuários
- Alterar role (user/manager/admin)
- Alterar departamento
- Visualizar quota
- Deletar usuário

**Interface:**

```
Usuários (12)

┌──────────────────────────────────────────────────────────┐
│ Nome          Email              Role     Depto    Ações │
├──────────────────────────────────────────────────────────┤
│ João Silva    joao@ibav.com     Admin    TI       [✎][✕]│
│ Maria Santos  maria@ibav.com    Manager  Financ   [✎][✕]│
│ Pedro Lima    pedro@ibav.com    User     RH       [✎][✕]│
└──────────────────────────────────────────────────────────┘
```

**RLS Policy:**

```sql
-- Apenas admins podem ver todos os perfis
create policy "admin_select_all_profiles"
  on public.user_profiles for select to authenticated
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

---

## 📊 Auditoria

### Logs de Auditoria

**Funcionalidade:**
- Registro automático de todas as ações
- Filtros por usuário, ação, recurso, data
- Exportação de logs
- Somente Admin visualiza

**Ações Registradas:**

- ✅ Login/Logout
- ✅ Upload de arquivos
- ✅ Download de arquivos
- ✅ Compartilhamentos
- ✅ Alterações de permissão
- ✅ Criação/exclusão de pastas
- ✅ Processamento de NF
- ✅ Alterações de usuários (role, departamento)

**Estrutura do Log:**

```typescript
interface AuditLog {
  id: string;
  user_id: string;
  action: string;                    // "INSERT", "UPDATE", "DELETE"
  resource_type: string;             // "file", "folder", "share", "user"
  resource_id: string;
  details: {                         // JSON com detalhes da ação
    old_value?: any;
    new_value?: any;
    ip_address?: string;
    user_agent?: string;
  };
  created_at: Date;
}
```

**Interface:**

```
Logs de Auditoria

Filtros:
[Usuário ▼] [Ação ▼] [Recurso ▼] [Data ▼]

┌─────────────────────────────────────────────────────────────────┐
│ Data/Hora          Usuário      Ação    Recurso      Detalhes   │
├─────────────────────────────────────────────────────────────────┤
│ 26/03 14:23       João Silva   INSERT  file         upload.pdf │
│ 26/03 14:20       Maria Santos UPDATE  folder_share Write→Admin│
│ 26/03 14:15       Pedro Lima   DELETE  file         doc_old.pdf│
└─────────────────────────────────────────────────────────────────┘

[Exportar Logs]
```

**Trigger Automático:**

```sql
create trigger audit_folder_shares
  after insert or update or delete on public.folder_shares
  for each row execute function log_audit_trail();

create function log_audit_trail()
returns trigger as $$
begin
  insert into audit_logs (user_id, action, resource_type, resource_id, details)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    new.id,
    to_jsonb(new)
  );
  return new;
end;
$$ language plpgsql;
```

---

## 🔔 Notificações

### Central de Notificações

**Funcionalidade:**
- Sino no header com contador
- Lista de notificações não lidas
- Marcar como lida
- Tipos de notificação

**Tipos:**

1. **folder_shared** - Pasta compartilhada com você
2. **comment_added** - Novo comentário em arquivo seu
3. **file_shared** - Arquivo compartilhado com você
4. **reminder** - Lembrete de documento

**Interface:**

```
🔔 (3)  ← Contador de não lidas

┌────────────────────────────────────────────────┐
│ 🔵 Nova pasta compartilhada                    │
│    Maria compartilhou "Contratos" com você     │
│    há 2 horas                                  │
├────────────────────────────────────────────────┤
│ 🔵 Novo comentário                             │
│    João comentou em "Relatório.pdf"           │
│    há 5 horas                                  │
├────────────────────────────────────────────────┤
│ 🔵 Lembrete de documento                       │
│    Contrato XYZ vence em 3 dias               │
│    há 1 dia                                    │
├────────────────────────────────────────────────┤
│ • Você foi mencionado em um comentário        │
│    há 2 dias                                   │
└────────────────────────────────────────────────┘
```

**Código:**

```typescript
// Hook de notificações
const { data: notifications, unreadCount } = useNotifications();

// Componente sino
<button className="relative">
  <Bell className="w-6 h-6" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</button>
```

---

## 🎓 Resumo de Teclas de Atalho

| Atalho | Ação |
|--------|------|
| `Ctrl + K` | Abrir busca rápida |
| `Ctrl + U` | Upload de arquivo |
| `Ctrl + N` | Nova pasta |
| `Ctrl + /` | Abrir menu de ajuda |
| `Esc` | Fechar dialogs/modais |
| `F2` | Renomear arquivo selecionado |
| `Delete` | Deletar arquivo selecionado |

---

**✅ Documentação de Funcionalidades Completa!**

Para mais informações:
- [🔌 API Reference](API.md)
- [🗄️ Database Schema](DATABASE.md)
- [👤 Manual do Usuário](USER_GUIDE.md)
