import type { Shift, AIInsight } from '@/types';

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: 'shift-morning',
    name: 'Manhã',
    startTime: '06:00',
    endTime: '14:00',
    days: [1, 2, 3, 4, 5],
    color: '#22D3EE',
  },
  {
    id: 'shift-afternoon',
    name: 'Tarde',
    startTime: '14:00',
    endTime: '22:00',
    days: [1, 2, 3, 4, 5],
    color: '#10B981',
  },
  {
    id: 'shift-night',
    name: 'Noite',
    startTime: '22:00',
    endTime: '06:00',
    days: [1, 2, 3, 4, 5],
    color: '#8B5CF6',
  },
];

export function generateInsights(
  totalProviders: number,
  totalRecords: number,
  activeNow: number,
): AIInsight[] {
  const now = new Date().toISOString();
  const insights: AIInsight[] = [];

  if (totalProviders === 0) {
    insights.push({
      id: 'ins-1',
      type: 'summary',
      title: 'Sistema Pronto',
      description:
        'Nenhum prestador cadastrado ainda. Cadastre prestadores com captura facial para iniciar o controle de ponto.',
      severity: 'low',
      timestamp: now,
    });
    return insights;
  }

  insights.push({
    id: 'ins-summary',
    type: 'summary',
    title: 'Resumo do Dia',
    description: `${activeNow} prestador(es) ativo(s) agora de ${totalProviders} cadastrado(s). ${totalRecords} registro(s) hoje.`,
    severity: 'low',
    timestamp: now,
  });

  if (activeNow === 0 && totalProviders > 0) {
    insights.push({
      id: 'ins-alert-none',
      type: 'alert',
      title: 'Nenhum Prestador Ativo',
      description:
        'Nenhum prestador registrou entrada hoje. Verifique se há problemas operacionais.',
      severity: 'high',
      timestamp: now,
    });
  }

  if (totalRecords > 5) {
    insights.push({
      id: 'ins-pattern',
      type: 'pattern',
      title: 'Padrão Identificado',
      description:
        'A maioria dos registros de entrada ocorre entre 06:00 e 07:00. Considere ajustar os turnos para melhor cobertura.',
      severity: 'medium',
      timestamp: now,
    });
  }

  insights.push({
    id: 'ins-prediction',
    type: 'prediction',
    title: 'Previsão de Horas',
    description: `Com base no ritmo atual, estima-se ${(totalRecords * 7.5).toFixed(0)}h trabalhadas esta semana.`,
    severity: 'low',
    timestamp: now,
  });

  return insights;
}
