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
  active: boolean;
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
