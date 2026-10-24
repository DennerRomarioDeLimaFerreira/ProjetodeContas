import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  CreditCard as CreditCardIcon,
  Edit2,
  Filter,
  Layers,
  Plus,
  Repeat,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Category,
  CreditCard,
  Member,
  Transaction,
} from '../types/finance';
import {
  formatCurrency,
  formatMonthLabel,
  PAYMENT_METHOD_LABELS,
  SPLIT_TYPE_LABELS,
} from '../utils/financeUtils';

interface TransactionsViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
  members: Member[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction, deleteGroup: boolean) => void;
  onTogglePaid: (txId: string) => void;
  onOpenNewModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedMonth,
  transactions,
  categories,
  cards,
  members,
  onEditTransaction,
  onDeleteTransaction,
  onTogglePaid,
  onOpenNewModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterSplit, setFilterSplit] = useState('all');

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const filtered = transactions
    .filter((tx) => {
      if (
        searchQuery.trim() &&
        !tx.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) {
        return false;
      }
      if (filterMethod !== 'all') {
        if (filterMethod.startsWith('card:')) {
          const cid = filterMethod.replace('card:', '');
          if (tx.cardId !== cid) return false;
        } else if (tx.paymentMethod !== filterMethod) {
          return false;
        }
      }
      if (filterMember !== 'all') {
        const ownerId = tx.beneficiaryId || tx.paidById;
        if (tx.type === 'expense' && tx.splitType !== 'individual') {
          return false;
        }
        if (ownerId !== filterMember) {
          return false;
        }
      }
      if (filterSplit !== 'all') {
        if (filterSplit === 'shared' && tx.splitType === 'individual') {
          return false;
        }
        if (filterSplit === 'individual' && tx.splitType !== 'individual') {
          return false;
        }
        if (
          filterSplit === 'installments' &&
          (tx.installmentTotal || 1) <= 1
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalFilteredExpenses = filtered
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFilteredIncomes = filtered
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-5">
      {/* Topo e Botão Novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            Extrato & Lançamentos de {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-400">
            Filtre por cartão, membro, categoria ou compras parceladas
          </p>
        </div>
        <button
          onClick={onOpenNewModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          Adicionar Lançamento
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Método / Cartão */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os Métodos / Cartões</option>
            <optgroup label="Cartões Específicos">
              {cards.map((c) => (
                <option key={c.id} value={`card:${c.id}`}>
                  Cartão: {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Formas de Pagamento">
              <option value="credit_card">Todos Cartões de Crédito</option>
              <option value="pix">Pix</option>
              <option value="debit">Débito</option>
              <option value="boleto">Boleto</option>
              <option value="cash">Dinheiro</option>
            </optgroup>
          </select>

          {/* Membro */}
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">De quem é: Todos os Membros</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                De: {m.name}
              </option>
            ))}
          </select>

          {/* Tipo de Divisão / Parcelas */}
          <select
            value={filterSplit}
            onChange={(e) => setFilterSplit(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Qualquer Divisão / Tipo</option>
            <option value="shared">Apenas Compartilhados</option>
            <option value="individual">Apenas Individuais</option>
            <option value="installments">Apenas Compras Parceladas</option>
          </select>
        </div>

        {/* Rodapé de totais filtrados */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400 gap-2">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            Exibindo <strong>{filtered.length}</strong> lançamentos
          </span>
          <div className="flex items-center gap-4">
            {totalFilteredIncomes > 0 && (
              <span>
                Receitas filtradas:{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(totalFilteredIncomes)}
                </strong>
              </span>
            )}
            <span>
              Despesas filtradas:{' '}
              <strong className="text-rose-400">
                {formatCurrency(totalFilteredExpenses)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-slate-400">
              Nenhum lançamento encontrado com os filtros selecionados.
            </p>
            <button
              onClick={onOpenNewModal}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              + Criar novo lançamento neste mês
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((tx) => {
              const cat = categoryMap[tx.categoryId];
              const card = tx.cardId ? cardMap[tx.cardId] : undefined;
              const cardOwnerMember = memberMap[tx.paidById];
              const cardOwnerName =
                cardOwnerMember?.name.split(' ')[0] || 'Titular';
              const ownerMember =
                memberMap[tx.usedById || tx.beneficiaryId || tx.paidById];
              const ownerName = ownerMember?.name || 'Membro';
              const isInstallment = (tx.installmentTotal || 1) > 1;
              const isIndividual =
                tx.type === 'income' || tx.splitType === 'individual';

              return (
                <div
                  key={tx.id}
                  className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <button
                      onClick={() => onTogglePaid(tx.id)}
                      title={
                        tx.isPaid
                          ? 'Marcado como Pago (clique para alternar)'
                          : 'Pendente / Na fatura (clique para marcar pago)'
                      }
                      className="mt-0.5 sm:mt-0 text-slate-400 hover:text-emerald-400 transition"
                    >
                      {tx.isPaid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600" />
                      )}
                    </button>

                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: `${cat?.color || '#10b981'}20`,
                        color: cat?.color || '#10b981',
                      }}
                    >
                      {cat?.name.slice(0, 2).toUpperCase() || '$$'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {tx.description}
                        </span>

                        {isInstallment && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                            <Layers className="w-3 h-3" />
                            Parcela {tx.installmentCurrent}/{tx.installmentTotal}
                            {' • '}
                            {isIndividual ? ownerName : 'Compartilhado'}
                          </span>
                        )}

                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                          style={
                            isIndividual
                              ? {
                                  backgroundColor: `${
                                    ownerMember?.avatarColor || '#10b981'
                                  }20`,
                                  color: ownerMember?.avatarColor || '#34d399',
                                  borderColor: `${
                                    ownerMember?.avatarColor || '#10b981'
                                  }40`,
                                }
                              : {
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#6ee7b7',
                                  borderColor: 'rgba(16, 185, 129, 0.3)',
                                }
                          }
                        >
                          <Users className="w-3 h-3" />
                          {isIndividual
                            ? ownerName
                            : SPLIT_TYPE_LABELS[tx.splitType]}
                        </span>

                        {tx.isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full">
                            <Repeat className="w-3 h-3" />
                            Fixo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-1">
                        <span>{tx.date.split('-').reverse().join('/')}</span>
                        <span>•</span>
                        <span className="text-slate-300">{cat?.name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {tx.paymentMethod === 'credit_card' && card ? (
                            <span className="text-violet-300 font-medium flex items-center gap-1">
                              <CreditCardIcon className="w-3 h-3" />
                              {card.name} (Dono: {cardOwnerName})
                            </span>
                          ) : (
                            PAYMENT_METHOD_LABELS[tx.paymentMethod]
                          )}
                        </span>
                        <span>•</span>
                        <span className="text-slate-200 font-medium">
                          {tx.paymentMethod === 'credit_card'
                            ? `Utilizado por: ${ownerName}`
                            : isIndividual
                            ? `De: ${ownerName}`
                            : SPLIT_TYPE_LABELS[tx.splitType]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-8 sm:pl-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : 'text-white'
                        }`}
                      >
                        {tx.type === 'income' ? '+ ' : '- '}
                        {formatCurrency(tx.amount)}
                      </div>
                      {isInstallment && tx.totalPurchaseAmount && (
                        <div className="text-[10px] text-slate-500">
                          Total compra: {formatCurrency(tx.totalPurchaseAmount)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        title="Editar lançamento"
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (tx.groupId && (tx.installmentTotal || 1) > 1) {
                            const confirmAll = window.confirm(
                              `Esta despesa faz parte de um parcelamento (${tx.installmentCurrent}/${tx.installmentTotal}).\n\nClique em OK para excluir TODAS as parcelas desta compra, ou Cancelar para excluir apenas a parcela deste mês.`
                            );
                            onDeleteTransaction(tx, confirmAll);
                          } else {
                            onDeleteTransaction(tx, false);
                          }
                        }}
                        title="Excluir lançamento"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
