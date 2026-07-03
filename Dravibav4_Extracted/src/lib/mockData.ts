import type { User, File, Folder, Activity } from '@/types';

// Mock current user
export const currentUser: User = {
  id: '1',
  name: 'João Silva',
  email: 'joao.silva@pontocloud.com',
  role: 'admin',
  quotaUsed: 15728640000, // 15 GB
  quotaLimit: 107374182400, // 100 GB
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock users
export const mockUsers: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@pontocloud.com',
    role: 'manager',
    department: 'Financeiro',
    quotaUsed: 5368709120, // 5 GB
    quotaLimit: 53687091200, // 50 GB
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@pontocloud.com',
    role: 'user',
    department: 'RH',
    quotaUsed: 2147483648, // 2 GB
    quotaLimit: 21474836480, // 20 GB
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana.costa@pontocloud.com',
    role: 'user',
    department: 'Marketing',
    quotaUsed: 8589934592, // 8 GB
    quotaLimit: 21474836480, // 20 GB
    createdAt: '2024-03-01T10:00:00Z',
  },
];

// Mock folders
export const mockFolders: Folder[] = [
  {
    id: '1',
    name: 'Documentos Fiscais',
    createdBy: 'João Silva',
    createdAt: '2024-01-20T10:00:00Z',
    fileCount: 45,
  },
  {
    id: '2',
    name: 'Contratos',
    createdBy: 'Maria Santos',
    createdAt: '2024-02-05T10:00:00Z',
    fileCount: 23,
  },
  {
    id: '3',
    name: 'Relatórios',
    createdBy: 'João Silva',
    createdAt: '2024-02-15T10:00:00Z',
    fileCount: 67,
  },
  {
    id: '4',
    name: 'Campanhas',
    createdBy: 'Ana Costa',
    createdAt: '2024-03-05T10:00:00Z',
    fileCount: 34,
  },
];

// Mock files
export const mockFiles: File[] = [
  {
    id: '1',
    name: 'Relatório_Anual_2024.pdf',
    type: 'application/pdf',
    size: 2457600, // 2.4 MB
    uploadedBy: 'João Silva',
    uploadedAt: '2024-03-20T14:30:00Z',
    folderId: '3',
    url: '#',
  },
  {
    id: '2',
    name: 'Contrato_Fornecedor_ABC.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 524288, // 512 KB
    uploadedBy: 'Maria Santos',
    uploadedAt: '2024-03-19T11:15:00Z',
    folderId: '2',
    url: '#',
  },
  {
    id: '3',
    name: 'NF_2024_001234.xml',
    type: 'application/xml',
    size: 45056, // 44 KB
    uploadedBy: 'João Silva',
    uploadedAt: '2024-03-18T09:45:00Z',
    folderId: '1',
    url: '#',
  },
  {
    id: '4',
    name: 'Apresentacao_Marketing.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 8388608, // 8 MB
    uploadedBy: 'Ana Costa',
    uploadedAt: '2024-03-17T16:20:00Z',
    folderId: '4',
    url: '#',
  },
  {
    id: '5',
    name: 'Planilha_Custos_Q1.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1048576, // 1 MB
    uploadedBy: 'Maria Santos',
    uploadedAt: '2024-03-16T10:00:00Z',
    folderId: '3',
    url: '#',
  },
];

// Mock activities
export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'upload',
    fileName: 'Relatório_Anual_2024.pdf',
    userName: 'João Silva',
    timestamp: '2024-03-20T14:30:00Z',
  },
  {
    id: '2',
    type: 'download',
    fileName: 'Contrato_Fornecedor_ABC.docx',
    userName: 'Pedro Oliveira',
    timestamp: '2024-03-20T13:15:00Z',
  },
  {
    id: '3',
    type: 'upload',
    fileName: 'NF_2024_001234.xml',
    userName: 'João Silva',
    timestamp: '2024-03-18T09:45:00Z',
  },
  {
    id: '4',
    type: 'share',
    fileName: 'Apresentacao_Marketing.pptx',
    userName: 'Ana Costa',
    timestamp: '2024-03-17T16:25:00Z',
  },
  {
    id: '5',
    type: 'delete',
    fileName: 'Arquivo_Temporario.tmp',
    userName: 'Maria Santos',
    timestamp: '2024-03-17T14:10:00Z',
  },
];

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const getFileIcon = (type: string): string => {
  if (type.includes('pdf')) return 'file-text';
  if (type.includes('word')) return 'file-text';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'file-spreadsheet';
  if (type.includes('presentation')) return 'presentation';
  if (type.includes('image')) return 'image';
  if (type.includes('video')) return 'video';
  if (type.includes('audio')) return 'music';
  if (type.includes('zip') || type.includes('compressed')) return 'file-archive';
  return 'file';
};

export const getRoleBadgeColor = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'manager':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'user':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'manager':
      return 'Gestor';
    case 'user':
      return 'Usuário';
    default:
      return 'Usuário';
  }
};
