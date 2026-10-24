import React, { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  Calendar,
  Check,
  CreditCard as CreditCardIcon,
  DollarSign,
  Layers,
  Plus,
  Repeat,
  Tag,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Category,
  CreditCard,
  Member,
  PaymentMethod,
  SplitType,
  Transaction,
  TransactionType,
} from '../types/finance';
import {
  addMonths,
  calculateTransactionShares,
  computeFirstCompetenceMonth,
  formatCurrency,
  formatMonthLabel,
  getTodayISO,
  parseExactNumber,
} from '../utils/financeUtils';
import { detectPII } from '../utils/lgpd';
import { LgpdDlpBanner } from './LgpdDlpBanner';

export interface SaveTransactionsMeta {
  replaceTxId?: string;
  replaceGroupId?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransactions: (
    newTransactions: Transaction[],
    meta?: SaveTransactionsMeta
  ) => void;
  onAddCategory?: (category: Category) => void;
  onAddMember?: (member: Member) => void;
  categories: Category[];
  cards: CreditCard[];
  members: Member[];
  selectedMonth: string;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSaveTransactions,
  onAddCategory,
  onAddMember,
  categories,
  cards,
  members,
  selectedMonth,
  editingTransaction,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatColor, setInlineCatColor] = useState('#10b981');

  const [showInlineMember, setShowInlineMember] = useState(false);
  const [inlineMemberName, setInlineMemberName] = useState('');
  const [inlineMemberIncome, setInlineMemberIncome] = useState('0');

  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [amountMode, setAmountMode] = useState<'total' | 'installment'>('total');
  const [date, setDate] = useState(getTodayISO());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [paidById, setPaidById] = useState('');
  const [usedById, setUsedById] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('shared_equal');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [customSplitsMap, setCustomSplitsMap] = useState<Record<string, number>>({});
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(6);
  const [isPaid, setIsPaid] = useState(false);
  const [applyToAllInstallments, setApplyToAllInstallments] = useState(true);

  // Proteção QA contra reset de inputs durante sincronização em background
  const prevOpenRef = useRef(false);
  const prevEditingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentEditingId = editingTransaction?.id || null;
    const justOpened = isOpen && !prevOpenRef.current;
    const switchedTx = isOpen && currentEditingId !== prevEditingIdRef.current;

    prevOpenRef.current = isOpen;
    prevEditingIdRef.current = currentEditingId;

    if (!justOpened && !switchedTx) return;

    const allMemberIds = members.map((m) => m.id);

    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmountInput(String(editingTransaction.amount));
      setAmountMode('installment');
      setDate(editingTransaction.date);
      setCategoryId(editingTransaction.categoryId);
      setPaymentMethod(editingTransaction.paymentMethod);
      setCardId(editingTransaction.cardId || cards[0]?.id || '');
      setInstallments(editingTransaction.installmentTotal || 1);
      setPaidById(editingTransaction.paidById);
      const initialUsedBy =
        editingTransaction.usedById ||
        editingTransaction.beneficiaryId ||
        editingTransaction.paidById ||
        members[0]?.id ||
        '';
      setUsedById(initialUsedBy);
      setSplitType(editingTransaction.splitType);
      setBeneficiaryId(initialUsedBy);

      const savedParticipants =
        editingTransaction.participantIds &&
        editingTransaction.participantIds.length > 0
          ? editingTransaction.participantIds
          : editingTransaction.splitType === 'individual'
          ? [initialUsedBy]
          : allMemberIds;
      setParticipantIds(savedParticipants);

      const savedSplitCount =
        editingTransaction.splitCount && editingTransaction.splitCount > 0
          ? editingTransaction.splitCount
          : editingTransaction.splitType === 'individual'
          ? 1
          : Math.max(2, savedParticipants.length);
      setSplitCount(savedSplitCount);

      if (editingTransaction.customSplits) {
        setCustomSplitsMap(editingTransaction.customSplits);
      } else {
        const equalPct = Number((100 / Math.max(1, allMemberIds.length)).toFixed(2));
        const initMap: Record<string, number> = {};
        allMemberIds.forEach((id) => {
          initMap[id] = equalPct;
        });
        setCustomSplitsMap(initMap);
      }

      setIsRecurring(Boolean(editingTransaction.isRecurring));
      setRecurringMonths(1);
      setIsPaid(editingTransaction.isPaid);
      setApplyToAllInstallments(true);
    } else {
      setType('expense');
      setDescription('');
      setAmountInput('');
      setAmountMode('total');
      const today = getTodayISO();
      const defaultDate = today.startsWith(selectedMonth)
        ? today
        : `${selectedMonth}-10`;
      setDate(defaultDate);
      const firstExpCat = categories.find((c) => c.type !== 'income');
      setCategoryId(firstExpCat?.id || categories[0]?.id || '');
      const defaultCard = cards[0];
      setPaymentMethod(defaultCard ? 'credit_card' : 'pix');
      setCardId(defaultCard?.id || '');
      setInstallments(1);
      const initialOwner = defaultCard?.holderId || members[0]?.id || '';
      setPaidById(initialOwner);
      setUsedById(initialOwner);
      setSplitType('shared_equal');
      setSplitCount(Math.max(2, allMemberIds.length));
      setParticipantIds(allMemberIds);
      setBeneficiaryId(initialOwner);

      const equalPct = Number((100 / Math.max(1, allMemberIds.length)).toFixed(2));
      const initMap: Record<string, number> = {};
      allMemberIds.forEach((id) => {
        initMap[id] = equalPct;
      });
      setCustomSplitsMap(initMap);

      setIsRecurring(false);
      setRecurringMonths(6);
      setIsPaid(false);
      setApplyToAllInstallments(true);
    }
  }, [isOpen, editingTransaction, categories, cards, members, selectedMonth]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  const selectedCard = cards.find((c) => c.id === cardId);
  const numericAmount = parseExactNumber(amountInput);

  const effectiveInstallments =
    type === 'expense' && paymentMethod === 'credit_card' ? installments : 1;

  const perInstallmentAmount =
    effectiveInstallments > 1
      ? amountMode === 'total'
        ? numericAmount / effectiveInstallments
        : numericAmount
      : numericAmount;

  const totalPurchaseValue =
    effectiveInstallments > 1
      ? amountMode === 'total'
        ? numericAmount
        : numericAmount * effectiveInstallments
      : numericAmount;

  const firstCompetence = computeFirstCompetenceMonth(
    date,
    paymentMethod,
    selectedCard
  );

  const activeParticipantIds =
    participantIds.length > 0 ? participantIds : members.map((m) => m.id);

  // Construção de transação prévia para exibir a memória de cálculo exata em tempo real no modal
  const effectiveBeneficiary =
    type === 'income'
      ? paidById
      : splitType === 'individual'
      ? beneficiaryId || usedById || paidById
      : undefined;

  const effectiveUsedBy =
    type === 'expense' ? usedById || beneficiaryId || paidById : paidById;

  const previewTransaction: Transaction = {
    id: 'preview',
    description: description || 'Prévia',
    amount: perInstallmentAmount > 0 ? perInstallmentAmount : 0,
    totalPurchaseAmount: totalPurchaseValue > 0 ? totalPurchaseValue : undefined,
    date,
    competenceMonth: firstCompetence,
    type,
    categoryId: categoryId || filteredCategories[0]?.id || '',
    paymentMethod,
    cardId: paymentMethod === 'credit_card' ? cardId : undefined,
    paidById,
    usedById: effectiveUsedBy,
    splitType: type === 'income' ? 'individual' : splitType,
    splitCount: Math.max(1, splitCount),
    participantIds:
      splitType === 'individual'
        ? [effectiveBeneficiary || paidById]
        : activeParticipantIds,
    beneficiaryId: effectiveBeneficiary,
    customSplits: splitType === 'shared_custom' ? customSplitsMap : undefined,
    isPaid,
  };

  const liveShares = calculateTransactionShares(previewTransaction, members);
  const effectiveDivisor =
    splitType === 'individual'
      ? Math.max(1, splitCount)
      : Math.max(splitCount, activeParticipantIds.length, 1);
  const valuePerPersonInInstallment =
    perInstallmentAmount > 0 ? perInstallmentAmount / effectiveDivisor : 0;

  const handleCardChange = (newCardId: string) => {
    setCardId(newCardId);
    const card = cards.find((c) => c.id === newCardId);
    if (card) {
      setPaidById(card.holderId);
    }
  };

  const handleSelectPeopleCount = (count: number) => {
    const safeCount = Math.max(1, count);
    setSplitCount(safeCount);
    if (safeCount === 1) {
      setSplitType('individual');
      const target = beneficiaryId || usedById || paidById || members[0]?.id || '';
      setBeneficiaryId(target);
      setParticipantIds(target ? [target] : []);
    } else {
      if (splitType === 'individual') {
        setSplitType('shared_equal');
      }
      if (participantIds.length < 2) {
        setParticipantIds(members.slice(0, safeCount).map((m) => m.id));
      }
    }
  };

  const toggleParticipant = (memberId: string) => {
    const exists = activeParticipantIds.includes(memberId);
    let next: string[];
    if (exists) {
      if (activeParticipantIds.length <= 1) return; // manter ao menos 1 participante
      next = activeParticipantIds.filter((id) => id !== memberId);
    } else {
      next = [...activeParticipantIds, memberId];
    }
    setParticipantIds(next);
    if (next.length === 1) {
      setSplitType('individual');
      setSplitCount(1);
      setBeneficiaryId(next[0]);
      setUsedById(next[0]);
    } else {
      if (splitType === 'individual') {
        setSplitType('shared_equal');
      }
      setSplitCount(Math.max(next.length, splitCount));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || numericAmount <= 0) return;

    // Higienização LGPD caso ainda haja PII na descrição
    const piiScan = detectPII(description.trim());
    const cleanDescription = piiScan.hasPII
      ? piiScan.sanitizedText
      : description.trim();

    const customSplits: Record<string, number> | undefined =
      splitType === 'shared_custom' ? customSplitsMap : undefined;

    const finalParticipantIds =
      splitType === 'individual'
        ? [effectiveBeneficiary || paidById]
        : activeParticipantIds;

    const finalSplitCount =
      splitType === 'individual'
        ? Math.max(1, splitCount)
        : Math.max(splitCount, finalParticipantIds.length, 1);

    // Se estamos editando apenas esta parcela isolada (sem recriar parcelamento e sem projetar novos meses recorrentes)
    if (
      editingTransaction &&
      !applyToAllInstallments &&
      effectiveInstallments === (editingTransaction.installmentTotal || 1) &&
      !(isRecurring && recurringMonths > 1)
    ) {
      const updated: Transaction = {
        ...editingTransaction,
        type,
        description: cleanDescription,
        amount: perInstallmentAmount,
        totalPurchaseAmount:
          effectiveInstallments > 1 ? totalPurchaseValue : undefined,
        date,
        categoryId: categoryId || filteredCategories[0]?.id || '',
        paymentMethod,
        cardId: paymentMethod === 'credit_card' ? cardId : undefined,
        paidById,
        usedById: effectiveUsedBy,
        splitType: type === 'income' ? 'individual' : splitType,
        splitCount: finalSplitCount,
        participantIds: finalParticipantIds,
        beneficiaryId: effectiveBeneficiary,
        customSplits,
        isRecurring,
        isPaid: paymentMethod === 'credit_card' ? isPaid : true,
      };
      onSaveTransactions([updated], { replaceTxId: editingTransaction.id });
      onClose();
      return;
    }

    const baseGroupId = editingTransaction?.groupId || `grp-${Date.now()}`;
    const generated: Transaction[] = [];

    if (effectiveInstallments > 1) {
      for (let i = 1; i <= effectiveInstallments; i++) {
        const compMonth = addMonths(firstCompetence, i - 1);
        generated.push({
          id:
            editingTransaction && i === (editingTransaction.installmentCurrent || 1)
              ? editingTransaction.id
              : `tx-${Date.now()}-${i}`,
          groupId: baseGroupId,
          description: cleanDescription,
          amount: perInstallmentAmount,
          totalPurchaseAmount: totalPurchaseValue,
          date,
          competenceMonth: compMonth,
          type,
          categoryId: categoryId || filteredCategories[0]?.id || '',
          paymentMethod,
          cardId: paymentMethod === 'credit_card' ? cardId : undefined,
          paidById,
          usedById: effectiveUsedBy,
          splitType,
          splitCount: finalSplitCount,
          participantIds: finalParticipantIds,
          beneficiaryId: effectiveBeneficiary,
          customSplits,
          installmentCurrent: i,
          installmentTotal: effectiveInstallments,
          isRecurring: false,
          isPaid: editingTransaction ? editingTransaction.isPaid && i === 1 : false,
        });
      }
    } else if (isRecurring && recurringMonths > 1) {
      for (let i = 0; i < recurringMonths; i++) {
        const compMonth = addMonths(firstCompetence, i);
        generated.push({
          id:
            editingTransaction && i === 0
              ? editingTransaction.id
              : `tx-${Date.now()}-rec-${i}`,
          groupId: baseGroupId,
          description: cleanDescription,
          amount: perInstallmentAmount,
          date,
          competenceMonth: compMonth,
          type,
          categoryId: categoryId || filteredCategories[0]?.id || '',
          paymentMethod,
          cardId: paymentMethod === 'credit_card' ? cardId : undefined,
          paidById,
          usedById: effectiveUsedBy,
          splitType: type === 'income' ? 'individual' : splitType,
          splitCount: finalSplitCount,
          participantIds: finalParticipantIds,
          beneficiaryId: effectiveBeneficiary,
          customSplits,
          isRecurring: true,
          isPaid:
            i === 0 ? (paymentMethod === 'credit_card' ? isPaid : true) : false,
        });
      }
    } else {
      generated.push({
        id: editingTransaction ? editingTransaction.id : `tx-${Date.now()}`,
        description: cleanDescription,
        amount: perInstallmentAmount,
        date,
        competenceMonth: editingTransaction
          ? editingTransaction.competenceMonth
          : firstCompetence,
        type,
        categoryId: categoryId || filteredCategories[0]?.id || '',
        paymentMethod,
        cardId: paymentMethod === 'credit_card' ? cardId : undefined,
        paidById,
        usedById: effectiveUsedBy,
        splitType: type === 'income' ? 'individual' : splitType,
        splitCount: finalSplitCount,
        participantIds: finalParticipantIds,
        beneficiaryId: effectiveBeneficiary,
        customSplits,
        isRecurring,
        isPaid: paymentMethod === 'credit_card' ? isPaid : true,
      });
    }

    onSaveTransactions(generated, {
      replaceTxId: editingTransaction?.id,
      replaceGroupId:
        editingTransaction?.groupId && applyToAllInstallments
          ? editingTransaction.groupId
          : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <h2 className="text-lg font-semibold text-white">
            {editingTransaction
              ? 'Alterar Lançamento Financeiro'
              : 'Novo Lançamento Financeiro'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
        >
          {/* Tipo Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const expCat = categories.find((c) => c.type !== 'income');
                if (expCat) setCategoryId(expCat.id);
              }}
              className={`py-2.5 rounded-lg text-sm font-medium transition ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despesa / Compra
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setPaymentMethod('pix');
                const incCat = categories.find((c) => c.type !== 'expense');
                if (incCat) setCategoryId(incCat.id);
              }}
              className={`py-2.5 rounded-lg text-sm font-medium transition ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receita / Entrada
            </button>
          </div>

          {/* Descrição e Data */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, TV Samsung, Jantar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Data da Compra
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Guardião LGPD (DLP) em tempo real */}
            <LgpdDlpBanner
              text={description}
              onApplyMask={(masked) => setDescription(masked)}
            />
          </div>

          {/* Valor e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                {effectiveInstallments > 1 && amountMode === 'total'
                  ? 'Valor Total da Compra (R$)'
                  : effectiveInstallments > 1
                  ? `Valor de Cada Parcela (1/${effectiveInstallments}) (R$)`
                  : 'Valor (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 h-5">
                <label className="block text-xs font-medium text-slate-400">
                  <Tag className="w-3.5 h-3.5 inline mr-1" />
                  Categoria
                </label>
                {onAddCategory && (
                  <button
                    type="button"
                    onClick={() => setShowInlineCat(!showInlineCat)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Nova categoria
                  </button>
                )}
              </div>
              {showInlineCat ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={inlineCatColor}
                    onChange={(e) => setInlineCatColor(e.target.value)}
                    className="h-9 w-9 bg-slate-950 border border-slate-800 rounded-lg p-1 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!inlineCatName.trim() || !onAddCategory) return;
                      const created: Category = {
                        id: `cat-${Date.now()}`,
                        name: inlineCatName.trim(),
                        icon: 'Tag',
                        color: inlineCatColor,
                        type,
                        monthlyBudget: 0,
                        essentialType: type === 'expense' ? 'needs' : 'savings',
                      };
                      onAddCategory(created);
                      setCategoryId(created.id);
                      setInlineCatName('');
                      setShowInlineCat(false);
                    }}
                    className="px-3 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold shrink-0"
                  >
                    Criar
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Forma de Pagamento & Cartão */}
          {type === 'expense' && (
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                    Método de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="pix">Pix</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>

                {paymentMethod === 'credit_card' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                      <CreditCardIcon className="w-3.5 h-3.5 inline mr-1" />
                      Qual Cartão?
                    </label>
                    <select
                      value={cardId}
                      onChange={(e) => handleCardChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Fecha dia {c.closingDay})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                      Quem realizou o pagamento?
                    </label>
                    <select
                      value={paidById}
                      onChange={(e) => {
                        setPaidById(e.target.value);
                        setUsedById(e.target.value);
                        setBeneficiaryId(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Dono do Cartão vs Pessoa que Utilizou o Cartão */}
              {paymentMethod === 'credit_card' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Dono do Cartão (Quem Paga a Fatura)
                    </label>
                    <select
                      value={paidById}
                      onChange={(e) => setPaidById(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          Dono do Cartão: {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-300 mb-1.5">
                      Quem Utilizou o Cartão nesta compra?
                    </label>
                    <select
                      value={usedById || beneficiaryId || paidById}
                      onChange={(e) => {
                        const newUser = e.target.value;
                        setUsedById(newUser);
                        setBeneficiaryId(newUser);
                        if (newUser !== paidById) {
                          setSplitType('individual');
                          setSplitCount(1);
                          setParticipantIds([newUser]);
                        }
                      }}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          Utilizado por: {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Parcelamento no Cartão */}
              {paymentMethod === 'credit_card' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                        <Layers className="w-3.5 h-3.5 inline mr-1" />
                        Parcelamento
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setInstallments(val);
                          if (val > 1) setIsRecurring(false);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1x à vista</option>
                        {[
                          2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24,
                        ].map((n) => (
                          <option key={n} value={n}>
                            {n}x sem juros
                          </option>
                        ))}
                      </select>
                    </div>

                    {installments > 1 && (
                      <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (amountMode === 'installment' && numericAmount > 0) {
                              setAmountInput(
                                String(
                                  Number((numericAmount * installments).toFixed(2))
                                )
                              );
                            }
                            setAmountMode('total');
                          }}
                          className={`flex-1 py-2 px-2 rounded-lg font-medium transition ${
                            amountMode === 'total'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Valor Digitado = Total
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (amountMode === 'total' && numericAmount > 0) {
                              setAmountInput(
                                String(
                                  Number((numericAmount / installments).toFixed(2))
                                )
                              );
                            }
                            setAmountMode('installment');
                          }}
                          className={`flex-1 py-2 px-2 rounded-lg font-medium transition ${
                            amountMode === 'installment'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Valor Digitado = Parcela
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dois campos sincronizados quando parcelado para zero erro de cálculo */}
                  {installments > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 p-3 rounded-xl border border-violet-500/30">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Valor Total da Compra ({installments}x)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={
                            amountMode === 'total'
                              ? amountInput
                              : totalPurchaseValue > 0
                              ? Number(totalPurchaseValue.toFixed(2))
                              : ''
                          }
                          onChange={(e) => {
                            setAmountMode('total');
                            setAmountInput(e.target.value);
                          }}
                          placeholder="0,00"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-violet-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-violet-300 font-semibold mb-1">
                          Valor de Cada Parcela Mensal (1/{installments})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={
                            amountMode === 'installment'
                              ? amountInput
                              : perInstallmentAmount > 0
                              ? Number(perInstallmentAmount.toFixed(2))
                              : ''
                          }
                          onChange={(e) => {
                            setAmountMode('installment');
                            setAmountInput(e.target.value);
                          }}
                          placeholder="0,00"
                          className="w-full bg-slate-950 border border-violet-500/50 rounded-lg px-3 py-1.5 text-xs font-bold text-violet-200 focus:outline-none focus:border-violet-400"
                        />
                      </div>
                    </div>
                  )}

                  {editingTransaction &&
                    (editingTransaction.installmentTotal || 1) > 1 && (
                      <label className="flex items-center gap-2 text-xs text-violet-200 bg-violet-500/10 border border-violet-500/30 px-3 py-2 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyToAllInstallments}
                          onChange={(e) =>
                            setApplyToAllInstallments(e.target.checked)
                          }
                          className="accent-violet-500 w-4 h-4"
                        />
                        <span>
                          Aplicar esta alteração em todas as parcelas desta compra (
                          {editingTransaction.installmentCurrent}/
                          {editingTransaction.installmentTotal})
                        </span>
                      </label>
                    )}

                  {numericAmount > 0 && (
                    <div className="text-xs bg-violet-500/10 border border-violet-500/25 text-violet-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
                      <span>
                        1ª fatura:{' '}
                        <strong>{formatMonthLabel(firstCompetence)}</strong>
                      </span>
                      <span>
                        {installments > 1 ? (
                          <>
                            <strong>{installments}x</strong> de{' '}
                            <strong>
                              {formatCurrency(perInstallmentAmount)}
                            </strong>{' '}
                            (Total: {formatCurrency(totalPurchaseValue)})
                          </>
                        ) : (
                          <>À vista: {formatCurrency(numericAmount)}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divisão da Parcela & Quantas Pessoas Vão Pagar */}
          {type === 'expense' ? (
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Quantas pessoas vão pagar / dividir esta parcela?
                </label>
                {onAddMember && (
                  <button
                    type="button"
                    onClick={() => setShowInlineMember(!showInlineMember)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Adicionar Pessoa
                  </button>
                )}
              </div>

              {/* Criar nova pessoa inline sem sair do modal */}
              {showInlineMember && onAddMember && (
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-end gap-2">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nome da Pessoa / Participante
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mãe, Irmão, Amigo..."
                      value={inlineMemberName}
                      onChange={(e) => setInlineMemberName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Renda Base (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inlineMemberIncome}
                      onChange={(e) => setInlineMemberIncome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!inlineMemberName.trim()) return;
                      const palette = [
                        '#06b6d4',
                        '#f59e0b',
                        '#ec4899',
                        '#3b82f6',
                        '#a855f7',
                      ];
                      const newMember: Member = {
                        id: `m-${Date.now()}`,
                        name: inlineMemberName.trim(),
                        role: 'Participante',
                        avatarColor: palette[members.length % palette.length],
                        monthlyIncome: Math.max(
                          0,
                          parseExactNumber(inlineMemberIncome)
                        ),
                      };
                      onAddMember(newMember);
                      const nextParticipants = [
                        ...activeParticipantIds,
                        newMember.id,
                      ];
                      setParticipantIds(nextParticipants);
                      setSplitCount(Math.max(splitCount, nextParticipants.length));
                      setInlineMemberName('');
                      setShowInlineMember(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shrink-0"
                  >
                    Incluir
                  </button>
                </div>
              )}

              {/* Seletor rápido de Quantidade de Pessoas (1, 2, 3, 4 ou N pessoas) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-stretch">
                {[
                  { count: 1, label: '1 Pessoa', sub: '100% Individual' },
                  { count: 2, label: '2 Pessoas', sub: '50% cada (÷ 2)' },
                  { count: 3, label: '3 Pessoas', sub: '33,33% cada (÷ 3)' },
                  { count: 4, label: '4 Pessoas', sub: '25% cada (÷ 4)' },
                ].map((opt) => {
                  const isSelected =
                    (opt.count === 1 &&
                      splitType === 'individual' &&
                      splitCount === 1) ||
                    (opt.count > 1 &&
                      splitCount === opt.count &&
                      splitType !== 'individual');
                  return (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => handleSelectPeopleCount(opt.count)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-80">{opt.sub}</div>
                    </button>
                  );
                })}

                <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 flex flex-col justify-center">
                  <label className="text-[10px] text-slate-400">
                    Nº de Pessoas:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={splitCount}
                    onChange={(e) =>
                      handleSelectPeopleCount(
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                    className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Caso 1: 1 Pessoa (Individual) ou 1 pessoa arcando com 1/N */}
              {splitType === 'individual' ? (
                <div className="pt-2 space-y-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1">
                      Quem vai pagar esta parcela?
                    </label>
                    <select
                      value={beneficiaryId || usedById || paidById}
                      onChange={(e) => {
                        const newBeneficiary = e.target.value;
                        setBeneficiaryId(newBeneficiary);
                        setUsedById(newBeneficiary);
                        setParticipantIds([newBeneficiary]);
                        if (paymentMethod !== 'credit_card') {
                          setPaidById(newBeneficiary);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {splitCount > 1
                            ? `${m.name} (paga 1/${splitCount} da parcela)`
                            : `100% pago por ${m.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {paymentMethod === 'credit_card' &&
                    paidById !== (beneficiaryId || usedById) && (
                      <div className="text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-200 px-3 py-2 rounded-lg">
                        Reembolso automático: O cartão pertence a{' '}
                        <strong>
                          {members.find((m) => m.id === paidById)?.name}
                        </strong>
                        , então{' '}
                        <strong>
                          {
                            members.find(
                              (m) => m.id === (beneficiaryId || usedById)
                            )?.name
                          }
                        </strong>{' '}
                        ficará com este valor a pagar na aba Divisão & Acerto.
                      </div>
                    )}
                </div>
              ) : (
                /* Caso 2: Dividido entre 2 ou mais pessoas */
                <div className="pt-2 space-y-3 border-t border-slate-800/80">
                  {/* Seleção de quais membros entram na divisão */}
                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1.5">
                      Quais pessoas participam desta divisão? (Clique para marcar/desmarcar)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => {
                        const isChecked = activeParticipantIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleParticipant(m.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              isChecked
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center ${
                                isChecked
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'border border-slate-700'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span>{m.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Regra de cálculo entre os participantes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitType('shared_equal')}
                      className={`p-2 rounded-xl border text-left transition ${
                        splitType === 'shared_equal'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        Partes Iguais (÷ {effectiveDivisor})
                      </div>
                      <div className="text-[10px] opacity-75">
                        Valor igual para cada pessoa
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitType('shared_proportional')}
                      className={`p-2 rounded-xl border text-left transition ${
                        splitType === 'shared_proportional'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        Proporcional à Renda
                      </div>
                      <div className="text-[10px] opacity-75">
                        Conforme salário de cada um
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitType('shared_custom')}
                      className={`p-2 rounded-xl border text-left transition ${
                        splitType === 'shared_custom'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        Percentual Manual (%)
                      </div>
                      <div className="text-[10px] opacity-75">
                        Defina % exata de cada pessoa
                      </div>
                    </button>
                  </div>

                  {splitType === 'shared_custom' && (
                    <div className="pt-2 space-y-2 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Defina a porcentagem (%) de cada pessoa nesta parcela:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
                          >
                            <span className="text-xs text-slate-200 font-medium">
                              {m.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                max={100}
                                value={customSplitsMap[m.id] ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    parseExactNumber(e.target.value)
                                  );
                                  setCustomSplitsMap((prev) => ({
                                    ...prev,
                                    [m.id]: val,
                                  }));
                                }}
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-xs text-white"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Memória de Cálculo Instantânea da Parcela */}
              {perInstallmentAmount > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      Resumo do Cálculo da Parcela ({effectiveDivisor}{' '}
                      {effectiveDivisor === 1 ? 'pessoa' : 'pessoas'})
                    </span>
                    <span className="text-emerald-200 font-bold">
                      {formatCurrency(valuePerPersonInInstallment)} / pessoa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {members.map((m) => {
                      const memberShare = liveShares[m.id] || 0;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80"
                        >
                          <span className="text-slate-300">{m.name}:</span>
                          <strong
                            className={
                              memberShare > 0
                                ? 'text-emerald-300'
                                : 'text-slate-500'
                            }
                          >
                            {formatCurrency(memberShare)}
                            {effectiveInstallments > 1 ? ' / mês' : ''}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 h-5">
                Membro que recebeu esta receita
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assinatura / Custo Fixo Recorrente */}
          {effectiveInstallments === 1 && (
            <div className="flex items-center justify-between bg-slate-950/60 px-4 py-3 rounded-xl border border-slate-800/80">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-700 accent-emerald-500 w-4 h-4"
                />
                <Repeat className="w-4 h-4 text-purple-400" />
                <span>
                  Despesa/Assinatura Fixa Recorrente (projetar próximos meses)
                </span>
              </label>

              {isRecurring && (
                <select
                  value={recurringMonths}
                  onChange={(e) => setRecurringMonths(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value={1}>Apenas este mês</option>
                  <option value={3}>Por 3 meses</option>
                  <option value={6}>Por 6 meses</option>
                  <option value={12}>Por 12 meses</option>
                </select>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition"
            >
              {editingTransaction
                ? effectiveInstallments > 1 && applyToAllInstallments
                  ? `Salvar ${effectiveInstallments} Parcelas`
                  : 'Salvar Alterações'
                : effectiveInstallments > 1
                ? `Lançar ${effectiveInstallments} Parcelas`
                : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
