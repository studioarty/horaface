import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Calendar,
  Download,
  Clock,
  Users,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTimeStore } from '@/stores/useTimeStore';
import { useProviderStore } from '@/stores/useProviderStore';
import { useShiftStore } from '@/stores/useShiftStore';
import { TabTimeBank } from '@/components/features/reports/TabTimeBank';
import { TabPayroll } from '@/components/features/reports/TabPayroll';
import { TabAudit } from '@/components/features/reports/TabAudit';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import type { ReportPeriod, ReportData } from '@/types';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('payroll');
  const [period, setPeriod] = useState<ReportPeriod | 'custom'>('monthly');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Custom date range
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonth = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })();
  const [customStart, setCustomStart] = useState<string>(firstOfMonth);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const timeStore = useTimeStore();
  const providerStore = useProviderStore();
  const shiftStore = useShiftStore();
  const { toast } = useToast();

  const dateRange = useMemo(() => {
    if (period === 'custom') {
      return { start: customStart, end: customEnd };
    }
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;
    if (period === 'weekly') {
      const d = new Date(now); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0];
    } else if (period === 'biweekly') {
      const d = new Date(now); d.setDate(d.getDate() - 15); start = d.toISOString().split('T')[0];
    } else {
      // monthly: current month
      const d = new Date(now); d.setDate(1); start = d.toISOString().split('T')[0];
    }
    return { start, end };
  }, [period, customStart, customEnd]);

  const filteredRecords = useMemo(() => {
    let recs = timeStore.records.filter((r) => {
      // Some records may have null date — derive from checkIn as fallback
      const recDate = r.date || new Date(r.checkIn).toLocaleDateString('sv');
      return recDate >= dateRange.start && recDate <= dateRange.end;
    });
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

  const getExportData = () => {
    let exportData: any[] = [];
    let sheetName = 'Relatorio';

    if (activeTab === 'payroll') {
      const map = new Map<string, any>();
      filteredRecords.forEach((rec) => {
        const prov = providerStore.providers.find((p) => p.id === rec.providerId);
        if (!prov) return;
        if (!map.has(rec.providerId)) {
          const shiftId = prov.shiftIds?.[0] || prov.shiftId;
          const shift = shiftStore.shifts.find(s => s.id === shiftId);
          let dailyExpectedHours = 0;
          if (shift) {
            const [sH, sM] = (shift.startTime || '00:00').split(':').map(Number);
            const [eH, eM] = (shift.endTime || '00:00').split(':').map(Number);
            const sTotal = sH + sM / 60;
            let eTotal = eH + eM / 60;
            if (eTotal < sTotal) eTotal += 24;
            dailyExpectedHours = eTotal - sTotal;
          }
          map.set(rec.providerId, {
            providerName: prov.name,
            shiftName: shift?.name || 'Sem Escala',
            hourlyRate: prov.hourlyRate || 0,
            totalRealHours: 0,
            uniqueDaysWorked: new Set(),
          });
        }
        const data = map.get(rec.providerId);
        data.uniqueDaysWorked.add(rec.date);
        if (rec.checkOut) {
          const hours = (new Date(rec.checkOut).getTime() - new Date(rec.checkIn).getTime()) / 3600000;
          data.totalRealHours += hours;
        }
      });

      exportData = Array.from(map.values()).map(data => {
        const daysCount = data.uniqueDaysWorked.size;
        const totalPayment = data.totalRealHours * data.hourlyRate;
        return {
          'Prestador': data.providerName,
          'Turno Base': data.shiftName,
          'Dias Ativos': daysCount,
          'Horas Totais (Decimal)': data.totalRealHours.toFixed(2),
          'Valor/Hora (R$)': data.hourlyRate.toFixed(2),
          'Repasse Final (R$)': totalPayment.toFixed(2)
        };
      }).sort((a, b) => parseFloat(b['Horas Totais (Decimal)']) - parseFloat(a['Horas Totais (Decimal)']));
      sheetName = 'Fechamento Mensal';
    } else {
      exportData = filteredRecords.map((r) => {
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
        const baseRow = {
          'Data': inDate.toLocaleDateString('pt-BR'),
          'Prestador': provider?.name || 'Desconhecido',
          'Turno': shiftNames,
          'Entrada': inDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          'Saída': outDate ? outDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
          'Duração': duration,
          'Status': r.status === 'completed' ? 'Concluído' : r.status === 'active' ? 'Em andamento' : 'Irregular',
          'Coordenadas GPS': r.location || 'Sem Registro'
        };

        if (activeTab === 'audit') {
          return { ...baseRow, 'Link da Foto Biometria (AntiFraude)': r.photoUrl || 'Sem Registro' };
        }
        return baseRow;
      });
      sheetName = activeTab === 'audit' ? 'Auditoria' : 'Extrato de Horas';
    }

    return { exportData, sheetName };
  };

  const handleExportXLSX = () => {
    const { exportData, sheetName } = getExportData();
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `HoraFace_${sheetName}_${dateRange.start}_ate_${dateRange.end}.xlsx`);
  };

  const handleExportCSV = () => {
    const { exportData, sheetName } = getExportData();
    if (exportData.length === 0) return;
    const header = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HoraFace_${sheetName}_${dateRange.start}_ate_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    toast({ title: 'Gerando PDF Completo', description: 'Aguarde, processando gráficos 3D e extração de tabela...' });

    setTimeout(async () => {
      try {
        const element = document.getElementById('relatorio-print-area');
        if (!element) throw new Error("Área não encontrada");

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#030712'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);

        let heightLeft = pdfHeight - pageHeight;
        while (heightLeft >= 0) {
          position = position - pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        const { sheetName } = getExportData();
        pdf.save(`HoraFace_${sheetName}_${dateRange.start}_ate_${dateRange.end}.pdf`);
        toast({ title: 'Sucesso', description: 'O Documento PDF com Gráficos 3D foi salvo na sua pasta Download.' });
      } catch (err) {
        console.error("PDF Export Err", err);
        toast({ variant: 'destructive', title: 'Falha', description: 'Não foi possível gerar o PDF da tela atual.' });
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  const periodLabel: Record<string, string> = {
    weekly: 'Semanal (7 dias)',
    biweekly: 'Quinzenal (15 dias)',
    monthly: 'Mês Atual',
    custom: 'Período Personalizado',
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary">
            Relatório de Medição
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Extrato de faturamento e medições do período
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 border-border self-start sm:self-auto" disabled={isExporting}>
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting ? 'Processando Grade...' : 'Opções de Exportação'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface border-border p-2 min-w-48">
            <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-elevated py-2" onClick={handleExportXLSX}>
              <FileSpreadsheet className="size-4 text-green-500" /> Planilha (XLSX)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-elevated py-2" onClick={handleExportCSV}>
              <FileText className="size-4 text-blue-500" /> Tabela de Texto (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-elevated py-2" onClick={handleExportPDF}>
              <Download className="size-4 text-red-500" /> Documento Nativo (PDF)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <div className="hud-card mb-4 sm:mb-6 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-primary" />
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as any)}
            >
              <SelectTrigger className="w-full sm:w-52 border-border bg-elevated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                <SelectItem value="monthly">Mês Atual</SelectItem>
                <SelectItem value="weekly">Semanal (7 dias)</SelectItem>
                <SelectItem value="biweekly">Quinzenal (15 dias)</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range inputs */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">De:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-border bg-elevated rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-text-muted">Até:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-border bg-elevated rounded-md px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Collaborator filter */}
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
                <SelectItem value="all">Todos os colaboradores</SelectItem>
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

      {/* Container de Relatórios Segmentados MEI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-elevated/50 mb-6 border border-border p-1 rounded-lg">
          <TabsTrigger value="payroll" className="data-[state=active]:bg-cyan-900/40 data-[state=active]:text-cyan-400">
            <span className="hidden sm:inline">Fechamento Mês</span>
            <span className="sm:hidden">Mês</span>
          </TabsTrigger>
          <TabsTrigger value="timebank" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <span className="hidden sm:inline">Extrato de Horas</span>
            <span className="sm:hidden">Extrato</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-rose-900/40 data-[state=active]:text-rose-400">
            <span className="hidden sm:inline">Auditoria c/ Foto</span>
            <span className="sm:hidden">Fotos</span>
          </TabsTrigger>
        </TabsList>

        <div id="relatorio-print-area" className="space-y-6 bg-base">
          <TabsContent value="timebank" className="mt-0">
            <TabTimeBank summaryData={summaryData} filteredRecords={filteredRecords} />
          </TabsContent>

          <TabsContent value="payroll" className="mt-0">
            <TabPayroll filteredRecords={filteredRecords} dateStart={dateRange.start} dateEnd={dateRange.end} />
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <TabAudit filteredRecords={filteredRecords} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
