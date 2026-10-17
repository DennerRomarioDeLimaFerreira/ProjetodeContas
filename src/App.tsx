import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  FileSpreadsheet,
  LayoutDashboard,
  ListOrdered,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { BudgetsView } from './components/BudgetsView';
import { CardsView } from './components/CardsView';
import { DashboardView } from './components/DashboardView';
import { ImportExportModal } from './components/ImportExportModal';
import { SharedView } from './components/SharedView';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import { createInitialFinanceState } from './data/initialData';
import {
  Category,
  CreditCard,
  FinanceState,
  Member,
  SettlementRecord,
  Transaction,
} from './types/finance';
import {
  addMonths,
  computeFirstCompetenceMonth,
  formatCurrency,
  formatMonthLabel,
  getCurrentYearMonth,
  getTodayISO,
  parseQuickEntry,
} from './utils/financeUtils';

const STORAGE_KEY = 'duofinance_state_v1';

type ActiveTab = 'dashboard' | 'transactions' | 'cards' | 'shared' | 'budgets';

export function App() {
  const [state, setState] = useState<FinanceState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FinanceState;
        if (parsed.members && parsed.categories && parsed.transactions) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do LocalStorage:', e);
    }
    return createInitialFinanceState();
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(
    getCurrentYearMonth()
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Barra de Lançamento Rápido Inteligente
  const [quickText, setQuickText] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
    }
  }, [state]);

  const monthTransactions = useMemo(
    () =>
      state.transactions.filter((t) => t.competenceMonth === selectedMonth),
    [state.transactions, selectedMonth]
  );

  const quickPreview = useMemo(
    () =>
      parseQuickEntry(
        quickText,
        state.categories,
        state.cards,
        state.members
      ),
    [quickText, state.categories, state.cards, state.members]
  );

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPreview) return;

    const today = getTodayISO();
    const date = today.startsWith(selectedMonth)
      ? today
      : `${selectedMonth}-10`;
    const card = state.cards.find((c) => c.id === quickPreview.cardId);
    const firstComp = computeFirstCompetenceMonth(
      date,
      quickPreview.paymentMethod,
      card
    );

    const groupId = `grp-quick-${Date.now()}`;
    const newTxs: Transaction[] = [];
    const perInstallment =
      quickPreview.amount / Math.max(1, quickPreview.installments);

    for (let i = 1; i <= quickPreview.installments; i++) {
      newTxs.push({
        id: `tx-q-${Date.now()}-${i}`,
        groupId: quickPreview.installments > 1 ? groupId : undefined,
        description: quickPreview.description,
        amount: Number(perInstallment.toFixed(2)),
        totalPurchaseAmount:
          quickPreview.installments > 1 ? quickPreview.amount : undefined,
        date,
        competenceMonth: addMonths(firstComp, i - 1),
        type: 'expense',
        categoryId: quickPreview.categoryId,
        paymentMethod: quickPreview.paymentMethod,
        cardId: quickPreview.cardId,
        paidById: quickPreview.paidById,
        splitType: quickPreview.splitType,
        installmentCurrent: quickPreview.installments > 1 ? i : undefined,
        installmentTotal:
          quickPreview.installments > 1
            ? quickPreview.installments
            : undefined,
        isPaid: quickPreview.paymentMethod !== 'credit_card',
      });
    }

    setState((prev) => ({
      ...prev,
      transactions: [... newTxs, ...prev.transactions],
    }));

    setQuickText('');
    setQuickFeedback(
      `Lançado: ${quickPreview.description} (${
        quickPreview.installments > 1
          ? `${quickPreview.installments}x de ${formatCurrency(perInstallment)}`
          : formatCurrency(quickPreview.amount)
      })`
    );
    setTimeout(() => setQuickFeedback(null), 4000);
  };

  const handleSaveTransactions = (savedTxs: Transaction[]) => {
    setState((prev) => {
      if (editingTx && savedTxs.length === 1) {
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.id === savedTxs[0].id ? savedTxs[0] : t
          ),
        };
      }
      return {
        ...prev,
        transactions: [...savedTxs, ...prev.transactions],
      };
    });
    setEditingTx(null);
  };

  const handleDeleteTransaction = (tx: Transaction, deleteGroup: boolean) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) =>
        deleteGroup && tx.groupId
          ? t.groupId !== tx.groupId
          : t.id !== tx.id
      ),
    }));
  };

  const handleTogglePaid = (txId: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === txId ? { ...t, isPaid: !t.isPaid } : t
      ),
    }));
  };

  const handleAddCard = (card: CreditCard) => {
    setState((prev) => ({
      ...prev,
      cards: [...prev.cards, card],
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    if (
      !window.confirm(
        'Deseja remover este cartão? Os lançamentos existentes serão mantidos.'
      )
    )
      return;
    setState((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== cardId),
    }));
  };

  const handlePayCardInvoice = (cardId: string, month: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.cardId === cardId && t.competenceMonth === month
          ? { ...t, isPaid: true }
          : t
      ),
    }));
  };

  const handleUpdateMember = (updated: Member) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
  };

  const handleAddMember = (member: Member) => {
    setState((prev) => ({
      ...prev,
      members: [...prev.members, member],
    }));
  };

  const handleAddSettlement = (record: SettlementRecord) => {
    setState((prev) => ({
      ...prev,
      settlements: [...prev.settlements, record],
    }));
  };

  const handleDeleteSettlement = (id: string) => {
    setState((prev) => ({
      ...prev,
      settlements: prev.settlements.filter((s) => s.id !== id),
    }));
  };

  const handleUpdateCategory = (updated: Category) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  };

  const handleAddCategory = (category: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, category],
    }));
  };

  const handleResetDemo = () => {
    if (
      window.confirm(
        'Deseja restaurar os dados de demonstração iniciais? Suas alterações atuais serão substituídas.'
      )
    ) {
      const fresh = createInitialFinanceState();
      setState(fresh);
      setSelectedMonth(getCurrentYearMonth());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  DuoFinance
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Cartões & Compartilhado
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Gestão inteligente de faturas, parcelas e divisão de contas
              </p>
            </div>
          </div>

          {/* Seletor de Mês/Fatura */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1 text-center min-w-[165px]">
              <div className="text-xs font-bold text-white">
                {formatMonthLabel(selectedMonth)}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">
                {selectedMonth === getCurrentYearMonth()
                  ? 'Mês Atual'
                  : 'Navegando Faturas'}
              </div>
            </div>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ações Rápidas */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsImportExportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Importar / Exportar</span>
            </button>

            <button
              onClick={handleResetDemo}
              title="Restaurar dados de exemplo"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Gasto</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação das Abas + Lançamento Rápido */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Abas */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              {
                id: 'dashboard',
                label: 'Dashboard',
                icon: LayoutDashboard,
              },
              {
                id: 'cards',
                label: 'Cartões & Parcelas',
                icon: CreditCardIcon,
              },
              {
                id: 'shared',
                label: 'Divisão & Acerto',
                icon: Users,
              },
              {
                id: 'transactions',
                label: 'Extrato',
                icon: ListOrdered,
              },
              {
                id: 'budgets',
                label: 'Metas & 50-30-20',
                icon: Target,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Barra de Lançamento Rápido por Texto */}
          <form
            onSubmit={handleQuickSubmit}
            className="relative flex-1 max-w-xl"
          >
            <div className="flex items-center bg-slate-900/90 border border-slate-800 focus-within:border-emerald-500/60 rounded-xl px-3 py-1.5 gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder='Lançamento rápido: ex. "Mercado 380 2x Nubank compartilhado" + Enter'
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {quickPreview && (
                <button
                  type="submit"
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 transition"
                >
                  Lançar {formatCurrency(quickPreview.amount)}
                  {quickPreview.installments > 1
                    ? ` (${quickPreview.installments}x)`
                    : ''}
                </button>
              )}
            </div>
            {quickFeedback && (
              <div className="absolute right-0 -bottom-6 text-[11px] text-emerald-400 font-medium">
                ✓ {quickFeedback}
              </div>
            )}
          </form>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            selectedMonth={selectedMonth}
            transactions={monthTransactions}
            allTransactions={state.transactions}
            categories={state.categories}
            cards={state.cards}
            members={state.members}
            settlements={state.settlements}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectMonth={(m) => setSelectedMonth(m)}
          />
        )}

        {activeTab === 'cards' && (
          <CardsView
            selectedMonth={selectedMonth}
            cards={state.cards}
            members={state.members}
            categories={state.categories}
            monthTransactions={monthTransactions}
            allTransactions={state.transactions}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
            onPayCardInvoice={handlePayCardInvoice}
            onOpenNewTransactionWithCard={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
          />
        )}

        {activeTab === 'shared' && (
          <SharedView
            selectedMonth={selectedMonth}
            members={state.members}
            cards={state.cards}
            monthTransactions={monthTransactions}
            settlements={state.settlements}
            onUpdateMember={handleUpdateMember}
            onAddMember={handleAddMember}
            onAddSettlement={handleAddSettlement}
            onDeleteSettlement={handleDeleteSettlement}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            selectedMonth={selectedMonth}
            transactions={monthTransactions}
            categories={state.categories}
            cards={state.cards}
            members={state.members}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onTogglePaid={handleTogglePaid}
            onOpenNewModal={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsView
            selectedMonth={selectedMonth}
            categories={state.categories}
            monthTransactions={monthTransactions}
            members={state.members}
            onUpdateCategory={handleUpdateCategory}
            onAddCategory={handleAddCategory}
          />
        )}
      </main>

      {/* Modais */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSaveTransactions={handleSaveTransactions}
        categories={state.categories}
        cards={state.cards}
        members={state.members}
        selectedMonth={selectedMonth}
        editingTransaction={editingTx}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        selectedMonth={selectedMonth}
        state={state}
        onImportTransactions={(newTxs) => {
          setState((prev) => ({
            ...prev,
            transactions: [...newTxs, ...prev.transactions],
          }));
        }}
        onRestoreBackup={(restored) => setState(restored)}
      />
    </div>
  );
}

export default App;
