import React, { useState } from 'react';
import {
  CheckSquare,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type {
  FinanceState,
  PaymentMethod,
  SplitType,
  Transaction,
} from '../types/finance';
import { formatCurrency } from '../utils/financeUtils';
import {
  exportBackupJSON,
  exportTransactionsToCSV,
  parseCSVContent,
  ParsedImportRow,
  parseOFXContent,
} from '../utils/importExportUtils';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  state: FinanceState;
  onImportTransactions: (newTxs: Transaction[]) => void;
  onRestoreBackup: (newState: FinanceState) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  state,
  onImportTransactions,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [importPaymentMethod, setImportPaymentMethod] =
    useState<PaymentMethod>('credit_card');
  const [importCardId, setImportCardId] = useState(
    state.cards[0]?.id || ''
  );
  const [importPaidById, setImportPaidById] = useState(
    state.members[0]?.id || ''
  );
  const [importSplitType, setImportSplitType] =
    useState<SplitType>('shared_equal');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      if (file.name.toLowerCase().endsWith('.ofx')) {
        const rows = parseOFXContent(content, state.categories);
        setParsedRows(rows);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const parsed = JSON.parse(content) as FinanceState;
          if (parsed.transactions && parsed.members && parsed.categories) {
            onRestoreBackup(parsed);
            onClose();
          }
        } catch {
          alert('Arquivo JSON de backup inválido.');
        }
      } else {
        const rows = parseCSVContent(content, state.categories);
        setParsedRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleStatement = () => {
    const sampleCSV = [
      'date,title,amount',
      `${selectedMonth}-04,Supermercado Carrefour Bairro,412.80`,
      `${selectedMonth}-07,iFood *Restaurante Japones,138.90`,
      `${selectedMonth}-09,Uber *Viagem Aeroporto,54.20`,
      `${selectedMonth}-11,Drogasil Farmacia,89.50`,
      `${selectedMonth}-15,Amazon Prime Compra 1/3,129.90`,
    ].join('\n');
    const rows = parseCSVContent(sampleCSV, state.categories);
    setParsedRows(rows);
  };

  const handleConfirmImport = () => {
    const selected = parsedRows.filter((r) => r.selected);
    if (selected.length === 0) return;

    const card = state.cards.find((c) => c.id === importCardId);
    const effectivePayer =
      importPaymentMethod === 'credit_card' && card
        ? card.holderId
        : importPaidById || state.members[0]?.id || 'm1';

    const generated: Transaction[] = selected.map((row, idx) => ({
      id: `tx-imp-${Date.now()}-${idx}`,
      description: row.description,
      amount: row.amount,
      date: row.date,
      competenceMonth: selectedMonth,
      type: row.type,
      categoryId: row.categoryId,
      paymentMethod: importPaymentMethod,
      cardId:
        importPaymentMethod === 'credit_card' ? importCardId : undefined,
      paidById: effectivePayer,
      splitType: importSplitType,
      installmentCurrent: row.installmentCurrent,
      installmentTotal: row.installmentTotal,
      isPaid: importPaymentMethod !== 'credit_card',
    }));

    onImportTransactions(generated);
    setParsedRows([]);
    onClose();
  };

  const monthTransactions = state.transactions.filter(
    (t) => t.competenceMonth === selectedMonth
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('import')}
              className={`text-sm font-bold pb-1 border-b-2 transition ${
                activeTab === 'import'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Importar Fatura / Extrato (CSV, OFX)
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`text-sm font-bold pb-1 border-b-2 transition ${
                activeTab === 'export'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Exportar Excel (CSV) & Backup
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'import' ? (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Upload Box */}
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-slate-950/50 transition">
              <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">
                Selecione um arquivo CSV, OFX (fatura de cartão/extrato) ou JSON (Backup)
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Compatível com faturas do Nubank, Itaú, Inter, C6 Bank e extratos OFX
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition">
                  Escolher Arquivo (.csv, .ofx, .json)
                  <input
                    type="file"
                    accept=".csv,.ofx,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleStatement}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Simular Fatura Exemplo (Teste Rápido)
                </button>
              </div>
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-4">
                {/* Configurações Destino da Importação */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Importar como:
                    </label>
                    <select
                      value={importPaymentMethod}
                      onChange={(e) =>
                        setImportPaymentMethod(e.target.value as PaymentMethod)
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="credit_card">Fatura de Cartão de Crédito</option>
                      <option value="pix">Extrato Conta (Pix / Débito)</option>
                    </select>
                  </div>

                  {importPaymentMethod === 'credit_card' ? (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Cartão de Destino:
                      </label>
                      <select
                        value={importCardId}
                        onChange={(e) => setImportCardId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {state.cards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Pago por:
                      </label>
                      <select
                        value={importPaidById}
                        onChange={(e) => setImportPaidById(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {state.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Divisão Padrão:
                    </label>
                    <select
                      value={importSplitType}
                      onChange={(e) =>
                        setImportSplitType(e.target.value as SplitType)
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="shared_equal">Compartilhado 50/50</option>
                      <option value="shared_proportional">
                        Compartilhado Proporcional
                      </option>
                      <option value="individual">Individual (100%)</option>
                    </select>
                  </div>
                </div>

                {/* Tabela de Pré-visualização */}
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Incluir</th>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Categoria Auto-Detectada</th>
                        <th className="p-2.5 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-2.5">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={(e) => {
                                const next = [...parsedRows];
                                next[idx].selected = e.target.checked;
                                setParsedRows(next);
                              }}
                              className="accent-emerald-500"
                            />
                          </td>
                          <td className="p-2.5 text-slate-400">{row.date}</td>
                          <td className="p-2.5 font-medium text-white">
                            {row.description}
                          </td>
                          <td className="p-2.5">
                            <select
                              value={row.categoryId}
                              onChange={(e) => {
                                const next = [...parsedRows];
                                next[idx].categoryId = e.target.value;
                                setParsedRows(next);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                            >
                              {state.categories
                                .filter((c) => c.type !== 'income')
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="p-2.5 text-right font-bold text-white">
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    {parsedRows.filter((r) => r.selected).length} itens selecionados
                    para importação
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Confirmar Importação
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <FileSpreadsheet className="w-7 h-7 text-emerald-400 mb-2" />
                  <h3 className="text-sm font-bold text-white">
                    Exportar Planilha do Mês Atual (CSV / Excel)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gera um arquivo CSV compatível com Excel contendo todos os{' '}
                    {monthTransactions.length} lançamentos do mês selecionado.
                  </p>
                </div>
                <button
                  onClick={() =>
                    exportTransactionsToCSV(
                      monthTransactions,
                      state.categories,
                      state.members,
                      state.cards,
                      `duofinance-${selectedMonth}.csv`
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar CSV do Mês ({selectedMonth})
                </button>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <FileText className="w-7 h-7 text-violet-400 mb-2" />
                  <h3 className="text-sm font-bold text-white">
                    Backup Completo do Sistema (JSON)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Salve todos os cartões, membros, metas e histórico completo ({state.transactions.length} lançamentos) para restaurar quando quiser.
                  </p>
                </div>
                <button
                  onClick={() => exportBackupJSON(state)}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Backup Completo (.json)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
