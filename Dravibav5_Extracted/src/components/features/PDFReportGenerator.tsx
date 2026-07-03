import { FileDown, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { toast } from 'sonner';

export default function PDFReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const { supplierAnalytics, monthlyAnalytics, upcomingPayments, totals } = useFinancialAnalytics();

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Dynamic import to reduce bundle size
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('CloudIBAV', 15, 20);
      doc.setFontSize(12);
      doc.text('Relatório Financeiro Executivo', 15, 30);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), pageWidth - 15, 30, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      let yPos = 50;

      // KPIs Section
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Indicadores Principais', 15, yPos);
      yPos += 10;

      doc.autoTable({
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Gasto Total', formatCurrency(totals.total_spent)],
          ['Total de Impostos', formatCurrency(totals.total_taxes)],
          ['Valor Líquido', formatCurrency(totals.total_net)],
          ['Notas Fiscais Processadas', totals.invoice_count.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Monthly Analytics
      if (monthlyAnalytics.length > 0) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Análise Mensal', 15, yPos);
        yPos += 10;

        doc.autoTable({
          startY: yPos,
          head: [['Mês', 'Total', 'Impostos', 'Líquido', 'Qtd']],
          body: monthlyAnalytics.map(m => [
            formatMonth(m.month),
            formatCurrency(m.total_amount),
            formatCurrency(m.tax_amount),
            formatCurrency(m.net_amount),
            m.invoice_count.toString(),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      // Supplier Analytics
      if (supplierAnalytics.length > 0) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Principais Fornecedores', 15, yPos);
        yPos += 10;

        doc.autoTable({
          startY: yPos,
          head: [['Fornecedor', 'CNPJ', 'Total Gasto', 'Qtd NFe']],
          body: supplierAnalytics.slice(0, 10).map(s => [
            s.supplier_name,
            s.supplier_cnpj || '-',
            formatCurrency(s.total_amount),
            s.invoice_count.toString(),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      // Upcoming Payments
      if (upcomingPayments.length > 0) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Próximos Vencimentos', 15, yPos);
        yPos += 10;

        doc.autoTable({
          startY: yPos,
          head: [['NF', 'Fornecedor', 'Valor', 'Vencimento', 'Status']],
          body: upcomingPayments.map(p => [
            p.invoice_number,
            p.supplier_name,
            formatCurrency(p.total_amount),
            new Date(p.due_date).toLocaleDateString('pt-BR'),
            p.days_until_due <= 7 ? 'URGENTE' : p.days_until_due <= 15 ? 'Atenção' : 'OK',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount} - Gerado por CloudIBAV`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save
      doc.save(`relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      className="gap-2"
      variant="default"
    >
      {generating ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Gerar Relatório PDF
        </>
      )}
    </Button>
  );
}
