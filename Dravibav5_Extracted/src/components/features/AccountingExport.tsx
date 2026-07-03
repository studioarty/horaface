import { Download, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { toast } from 'sonner';

export default function AccountingExport() {
  const { invoices } = useFinancialAnalytics();

  const exportContaAzul = () => {
    try {
      // Conta Azul format (XML)
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<notas_fiscais>
${invoices.map(inv => `  <nota_fiscal>
    <numero>${inv.invoice_number || ''}</numero>
    <data_emissao>${inv.issue_date || ''}</data_emissao>
    <data_vencimento>${inv.due_date || ''}</data_vencimento>
    <fornecedor>
      <nome>${inv.supplier_name || ''}</nome>
      <cnpj>${inv.supplier_cnpj || ''}</cnpj>
    </fornecedor>
    <valores>
      <total>${inv.total_amount}</total>
      <impostos>${inv.tax_amount}</impostos>
      <liquido>${inv.net_amount}</liquido>
    </valores>
  </nota_fiscal>`).join('\n')}
</notas_fiscais>`;

      downloadFile(xml, 'conta-azul-export.xml', 'application/xml');
      toast.success('Exportação Conta Azul concluída!');
    } catch (error: any) {
      toast.error('Erro na exportação: ' + error.message);
    }
  };

  const exportOmie = () => {
    try {
      // Omie format (JSON)
      const omieData = {
        notas_fiscais: invoices.map(inv => ({
          numero_nota: inv.invoice_number,
          data_emissao: inv.issue_date,
          data_vencimento: inv.due_date,
          fornecedor: {
            razao_social: inv.supplier_name,
            cnpj: inv.supplier_cnpj,
          },
          valor_total: inv.total_amount,
          valor_impostos: inv.tax_amount,
          valor_liquido: inv.net_amount,
          moeda: inv.currency,
          itens: inv.items || [],
        })),
        total_registros: invoices.length,
        data_exportacao: new Date().toISOString(),
      };

      downloadFile(JSON.stringify(omieData, null, 2), 'omie-export.json', 'application/json');
      toast.success('Exportação Omie concluída!');
    } catch (error: any) {
      toast.error('Erro na exportação: ' + error.message);
    }
  };

  const exportTotvs = () => {
    try {
      // Totvs format (TXT estruturado)
      const lines = [
        'TIPO|NUM_NF|EMISSAO|VENCIMENTO|FORNECEDOR|CNPJ|VALOR_TOTAL|IMPOSTOS|LIQUIDO',
        ...invoices.map(inv => 
          `NF|${inv.invoice_number}|${inv.issue_date}|${inv.due_date}|${inv.supplier_name}|${inv.supplier_cnpj}|${inv.total_amount}|${inv.tax_amount}|${inv.net_amount}`
        ),
      ];

      downloadFile(lines.join('\n'), 'totvs-export.txt', 'text/plain');
      toast.success('Exportação Totvs concluída!');
    } catch (error: any) {
      toast.error('Erro na exportação: ' + error.message);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-secondary/30 rounded-lg border border-border p-6 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-2">Nenhuma nota fiscal para exportar</p>
        <p className="text-sm text-muted-foreground">
          Processe notas fiscais primeiro para habilitar exportação contábil
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        Integração com Sistemas Contábeis
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Exporte dados de notas fiscais para importação em sistemas contábeis populares
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={exportContaAzul}
          variant="outline"
          className="gap-2 h-auto py-4 flex-col"
        >
          <Download className="w-6 h-6 text-blue-600" />
          <div className="text-center">
            <div className="font-semibold">Conta Azul</div>
            <div className="text-xs text-muted-foreground mt-1">Formato XML</div>
          </div>
        </Button>

        <Button
          onClick={exportOmie}
          variant="outline"
          className="gap-2 h-auto py-4 flex-col"
        >
          <Download className="w-6 h-6 text-green-600" />
          <div className="text-center">
            <div className="font-semibold">Omie</div>
            <div className="text-xs text-muted-foreground mt-1">Formato JSON</div>
          </div>
        </Button>

        <Button
          onClick={exportTotvs}
          variant="outline"
          className="gap-2 h-auto py-4 flex-col"
        >
          <Download className="w-6 h-6 text-purple-600" />
          <div className="text-center">
            <div className="font-semibold">Totvs</div>
            <div className="text-xs text-muted-foreground mt-1">Formato TXT</div>
          </div>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Total de {invoices.length} nota(s) fiscal(is) serão exportadas
      </p>
    </div>
  );
}
