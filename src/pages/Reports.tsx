import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Calendar,
  Download,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimeStore } from '@/stores/useTimeStore';
import { useProviderStore } from '@/stores/useProviderStore';
import { useShiftStore } from '@/stores/useShiftStore';
import ReportTable from '@/components/features/ReportTable';
import type { ReportPeriod, ReportData } from '@/types';

export default function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const timeStore = useTimeStore();
  const providerStore = useProviderStore();
  const shiftStore = useShiftStore();

  const dateRange = useMemo(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    if (period === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (period === 'biweekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - 15);
      start = d.toISOString().split('T')[0];
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    }

    return { start, end };
  }, [period]);

  const filteredRecords = useMemo(() => {
    let recs = timeStore.records.filter(
      (r) => r.date >= dateRange.start && r.date <= dateRange.end,
    );
    if (selectedProvider !== 'all') {
      recs = recs.filter((r) => r.providerId === selectedProvider);
    }
    return recs.sort(
      (a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime(),
    );
  }, [timeStore.records, dateRange, selectedProvider]);

  const summaryData = useMemo<ReportData[]>(() => {
    const providerMap = new Map<string, ReportData>();

    filteredRecords.forEach((rec) => {
      const prov = providerStore.providers.find((p) => p.id === rec.providerId);
      if (!providerMap.has(rec.providerId)) {
        providerMap.set(rec.providerId, {
          providerId: rec.providerId,
          providerName: prov?.name || 'Desconhecido',
          totalHours: 0,
          totalDays: 0,
          avgHoursPerDay: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          records: [],
        });
      }

      const data = providerMap.get(rec.providerId)!;
      data.records.push(rec);

      if (rec.checkOut) {
        const hours =
          (new Date(rec.checkOut).getTime() - new Date(rec.checkIn).getTime()) /
          3600000;
        data.totalHours += hours;
      }
    });

    providerMap.forEach((data) => {
      const uniqueDays = new Set(data.records.map((r) => r.date));
      data.totalDays = uniqueDays.size;
      data.avgHoursPerDay =
        data.totalDays > 0 ? data.totalHours / data.totalDays : 0;
    });

    return Array.from(providerMap.values());
  }, [filteredRecords, providerStore.providers]);

  const totalHours = summaryData.reduce((acc, d) => acc + d.totalHours, 0);
  const totalRecords = filteredRecords.length;
  const uniqueProviders = new Set(filteredRecords.map((r) => r.providerId)).size;

  const handleExport = () => {
    const data = filteredRecords.map((r) => {
      const provider = providerStore.providers.find(p => p.id === r.providerId);
      const shiftIds = provider?.shiftIds ?? (provider?.shiftId ? [provider.shiftId] : []);
      const shiftNames = shiftIds.map((id) => shiftStore.shifts.find(s => s.id === id)?.name).filter(Boolean).join(' + ') || '—';
      const inDate = new Date(r.checkIn);
      const outDate = r.checkOut ? new Date(r.checkOut) : null;
      let duration = '—';
      if (outDate) {
        const diff = outDate.getTime() - inDate.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        duration = `${h}h ${m}m`;
      }
      return {
        'Data': inDate.toLocaleDateString('pt-BR'),
        'Prestador': provider?.name || 'Desconhecido',
        'Turno': shiftNames,
        'Entrada': inDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        'Saída': outDate ? outDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
        'Duração': duration,
        'Status': r.status === 'completed' ? 'Concluído' : r.status === 'active' ? 'Em andamento' : 'Irregular'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ponto');
    XLSX.writeFile(wb, `PontoFace_Planilha_${period}.xlsx`);
  };

  const periodLabel: Record<ReportPeriod, string> = {
    weekly: 'Semanal (7 dias)',
    biweekly: 'Quinzenal (15 dias)',
    monthly: 'Mensal (30 dias)',
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
            Relatórios
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Análise de horas trabalhadas por período
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2 border-border self-start sm:self-auto">
          <Download className="size-4" />
          Exportar Planilha (XLSX)
        </Button>
      </div>

      {/* Filters */}
      <div className="hud-card mb-4 sm:mb-6 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-primary" />
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as ReportPeriod)}
            >
              <SelectTrigger className="w-full sm:w-52 border-border bg-elevated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                <SelectItem value="weekly">Semanal (7 dias)</SelectItem>
                <SelectItem value="biweekly">Quinzenal (15 dias)</SelectItem>
                <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-primary" />
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger className="w-full sm:w-52 border-border bg-elevated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                <SelectItem value="all">Todos os prestadores</SelectItem>
                {providerStore.providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="font-mono text-xs text-text-muted sm:ml-auto">
            {dateRange.start} — {dateRange.end}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="hud-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-[10px] sm:text-xs uppercase text-text-muted">Total Horas</span>
          </div>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-bold tabular-nums text-primary">
            {totalHours.toFixed(1)}h
          </p>
        </div>
        <div className="hud-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-success" />
            <span className="text-[10px] sm:text-xs uppercase text-text-muted">Registros</span>
          </div>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-bold tabular-nums text-success">
            {totalRecords}
          </p>
        </div>
        <div className="hud-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-warning" />
            <span className="text-[10px] sm:text-xs uppercase text-text-muted">Prestadores</span>
          </div>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-bold tabular-nums text-warning">
            {uniqueProviders}
          </p>
        </div>
        <div className="hud-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-info" />
            <span className="text-[10px] sm:text-xs uppercase text-text-muted">Média/Dia</span>
          </div>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-bold tabular-nums text-info">
            {summaryData.length > 0
              ? (
                totalHours /
                Math.max(1, summaryData.reduce((a, d) => a + d.totalDays, 0))
              ).toFixed(1) + 'h'
              : '0h'}
          </p>
        </div>
      </div>

      {/* Per-Provider Summary */}
      {summaryData.length > 0 && (
        <div className="hud-card mb-4 sm:mb-6 rounded-lg p-4 sm:p-5">
          <h3 className="mb-4 font-heading text-base sm:text-lg font-semibold text-text-primary">
            Resumo por Prestador — {periodLabel[period]}
          </h3>
          <div className="space-y-3">
            {summaryData.map((data) => (
              <div
                key={data.providerId}
                className="flex items-center justify-between rounded-lg bg-elevated/50 px-3 sm:px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {data.providerName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {data.totalDays} dia(s) trabalhado(s)
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-mono text-sm font-semibold tabular-nums text-primary">
                    {data.totalHours.toFixed(1)}h
                  </p>
                  <p className="font-mono text-xs tabular-nums text-text-muted">
                    ~{data.avgHoursPerDay.toFixed(1)}h/dia
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="hud-card rounded-lg p-4 sm:p-5">
        <h3 className="mb-4 font-heading text-base sm:text-lg font-semibold text-text-primary">
          Registros Detalhados
        </h3>
        <ReportTable records={filteredRecords} />
      </div>
    </div>
  );
}
