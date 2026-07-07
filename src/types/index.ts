export interface Provider {
  id: string;
  name: string;
  cpf: string;
  role: string;
  company: string;
  photo: string;
  faceDescriptor: number[];
  faceDescriptors?: number[][];  // Multiple descriptors for better accuracy
  facePhotos?: string[];          // Photos from each capture position
  shiftId: string;
  shiftIds?: string[];  // Multiple shifts support (morning + afternoon)
  hourlyRate?: number;  // Valor Oficial da Hora
  pin?: string;         // Senha do App Mobile
  chatPermissionType?: 'none' | 'all' | 'custom';
  chatAllowedProviders?: string[]; // IDs de prestadores permitidos
  active: boolean;
  isTest?: boolean;
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  color: string;
}

export interface TimeRecord {
  id: string;
  providerId: string;
  checkIn: string;
  checkOut: string | null;
  status: 'active' | 'completed' | 'irregular';
  date: string;
  photoUrl?: string;
  location?: string;
}

export interface AIInsight {
  id: string;
  type: 'alert' | 'pattern' | 'prediction' | 'summary';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface DetectionResult {
  providerId: string | null;
  providerName: string | null;
  confidence: number;
  descriptor: number[];
  timestamp: number;
}

export type ReportPeriod = 'weekly' | 'biweekly' | 'monthly';

export interface ReportData {
  providerId: string;
  providerName: string;
  totalHours: number;
  totalDays: number;
  avgHoursPerDay: number;
  lateArrivals: number;
  earlyDepartures: number;
  records: TimeRecord[];
}

export interface KioskLibraryItem {
  id: string;
  type: 'image' | 'video' | 'youtube' | 'weather' | 'clock' | 'iframe' | 'richtext' | 'rss';
  url: string; // File URL, YouTube URL, IFrame URL...
  label: string; // Reference name
  durationSec?: number; // Only used for Images/Widgets to auto-switch. Videos switch on-end.
  sizeBytes?: number;
  content?: string; // Usado para 'richtext'
  options?: Record<string, any>; // Opções adicionais (ex: tema, fuso horário)
}

export interface KioskSettingsData {
  library: KioskLibraryItem[];
  campaigns: KioskCampaign[];
  idleTimeoutSec: number;
  slideIntervalSec: number;
  showClock: boolean;
  message: string;
  minCheckoutMinutes: number;
  newsTickerSpeed: number;
  rssTargetKiosks?: string[];
  liteTargetKiosks?: string[];
  
  // V21: Geofencing Mobile Extension
  mobileLat?: string;
  mobileLng?: string;
  mobileRadius?: number;
  autoCheckoutToleranceMinutes?: number;
  autoCheckoutWarningMinutes?: number;
}

export type KioskLayoutType = 'fullscreen' | 'sidebar_right' | 'split_half';

export interface KioskCampaign {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  executionType: 'immediate' | 'scheduled';
  startDate?: string;   // ISO Date Ex: "2026-03-01T00:00:00.000Z"
  endDate?: string;     // ISO Date Ex: "2026-03-31T23:59:59.000Z"
  scheduleRules?: {
    startTime: string; // Ex: "08:00"
    endTime: string;   // Ex: "18:00"
    days: number[];    // 0=Dom, 1=Seg...
  };
  targetKiosks?: string[]; // IDs restritos de Kiosks. Se ausente/vazio, roda em todos os Kiosks globais.
  
  // V33: Signage Studio (Multi-Zone Layouts)
  layoutType?: KioskLayoutType; // default is 'fullscreen' if undefined
  mediaItems: string[]; // Referência de mídias da Zona Primária
  sidebarItems?: string[]; // Mídias para Sidebar ou 2ª Metade
}
