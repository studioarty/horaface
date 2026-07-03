export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  quotaUsed: number; // bytes
  quotaLimit: number; // bytes
  avatar?: string;
  createdAt: string;
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  folderId?: string;
  url: string;
  thumbnail?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  fileCount: number;
}

export interface Activity {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'share';
  fileName: string;
  userName: string;
  timestamp: string;
}

export interface QuotaStats {
  used: number;
  total: number;
  percentage: number;
}
