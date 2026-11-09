import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { UsersManagementModal } from './components/UsersManagementModal';
import { AuthSession } from './types/auth';
import {
  clearCurrentSession,
  getCurrentSession,
  getStoreKeyForUser,
  getUserLocalStorageStateKey,
} from './utils/authService';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CreditCard as CreditCardIcon,
  FileSpreadsheet,
  LayoutDashboard,
  ListOrdered,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { BudgetsView } from './components/BudgetsView';
import { CardsView } from './components/CardsView';
import { DashboardView } from './components/DashboardView';
import { ImportExportModal } from './components/ImportExportModal';
import { LgpdConsentModal } from './components/LgpdConsentModal';
import { LgpdDlpBanner } from './components/LgpdDlpBanner';
import { SharedView } from './components/SharedView';
import {
  SaveTransactionsMeta,
  TransactionModal,
} from './components/TransactionModal';
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
  loadCloudFinanceState,
  saveCloudFinanceState,
} from './utils/cloudSync';
import {
  addMonths,
  computeFirstCompetenceMonth,
  formatCurrency,
  formatMonthLabel,
  getCurrentYearMonth,
  getTodayISO,
  parseQuickEntry,
} from './utils/financeUtils';
import { detectPII } from './utils/lgpd';

const LGPD_CONSENT_KEY = 'duofinance_lgpd_consent_v1';

type ActiveTab = 'dashboard' | 'transactions' | 'cards' | 'shared' | 'budgets';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getCurrentSession()
  );
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Carrega estado seguro e estritamente isolado para o usuário da sessão
  const loadStateForSession = (currentSession: AuthSession | null): FinanceState => {
    try {
      if (!currentSession) return createInitialFinanceState();
      const userKey = getUserLocalStorageStateKey(currentSession.user);
      let saved = localStorage.getItem(userKey);

      // Auto-recuperação segura exclusiva para o ROOT a partir do cache legado do navegador
      if (currentSession.user.role === 'ROOT') {
        let currentParsed: FinanceState | null = null;
        if (saved) {
          try {
            currentParsed = JSON.parse(saved) as FinanceState;
          } catch {
            currentParsed = null;
          }
        }
        if (!currentParsed || (currentParsed.transactions?.length === 0 && currentParsed.cards?.length === 0)) {
          const legacyKeys = ['duofinance_state_real_v1', 'duofinance_state_v1', 'duofinance_state'];
          for (const legKey of legacyKeys) {
            const rawLeg = localStorage.getItem(legKey);
            if (rawLeg) {
              try {
                const legObj = JSON.parse(rawLeg) as FinanceState;
                if (legObj.transactions?.length > 0 || legObj.cards?.length > 0) {
                  saved = rawLeg;
                  localStorage.setItem(userKey, rawLeg);
                  break;
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }

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
  };

  const [state, setState] = useState<FinanceState>(() =>
    loadStateForSession(session)
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(
    getCurrentYearMonth()
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [preselectedCardId, setPreselectedCardId] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isLgpdModalOpen, setIsLgpdModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [deleteCardsOnReset, setDeleteCardsOnReset] = useState(false);
  const [resetCategoriesAndMembers, setResetCategoriesAndMembers] =
    useState(false);
  const [lgpdAcceptedAt, setLgpdAcceptedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LGPD_CONSENT_KEY);
    } catch {
      return null;
    }
  });

  // Barra de Lançamento Rápido Inteligente
  const [quickText, setQuickText] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  // Sincronização na Nuvem (Neon PostgreSQL)
  const [cloudStatus, setCloudStatus] = useState<'connecting' | 'synced' | 'saving' | 'offline'>('connecting');
  const isInitialCloudLoadDone = useRef(false);
  const skipNextCloudSave = useRef(false);

  const syncFromCloud = async (activeSession?: AuthSession | null) => {
    const currentSession = activeSession !== undefined ? activeSession : session;
    if (!currentSession) return;
    try {
      setCloudStatus('connecting');
      const currentStoreKey = getStoreKeyForUser(currentSession.user);
      const { state: remoteState } = await loadCloudFinanceState(currentStoreKey);

      const remoteHasData = remoteState && (remoteState.transactions?.length > 0 || remoteState.cards?.length > 0);
      const localState = loadStateForSession(currentSession);
      const localHasData = localState && (localState.transactions?.length > 0 || localState.cards?.length > 0);

      if (remoteHasData) {
        // Nuvem já possui dados para este usuário específico -> carrega na tela
        skipNextCloudSave.current = true;
        setState(remoteState);
        const userKey = getUserLocalStorageStateKey(currentSession.user);
        try {
          localStorage.setItem(userKey, JSON.stringify(remoteState));
        } catch {
          // ignore
        }
      } else if (currentSession.user.role === 'ROOT' && localHasData) {
        // Auto-recuperação do ROOT: se a nuvem estiver vazia mas o local tiver dados legados recuperados, restaura na nuvem!
        skipNextCloudSave.current = true;
        setState(localState);
        await saveCloudFinanceState(localState, currentStoreKey);
      } else if (remoteState) {
        // Nuvem existe com estado inicial
        skipNextCloudSave.current = true;
        setState(remoteState);
      } else {
        // Usuário novo não possui store na nuvem ainda.
        // Garante que o usuário novo SEMPRE inicie com estado limpo (sem herdar dados alheios)!
        const initialClean = createInitialFinanceState(currentSession.user.name.split(' ')[0]);
        skipNextCloudSave.current = true;
        setState(initialClean);
        await saveCloudFinanceState(initialClean, currentStoreKey);
        const userKey = getUserLocalStorageStateKey(currentSession.user);
        try {
          localStorage.setItem(userKey, JSON.stringify(initialClean));
        } catch {
          // ignore
        }
      }
      isInitialCloudLoadDone.current = true;
      setCloudStatus('synced');
    } catch (err) {
      console.error('Erro ao sincronizar com Neon Cloud DB:', err);
      isInitialCloudLoadDone.current = true;
      setCloudStatus('offline');
    }
  };

  useEffect(() => {
    if (session) {
      isInitialCloudLoadDone.current = false;
      skipNextCloudSave.current = true;
      setState(loadStateForSession(session));
      syncFromCloud(session);
    } else {
      setState(createInitialFinanceState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;
    try {
      const userKey = getUserLocalStorageStateKey(session.user);
      localStorage.setItem(userKey, JSON.stringify(state));
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
    }

    if (!isInitialCloudLoadDone.current) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCloudStatus('saving');
        const currentStoreKey = getStoreKeyForUser(session.user);
        await saveCloudFinanceState(state, currentStoreKey);
        setCloudStatus('synced');
      } catch (err) {
        console.error('Erro ao salvar estado no Neon Cloud DB:', err);
        setCloudStatus('offline');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [state, session]);

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
    const date = today;
    const card = state.cards.find((c) => c.id === quickPreview.cardId);
    const firstComp =
      quickPreview.installments > 1
        ? computeFirstCompetenceMonth(date, quickPreview.paymentMethod, card)
        : selectedMonth;

    const groupId = `grp-quick-${Date.now()}`;
    const newTxs: Transaction[] = [];
    const perInstallment =
      quickPreview.amount / Math.max(1, quickPreview.installments);
    const piiScan = detectPII(quickPreview.description);
    const safeQuickDesc = piiScan.hasPII
      ? piiScan.sanitizedText
      : quickPreview.description;

    const isIndiv = quickPreview.splitType === 'individual';
    const allMemberIds = state.members.map((m) => m.id);

    for (let i = 1; i <= quickPreview.installments; i++) {
      newTxs.push({
        id: `tx-q-${Date.now()}-${i}`,
        groupId: quickPreview.installments > 1 ? groupId : undefined,
        description: safeQuickDesc,
        amount: perInstallment,
        totalPurchaseAmount:
          quickPreview.installments > 1 ? quickPreview.amount : undefined,
        date,
        competenceMonth: addMonths(firstComp, i - 1),
        type: 'expense',
        categoryId: quickPreview.categoryId,
        paymentMethod: quickPreview.paymentMethod,
        cardId: quickPreview.cardId,
        paidById: quickPreview.paidById,
        usedById: quickPreview.paidById,
        beneficiaryId: isIndiv ? quickPreview.paidById : undefined,
        splitType: quickPreview.splitType,
        splitCount: isIndiv ? 1 : Math.max(2, allMemberIds.length),
        participantIds: isIndiv ? [quickPreview.paidById] : allMemberIds,
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
      transactions: [...prev.transactions, ...newTxs],
    }));

    setQuickText('');
    setQuickFeedback(
      `Lançado: ${safeQuickDesc} (${
        quickPreview.installments > 1
          ? `${quickPreview.installments}x de ${formatCurrency(perInstallment)}`
          : formatCurrency(quickPreview.amount)
      })`
    );
    setTimeout(() => setQuickFeedback(null), 4000);
  };

  const handleSaveTransactions = (
    savedTxs: Transaction[],
    meta?: SaveTransactionsMeta
  ) => {
    setState((prev) => {
      if (meta?.replaceGroupId) {
        const remaining = prev.transactions.filter(
          (t) =>
            t.groupId !== meta.replaceGroupId &&
            (!meta.replaceTxId || t.id !== meta.replaceTxId)
        );
        return {
          ...prev,
          transactions: [...remaining, ...savedTxs],
        };
      }

      if (meta?.replaceTxId) {
        if (savedTxs.length === 1) {
          return {
            ...prev,
            transactions: prev.transactions.map((t) =>
              t.id === meta.replaceTxId ? savedTxs[0] : t
            ),
          };
        }
        const remaining = prev.transactions.filter(
          (t) => t.id !== meta.replaceTxId
        );
        return {
          ...prev,
          transactions: [...remaining, ...savedTxs],
        };
      }

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
        transactions: [...prev.transactions, ...savedTxs],
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

  const handleUpdateCard = (updatedCard: CreditCard) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === updatedCard.id ? updatedCard : c
      ),
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

  const handleDeleteMember = (memberId: string) => {
    const member = state.members.find((m) => m.id === memberId);
    if (
      !window.confirm(
        `Deseja remover o participante "${member?.name || ''}" da divisão?`
      )
    ) {
      return;
    }
    setState((prev) => {
      const remainingMembers = prev.members.filter((m) => m.id !== memberId);
      const fallbackMemberId = remainingMembers[0]?.id || 'm1';

      const updatedCards = prev.cards.map((c) =>
        c.holderId === memberId ? { ...c, holderId: fallbackMemberId } : c
      );

      const updatedTxs = prev.transactions.map((t) => {
        const nextPaidBy =
          t.paidById === memberId ? fallbackMemberId : t.paidById;
        const nextUsedBy =
          t.usedById === memberId ? fallbackMemberId : t.usedById;
        const nextBeneficiary =
          t.beneficiaryId === memberId ? fallbackMemberId : t.beneficiaryId;
        const nextParticipants = t.participantIds
          ? t.participantIds
              .map((id) => (id === memberId ? fallbackMemberId : id))
              .filter((id, idx, arr) => arr.indexOf(id) === idx)
          : undefined;
        return {
          ...t,
          paidById: nextPaidBy,
          usedById: nextUsedBy,
          beneficiaryId: nextBeneficiary,
          participantIds: nextParticipants,
        };
      });

      const updatedSettlements = prev.settlements.filter(
        (s) => s.fromMemberId !== memberId && s.toMemberId !== memberId
      );

      return {
        ...prev,
        members: remainingMembers,
        cards: updatedCards,
        transactions: updatedTxs,
        settlements: updatedSettlements,
      };
    });
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

  const handleDeleteCategory = (categoryId: string) => {
    const cat = state.categories.find((c) => c.id === categoryId);
    if (
      !window.confirm(
        `Deseja excluir a categoria "${cat?.name || ''}"?`
      )
    ) {
      return;
    }
    setState((prev) => {
      const remainingCategories = prev.categories.filter(
        (c) => c.id !== categoryId
      );
      const fallbackCat =
        remainingCategories.find((c) => c.type === cat?.type) ||
        remainingCategories[0];
      const fallbackCatId = fallbackCat?.id || 'cat-outros';

      return {
        ...prev,
        categories: remainingCategories,
        transactions: prev.transactions.map((t) =>
          t.categoryId === categoryId ? { ...t, categoryId: fallbackCatId } : t
        ),
      };
    });
  };

  const handleLogout = () => {
    clearCurrentSession();
    setSession(null);
    setState(createInitialFinanceState());
  };

  const handleResetDemo = () => {
    setDeleteCardsOnReset(false);
    setResetCategoriesAndMembers(false);
    setIsResetModalOpen(true);
  };

  const confirmResetData = () => {
    const fresh = createInitialFinanceState();
    setState((prev) => ({
      ...fresh,
      cards: deleteCardsOnReset ? [] : prev.cards,
      categories: resetCategoriesAndMembers ? fresh.categories : prev.categories,
      members: resetCategoriesAndMembers ? fresh.members : prev.members,
      transactions: [],
      settlements: [],
    }));
    setSelectedMonth(getCurrentYearMonth());
    setIsResetModalOpen(false);
  };

  if (!session) {
    return (
      <AuthModal
        onLoginSuccess={(newSession) => {
          setSession(newSession);
          setState(loadStateForSession(newSession));
        }}
      />
    );
  }

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
              onClick={() => syncFromCloud()}
              title="Sincronizado com banco de dados na nuvem (Neon PostgreSQL) — clique para atualizar"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                cloudStatus === 'synced'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : cloudStatus === 'saving' || cloudStatus === 'connecting'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {cloudStatus === 'saving' || cloudStatus === 'connecting' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {cloudStatus === 'synced'
                  ? 'Nuvem Ativa'
                  : cloudStatus === 'saving'
                  ? 'Salvando...'
                  : cloudStatus === 'connecting'
                  ? 'Conectando...'
                  : 'Local'}
              </span>
            </button>

            <button
              onClick={() => setIsLgpdModalOpen(true)}
              title="Governança LGPD & DLP Guardian Ativo"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">LGPD</span>
            </button>

            <button
              onClick={() => setIsImportExportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Importar / Exportar</span>
            </button>

            <button
              onClick={handleResetDemo}
              title="Restaurar / Limpar lançamentos (com opção de manter cartões)"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setEditingTx(null);
                setPreselectedCardId(null);
                setIsTxModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Gasto</span>
            </button>

            {/* Perfil do Usuário Logado & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {session.user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {session.user.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        session.user.role === 'ROOT'
                          ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
                          : 'text-slate-300 bg-slate-800'
                      }`}
                    >
                      {session.user.role}
                    </span>
                  </div>
                </div>
              </div>

              {session.user.role === 'ROOT' && (
                <button
                  type="button"
                  onClick={() => setIsUsersModalOpen(true)}
                  title="Gerenciar Usuários (Painel ROOT)"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 transition"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                title="Sair da Conta (Logout)"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
            <LgpdDlpBanner
              text={quickText}
              onApplyMask={(masked: string) => setQuickText(masked)}
              className="mt-2"
            />
            {quickFeedback && (
              <div className="mt-1.5 text-right text-[11px] text-emerald-400 font-medium">
                ✓ {quickFeedback}
              </div>
            )}
          </form>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-8">
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
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onPayCardInvoice={handlePayCardInvoice}
            onOpenNewTransactionWithCard={(cardId) => {
              setEditingTx(null);
              setPreselectedCardId(cardId);
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
            onPayCardInvoice={handlePayCardInvoice}
            onUpdateMember={handleUpdateMember}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
            onAddSettlement={handleAddSettlement}
            onDeleteSettlement={handleDeleteSettlement}
            onUpdateTransaction={(updatedTx) => {
              setState((prev) => ({
                ...prev,
                transactions: prev.transactions.map((t) =>
                  t.id === updatedTx.id ? updatedTx : t
                ),
              }));
            }}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setPreselectedCardId(null);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
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
              setPreselectedCardId(null);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onTogglePaid={handleTogglePaid}
            onOpenNewModal={() => {
              setEditingTx(null);
              setPreselectedCardId(null);
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
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </main>

      {/* Modais */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
          setPreselectedCardId(null);
        }}
        onSaveTransactions={handleSaveTransactions}
        onAddCategory={handleAddCategory}
        onAddMember={handleAddMember}
        categories={state.categories}
        cards={state.cards}
        members={state.members}
        selectedMonth={selectedMonth}
        editingTransaction={editingTx}
        preselectedCardId={preselectedCardId}
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
        onRestoreBackup={(restored) => {
          setState((prev) => {
            if (prev.cards.length > 0) {
              const shouldEraseCurrentCards = window.confirm(
                `Você possui ${prev.cards.length} cartão(ões) cadastrado(s) atualmente.\n\nClique em "Cancelar" para MANTER seus cartões atuais junto com o backup, ou "OK" se desejar apagar/substituir os cartões atuais pelos do arquivo.`
              );
              if (!shouldEraseCurrentCards) {
                const restoredCards = restored.cards || [];
                const mergedCards = [
                  ...prev.cards,
                  ...restoredCards.filter(
                    (rc) => !prev.cards.some((pc) => pc.id === rc.id)
                  ),
                ];
                return {
                  ...restored,
                  cards: mergedCards,
                };
              }
            }
            return restored;
          });
        }}
      />

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Restaurar / Zerar Dados do Sistema
                  </h3>
                  <p className="text-xs text-slate-400">
                    Escolha o que deseja limpar. Por padrão, seus cartões cadastrados são preservados!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Opção Principal: Cartões */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-violet-400" />
                    O que fazer com os Cartões de Crédito ({state.cards.length}{' '}
                    cadastrado{state.cards.length === 1 ? '' : 's'})?
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !deleteCardsOnReset
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {!deleteCardsOnReset
                      ? 'Cartões Protegidos'
                      : 'Cartões Serão Apagados'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteCardsOnReset(false)}
                    className={`p-3 rounded-xl border text-left transition ${
                      !deleteCardsOnReset
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      ✓ Manter meus cartões cadastrados (Recomendado)
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Limpa apenas o extrato de gastos, preservando seus cartões e limites.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteCardsOnReset(true)}
                    className={`p-3 rounded-xl border text-left transition ${
                      deleteCardsOnReset
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      Apagar também todos os cartões
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Remove todos os {state.cards.length} cartões cadastrados junto com os lançamentos.
                    </div>
                  </button>
                </div>

                {state.cards.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1">
                    Cartões atuais:{' '}
                    <strong className="text-slate-200">
                      {state.cards.map((c) => c.name).join(', ')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Opção Secundária: Categorias e Membros */}
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={resetCategoriesAndMembers}
                  onChange={(e) =>
                    setResetCategoriesAndMembers(e.target.checked)
                  }
                  className="accent-emerald-500 w-4 h-4 rounded"
                />
                <span>
                  Restaurar também categorias personalizadas e rendas dos membros para o padrão inicial
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                  deleteCardsOnReset
                    ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {deleteCardsOnReset
                  ? 'Zerar Tudo (Incluindo Cartões)'
                  : 'Zerar Lançamentos (Manter Cartões)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Zona do Polegar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-1.5 flex items-center justify-around sm:hidden shadow-2xl safe-area-pb">
        {[
          { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
          { id: 'cards', label: 'Cartões', icon: CreditCardIcon },
          { id: 'transactions', label: 'Extrato', icon: ListOrdered },
          { id: 'shared', label: 'Divisão', icon: Users },
          { id: 'budgets', label: 'Metas', icon: Target },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
        {/* Botão de Adição Rápida (+ Novo Gasto) ao alcance do polegar */}
        <button
          onClick={() => {
            setEditingTx(null);
            setPreselectedCardId(null);
            setIsTxModalOpen(true);
          }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 active:scale-95 transition"
          title="Novo Gasto"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

      {/* Modal de Gestão de Usuários (Painel ROOT) */}
      <UsersManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        currentUser={session.user}
      />

      <LgpdConsentModal
        isOpen={isLgpdModalOpen}
        userName={state.members[0]?.name || 'Denner'}
        acceptedAt={lgpdAcceptedAt}
        onClose={() => setIsLgpdModalOpen(false)}
        onConsentAccepted={() => {
          const now = new Date().toISOString();
          setLgpdAcceptedAt(now);
          try {
            localStorage.setItem(LGPD_CONSENT_KEY, now);
          } catch {
            // ignore
          }
          setIsLgpdModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
