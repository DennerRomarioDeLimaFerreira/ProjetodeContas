import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Layers,
  Plus,
  Repeat,
  Trash2,
  Users,
} from 'lucide-react';
import { Category, CreditCard, Member, Transaction } from '../types/finance';
import {
  formatCurrency,
  formatMonthLabel,
  parseExactNumber,
  SPLIT_TYPE_LABELS,
} from '../utils/financeUtils';

interface CardsViewProps {
  selectedMonth: string;
  cards: CreditCard[];
  members: Member[];
  categories: Category[];
  monthTransactions: Transaction[];
  allTransactions: Transaction[];
  onAddCard: (card: CreditCard) => void;
  onDeleteCard: (cardId: string) => void;
  onPayCardInvoice: (cardId: string, month: string) => void;
  onOpenNewTransactionWithCard: (cardId: string) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  selectedMonth,
  cards,
  members,
  categories,
  monthTransactions,
  allTransactions,
  onAddCard,
  onDeleteCard,
  onPayCardInvoice,
  onOpenNewTransactionWithCard,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | 'all'>('all');
  const [showNewCardModal, setShowNewCardModal] = useState(false);

  // Form Novo Cartão
  const [cardName, setCardName] = useState('');
  const [cardBrand, setCardBrand] = useState('Nubank');
  const [cardLimit, setCardLimit] = useState('8000');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('12');
  const [holderId, setHolderId] = useState(members[0]?.id || 'm1');
  const [cardColor, setCardColor] = useState('#820ad1');
  const [lastDigits, setLastDigits] = useState('');

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Estatísticas por cartão
  const cardStats = cards.map((card) => {
    const invoiceTxs = monthTransactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.paymentMethod === 'credit_card' &&
        t.cardId === card.id
    );
    const invoiceTotal = invoiceTxs.reduce((acc, t) => acc + t.amount, 0);
    const isInvoicePaid =
      invoiceTxs.length > 0 && invoiceTxs.every((t) => t.isPaid);

    // Limite total comprometido (todas as parcelas não pagas do mês atual em diante)
    const committedLimit = allTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.paymentMethod === 'credit_card' &&
          t.cardId === card.id &&
          !t.isPaid &&
          t.competenceMonth >= selectedMonth
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const availableLimit = Math.max(0, card.limit - committedLimit);
    const usagePct = card.limit > 0 ? (committedLimit / card.limit) * 100 : 0;

    return {
      card,
      invoiceTxs,
      invoiceTotal,
      isInvoicePaid,
      committedLimit,
      availableLimit,
      usagePct,
    };
  });

  const filteredInvoiceTxs = monthTransactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.paymentMethod === 'credit_card' &&
      (selectedCardId === 'all' || t.cardId === selectedCardId)
  );

  const activeInstallments = filteredInvoiceTxs.filter(
    (t) => (t.installmentTotal || 1) > 1
  );

  const activeRecurring = filteredInvoiceTxs.filter(
    (t) => t.isRecurring && (t.installmentTotal || 1) === 1
  );

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    const newCard: CreditCard = {
      id: `card-${Date.now()}`,
      name: cardName.trim(),
      brand: cardBrand,
      color: cardColor,
      limit: parseExactNumber(cardLimit) || 5000,
      closingDay: Math.min(31, Math.max(1, parseInt(closingDay, 10) || 5)),
      dueDay: Math.min(31, Math.max(1, parseInt(dueDay, 10) || 12)),
      holderId: holderId || members[0]?.id || 'm1',
      lastDigits: lastDigits.trim() || String(Math.floor(1000 + Math.random() * 9000)),
    };
    onAddCard(newCard);
    setCardName('');
    setLastDigits('');
    setShowNewCardModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5 text-violet-400" />
            Cartões de Crédito, Faturas & Parcelamentos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle o limite comprometido pelas parcelas futuras, dia de fechamento e faturas de{' '}
            <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong>
          </p>
        </div>

        <button
          onClick={() => setShowNewCardModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Novo Cartão de Crédito
        </button>
      </div>

      {/* Grid de Cartões Visuais */}
      {cardStats.length === 0 ? (
        <div className="bg-slate-900/90 border border-dashed border-slate-700 rounded-2xl p-8 text-center space-y-3">
          <CreditCardIcon className="w-8 h-8 text-violet-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Nenhum cartão de crédito cadastrado ainda
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre seus cartões reais para controlar fechamento, vencimento, faturas e parcelas.
            </p>
          </div>
          <button
            onClick={() => setShowNewCardModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Meu Primeiro Cartão
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cardStats.map(
          ({
            card,
            invoiceTotal,
            isInvoicePaid,
            committedLimit,
            availableLimit,
            usagePct,
            invoiceTxs,
          }) => {
            const isSelected = selectedCardId === card.id;
            const holder = memberMap[card.holderId];

            return (
              <div
                key={card.id}
                onClick={() =>
                  setSelectedCardId(isSelected ? 'all' : card.id)
                }
                className={`rounded-2xl p-5 cursor-pointer transition relative overflow-hidden border ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 border-transparent bg-slate-900'
                    : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                {/* Faixa de cor superior do cartão */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: card.color }}
                />

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: card.color }}
                      />
                      <h3 className="font-bold text-white text-base">
                        {card.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Final {card.lastDigits || '****'} • Titular:{' '}
                      <span className="text-slate-200 font-medium">
                        {holder?.name.split(' ')[0] || 'Membro'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      Fecha dia {card.closingDay} • Vence {card.dueDay}
                    </span>
                    {cards.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCard(card.id);
                        }}
                        title="Remover cartão"
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Valor da Fatura do Mês */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Fatura {formatMonthLabel(selectedMonth)}</span>
                    {invoiceTxs.length > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isInvoicePaid
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {isInvoicePaid ? 'Fatura Paga' : 'Aberta / Pendente'}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(invoiceTotal)}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewTransactionWithCard(card.id);
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                      + Lançar neste cartão
                    </button>
                    {invoiceTxs.length > 0 && !isInvoicePaid && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPayCardInvoice(card.id, selectedMonth);
                        }}
                        className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Quitar fatura
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Limite Comprometido (Incluindo parcelas futuras) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">
                      Limite comprometido:{' '}
                      <strong className="text-slate-200">
                        {formatCurrency(committedLimit)}
                      </strong>
                    </span>
                    <span className="text-emerald-400 font-medium">
                      Livre: {formatCurrency(availableLimit)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, usagePct)}%`,
                        backgroundColor:
                          usagePct > 85
                            ? '#f43f5e'
                            : usagePct > 65
                            ? '#f59e0b'
                            : card.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{usagePct.toFixed(2)}% do limite tomado</span>
                    <span>Limite Total: {formatCurrency(card.limit)}</span>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
      )}

      {/* Filtro rápido de cartão */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCardId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
            selectedCardId === 'all'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          Todos os Cartões ({filteredInvoiceTxs.length} itens)
        </button>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCardId(c.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              selectedCardId === c.id
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Painel Duplo: Compras Parceladas Ativas + Assinaturas Recorrentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compras Parceladas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                Compras Parceladas neste Mês ({activeInstallments.length})
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe o andamento das parcelas e quanto falta para acabar
              </p>
            </div>
            <span className="text-xs font-bold text-violet-300 bg-violet-500/15 px-2.5 py-1 rounded-lg">
              {formatCurrency(
                activeInstallments.reduce((acc, t) => acc + t.amount, 0)
              )}
              /mês
            </span>
          </div>

          {activeInstallments.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma compra parcelada ativa neste mês para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {activeInstallments.map((tx) => {
                const cur = tx.installmentCurrent || 1;
                const tot = tx.installmentTotal || 1;
                const remainingMonths = tot - cur;
                const remainingValue = remainingMonths * tx.amount;
                const pctProgress = (cur / tot) * 100;
                const card = cards.find((c) => c.id === tx.cardId);

                return (
                  <div
                    key={tx.id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{card?.name}</span>
                          <span>•</span>
                          <span className="text-emerald-400">
                            {SPLIT_TYPE_LABELS[tx.splitType]}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">
                          {formatCurrency(tx.amount)}
                        </div>
                        <span className="inline-block text-[10px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                          Parcela {cur} de {tot}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${pctProgress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        Total original:{' '}
                        {formatCurrency(tx.totalPurchaseAmount || tx.amount * tot)}
                      </span>
                      <span>
                        {remainingMonths > 0
                          ? `Faltam ${remainingMonths}x (${formatCurrency(
                              remainingValue
                            )})`
                          : 'Última parcela neste mês! 🎉'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assinaturas Recorrentes & Itens da Fatura */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-cyan-400" />
                  Assinaturas & Todos os Lançamentos da Fatura
                </h3>
                <p className="text-xs text-slate-400">
                  Itens cobrados na fatura de {formatMonthLabel(selectedMonth)}
                </p>
              </div>
              {activeRecurring.length > 0 && (
                <span className="text-xs font-semibold text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded-lg">
                  Fixos:{' '}
                  {formatCurrency(
                    activeRecurring.reduce((acc, t) => acc + t.amount, 0)
                  )}
                </span>
              )}
            </div>

            {filteredInvoiceTxs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Nenhum gasto lançado neste cartão no mês selecionado.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredInvoiceTxs.map((tx) => {
                  const cat = categoryMap[tx.categoryId];
                  const card = cards.find((c) => c.id === tx.cardId);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.color || '#10b981' }}
                        />
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {tx.description}
                            {tx.isRecurring && (
                              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                                Assinatura
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{card?.name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-emerald-400" />
                              {tx.splitType === 'individual'
                                ? `Individual (${
                                    memberMap[tx.beneficiaryId || tx.paidById]?.name.split(
                                      ' '
                                    )[0]
                                  })`
                                : 'Compartilhado'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">
                          {formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">{tx.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Novo Cartão */}
      {showNewCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Cadastrar Cartão de Crédito
            </h3>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank Roxinho, Inter Black..."
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Bandeira / Emissor
                  </label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Nubank">Nubank</option>
                    <option value="Itaú">Itaú</option>
                    <option value="Inter">Banco Inter</option>
                    <option value="C6 Bank">C6 Bank</option>
                    <option value="XP">XP Visa Infinite</option>
                    <option value="Bradesco">Bradesco</option>
                    <option value="Santander">Santander</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Limite Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cardLimit}
                    onChange={(e) => setCardLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Dia Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Dia Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Últimos 4 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="1234"
                    value={lastDigits}
                    onChange={(e) => setLastDigits(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Titular do Cartão
                  </label>
                  <select
                    value={holderId}
                    onChange={(e) => setHolderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Cor do Cartão
                  </label>
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
