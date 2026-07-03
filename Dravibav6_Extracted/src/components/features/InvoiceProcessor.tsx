import { useState } from 'react';
import { Receipt, Sparkles, CheckCircle2, XCircle, Loader, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvoiceProcessing } from '@/hooks/useInvoiceProcessing';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface InvoiceProcessorProps {
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
}

export default function InvoiceProcessor({ fileId, fileUrl, fileName }: InvoiceProcessorProps) {
  const { invoices, totals, processInvoice, isProcessing, updateInvoiceData, deleteInvoiceData } = useInvoiceProcessing();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const handleProcess = () => {
    if (fileId && fileUrl && fileName) {
      processInvoice({ fileId, fileUrl, fileName });
    }
  };

  const handleEdit = (invoice: any) => {
    setEditingId(invoice.id);
    setEditForm({
      invoice_number: invoice.invoice_number || '',
      supplier_name: invoice.supplier_name || '',
      supplier_cnpj: invoice.supplier_cnpj || '',
      total_amount: invoice.total_amount || '',
      tax_amount: invoice.tax_amount || '',
      net_amount: invoice.net_amount || '',
      issue_date: invoice.issue_date || '',
      due_date: invoice.due_date || '',
    });
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateInvoiceData({ id: editingId, updates: editForm });
      setEditingId(null);
    }
  };

  const formatCurrency = (amount?: number, currency = 'BRL') => {
    if (!amount) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Process Button */}
      {fileId && fileUrl && fileName && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Processamento Inteligente de Nota Fiscal</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use IA para extrair automaticamente dados da nota fiscal: valores, impostos, fornecedor, itens e muito mais.
                </p>
              </div>
            </div>
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Processar com IA
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Totals Summary */}
      {Object.keys(totals).length > 0 && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Resumo Contábil
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(totals).map(([currency, data]: [string, any]) => (
              <div key={currency} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-muted-foreground mb-1">{currency}</p>
                <p className="text-2xl font-bold text-green-700 mb-1">
                  {formatCurrency(data.total, currency)}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Impostos: {formatCurrency(data.tax, currency)}</p>
                  <p>Líquido: {formatCurrency(data.net, currency)}</p>
                  <p className="font-medium text-foreground mt-2">{data.count} nota(s)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Notas Fiscais Processadas</h3>
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p>Nenhuma nota fiscal processada ainda</p>
              <p className="text-sm mt-1">Use o botão "Processar com IA" em um arquivo de nota fiscal</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {invoice.extraction_status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : invoice.extraction_status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : invoice.extraction_status === 'processing' ? (
                        <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Receipt className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === invoice.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Número NF</label>
                              <Input
                                value={editForm.invoice_number}
                                onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">CNPJ</label>
                              <Input
                                value={editForm.supplier_cnpj}
                                onChange={(e) => setEditForm({ ...editForm, supplier_cnpj: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Fornecedor</label>
                              <Input
                                value={editForm.supplier_name}
                                onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Valor Total</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editForm.total_amount}
                                onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{invoice.file?.name}</p>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              invoice.extraction_status === 'completed' ? 'bg-green-100 text-green-800' :
                              invoice.extraction_status === 'failed' ? 'bg-red-100 text-red-800' :
                              invoice.extraction_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {invoice.extraction_status}
                            </span>
                          </div>
                          {invoice.extraction_status === 'completed' && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Número NF</p>
                                <p className="font-medium">{invoice.invoice_number || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Fornecedor</p>
                                <p className="font-medium truncate">{invoice.supplier_name || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor Total</p>
                                <p className="font-medium text-green-700">
                                  {formatCurrency(invoice.total_amount, invoice.currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Impostos</p>
                                <p className="font-medium">{formatCurrency(invoice.tax_amount, invoice.currency)}</p>
                              </div>
                              {invoice.issue_date && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Emissão</p>
                                  <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                              )}
                              {invoice.due_date && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Vencimento</p>
                                  <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {invoice.extraction_date && formatDistanceToNow(new Date(invoice.extraction_date), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId !== invoice.id && invoice.extraction_status === 'completed' && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive"
                        onClick={() => {
                          if (confirm('Remover dados extraídos?')) {
                            deleteInvoiceData(invoice.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
