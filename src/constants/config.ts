export const APP_NAME = 'HoraFace';

export const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model';
export const FACE_MATCH_THRESHOLD = 0.52;



export const DETECTION_INTERVAL_MS = 600;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
] as const;

export const DAYS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const SHIFT_COLORS = [
  '#22D3EE',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
] as const;

export const NAV_ITEMS = [
  { path: '/', label: 'Painel', icon: 'LayoutDashboard' },
  { path: '/aferidor-de-horas', label: 'Aferição de Horas', icon: 'ScanFace' },
  { path: '/prestadores', label: 'Prestadores', icon: 'Users' },
  { path: '/chat', label: 'Chat Gestão', icon: 'MessageSquare' },
  { path: '/turnos', label: 'Turnos', icon: 'Clock' },
  { path: '/relatorios', label: 'Relatórios', icon: 'BarChart3' },
  { path: '/feriados', label: 'Calendários', icon: 'Calendar' },
  { path: '/admin-quiosques', label: 'Monitor Quiosques', icon: 'Monitor' },
  { path: '/equipe', label: 'Equipe Gestora', icon: 'ShieldCheck' },
  { path: '/configuracoes', label: 'Configurações', icon: 'Settings' },
  { path: '/docs', label: 'Documentação', icon: 'BookOpen' },
] as const;
