import { Brain, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import type { AIInsight } from '@/types';

interface AIInsightsProps {
  insights: AIInsight[];
}

const typeConfig = {
  alert: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  pattern: {
    icon: TrendingUp,
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/20',
  },
  prediction: {
    icon: Brain,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  summary: {
    icon: FileText,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
};

export default function AIInsights({ insights }: AIInsightsProps) {
  return (
    <div className="hud-card rounded-lg p-5 animate-fade-up">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="size-5 text-primary" />
        <h3 className="font-heading text-lg font-semibold text-text-primary">
          Assistente IA
        </h3>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
          Ativo
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;

          return (
            <div
              key={insight.id}
              className={`rounded-lg border ${config.border} ${config.bg} p-3`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 size-4 shrink-0 ${config.color}`} />
                <div>
                  <p className={`text-sm font-semibold ${config.color}`}>
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-secondary text-pretty">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
