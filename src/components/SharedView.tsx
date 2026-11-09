import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Edit2,
  Edit3,
  Receipt,
  Scale,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CreditCard,
  Member,
  SettlementRecord,
  Transaction,
} from '../types/finance';
import {
  calculateMonthlySettlement,
  calculateTransactionShares,
  formatCurrency,
  formatMonthLabel,
  SPLIT_TYPE_LABELS,
} from '../utils/financeUtils';

interface SharedViewProps {
  selectedMonth: string;
  members: Member[];
  cards: CreditCard[];
  monthTransactions: Transaction[];
  settlements: SettlementRecord[];
  onPayCardInvoice?: (cardId: string, month: string) => void;
  onUpdateMember: (member: Member) => void;
  onAddMember: (member: Member) => void;
  onDeleteMember: (memberId: string) => void;
  onAddSettlement: (record: SettlementRecord) => void;
  onDeleteSettlement: (id: string) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction, deleteGroup: boolean) => void;
}

export const SharedView: React.FC<SharedViewProps> = ({
  selectedMonth,
  members,
  cards,
  monthTransactions,
  settlements,
  onPayCardInvoice,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
  onAddSettlement,
  onDeleteSettlement,
  onUpdateTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const monthSettlements = settlements.filter(
    (s) => s.competenceMonth === selectedMonth
  );

  const settlementPairs = monthSettlements.map((s) => ({
    fromId: s.fromMemberId,
    toId: s.toMemberId,
    amount: s.amount,
  }));

  const {
    summaries,
    transfers,
    cardBreakdowns,
    totalSharedExpenses,
    totalIndividualExpenses,
    totalCardsInvoice,
    // totalDirectExpenses unused or used
    totalDirectExpenses,
  } = calculateMonthlySettlement(monthTransactions, members, settlementPairs, cards);

  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const expenses = monthTransactions.filter((t) => t.type === 'expense');

  const startEditingMember = (m: Member) => {
    setEditingMemberId(m.id);
    setEditName(m.name);
  };

  const saveMemberEdit = (m: Member) => {
    onUpdateMember({
      ...m,
      name: editName.trim() || m.name,
    });
    setEditingMemberId(null);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const colors = ['#06b6d4', '#f59e0b', '#ec4899', '#3b82f6'];
    onAddMember({
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      role: 'Participante',
      avatarColor: colors[members.length % colors.length],
      monthlyIncome: 0,
    });
    setNewMemberName('');
    setShowAddMember(false);
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Finanças Compartilhadas & Acerto de Contas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            <strong className="text-emerald-400">Novo conceito de divisão:</strong> O valor das compras vai para a <span className="text-slate-200 font-semibold">fatura do respectivo cartão</span>, evitando abatimentos irreais de outros participantes em {formatMonthLabel(selectedMonth)}.
          </p>
        </div>

        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          Adicionar Participante
        </button>
      </div>

      {showAddMember && (
        <form
          onSubmit={handleCreateMember}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-400 mb-1">
              Nome do Participante
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Maria, João, Colega..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Adicionar
          </button>
        </form>
      )}

      {/* SEÇÃO 1: Faturas de Cartão de Crédito - O valor vai para o cartão */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Faturas de Cartão de Crédito do Mês
                <span className="text-[10px] bg-violet-500/20 text-violet-300 font-semibold px-2 py-0.5 rounded-full">
                  Destino: Cartão
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                O valor a pagar vai direto para a fatura do cartão — sem abater créditos/débitos de outros participantes.
              </p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[11px] text-slate-400 block">Total em Faturas</span>
            <span className="text-sm font-bold text-violet-300">
              {formatCurrency(totalCardsInvoice)}
            </span>
          </div>
        </div>

        {cardBreakdowns.length === 0 || cardBreakdowns.every((cb) => cb.invoiceTotal === 0) ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-1">
            <CreditCardIcon className="w-6 h-6 text-slate-500 mx-auto" />
            <div className="text-xs font-semibold text-slate-300">
              Nenhuma despesa de cartão de crédito em {formatMonthLabel(selectedMonth)}
            </div>
            <p className="text-[11px] text-slate-500">
              Quando você lançar compras no cartão, as cotas de cada participante para a fatura aparecerão discriminadas aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cardBreakdowns
              .filter((cb) => cb.invoiceTotal > 0)
              .map((cb) => {
                const holderName = cb.holder ? cb.holder.name.split(' ')[0] : 'Titular';
                return (
                  <div
                    key={cb.card.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition space-y-4"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: cb.card.color }}
                    />

                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cb.card.color }}
                            />
                            <h4 className="font-bold text-white text-base">
                              {cb.card.name}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Final {cb.card.lastDigits || '****'} • Titular:{' '}
                            <span className="text-slate-200 font-medium">{holderName}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold block ${
                              cb.isPaid
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {cb.isPaid ? 'Fatura Paga' : 'Aberta'}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            Vence dia {cb.card.dueDay}
                          </span>
                        </div>
                      </div>

                      {/* Total da Fatura */}
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">
                          Valor Total da Fatura
                        </span>
                        <span className="text-xl font-extrabold text-white">
                          {formatCurrency(cb.invoiceTotal)}
                        </span>
                      </div>

                      {/* Lista de Cotas por Participante */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            Divisão exata da fatura:
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {cb.transactionsCount} lançamentos
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {cb.memberShares.map((ms) => {
                            if (ms.totalShare <= 0) return null;
                            return (
                              <div
                                key={ms.memberId}
                                className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-2.5 space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 flex-shrink-0"
                                      style={{ backgroundColor: ms.avatarColor }}
                                    >
                                      {ms.memberName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-white">
                                      {ms.memberName}
                                      {ms.isHolder && (
                                        <span className="ml-1 text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-normal">
                                          Titular
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-emerald-300">
                                      {formatCurrency(ms.totalShare)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-1.5">
                                      ({ms.percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                                  <span>Origem do gasto:</span>
                                  <span>
                                    {ms.individualTotal > 0 && ms.sharedTotal > 0
                                      ? `${formatCurrency(ms.individualTotal)} individual + ${formatCurrency(ms.sharedTotal)} compartilhado`
                                      : ms.individualTotal > 0
                                      ? '100% individual dele(a)'
                                      : 'Parcela de gastos compartilhados'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-[10px] text-slate-500 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 mb-2">
                        💳 <strong>Atenção:</strong> Cada participante transfere sua cota diretamente para pagar a fatura do {cb.card.name}.
                      </div>

                      {onPayCardInvoice && !cb.isPaid && (
                        <button
                          type="button"
                          onClick={() => onPayCardInvoice(cb.card.id, selectedMonth)}
                          className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Quitar esta fatura
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: Resumo Geral por Participante + Acertos Diretos */}
      <div className="space-y-4">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            Visão Geral por Participante & Acertos Diretos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidação de quanto cada membro é responsável no mês: faturas de cartão e despesas diretas fora do cartão (Pix / Dinheiro).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {summaries.map((sum) => {
            const isEditing = editingMemberId === sum.member.id;

            return (
              <div
                key={sum.member.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-950"
                        style={{ backgroundColor: sum.member.avatarColor }}
                      >
                        {sum.member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        ) : (
                          <h3 className="font-bold text-white text-sm">
                            {sum.member.name}
                          </h3>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Total no mês:{' '}
                          <strong className="text-white">{formatCurrency(sum.fairShareResponsibility)}</strong>
                        </p>
                      </div>
                    </div>

                    {isEditing ? (
                      <button
                        onClick={() => saveMemberEdit(sum.member)}
                        className="text-xs bg-emerald-500 text-slate-950 font-semibold px-2.5 py-1 rounded-lg"
                      >
                        Salvar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditingMember(sum.member)}
                          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                          title="Alterar nome"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {members.length > 1 && (
                          <button
                            onClick={() => onDeleteMember(sum.member.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                            title="Excluir participante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <CreditCardIcon className="w-3.5 h-3.5 text-violet-400" />
                        Cota em Faturas de Cartão:
                      </span>
                      <span className="text-violet-300 font-bold">
                        {formatCurrency(sum.cardsResponsibility)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        Cota Fora do Cartão (Boletos/Pix):
                      </span>
                      <span className="text-slate-200 font-medium">
                        {formatCurrency(sum.directResponsibility)}
                      </span>
                    </div>

                    <div className="flex justify-between font-semibold pt-1.5 border-t border-slate-800">
                      <span className="text-slate-200">Custo Total no Mês:</span>
                      <span className="text-white font-bold text-sm">
                        {formatCurrency(sum.fairShareResponsibility)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status de Acerto Direto (apenas para despesas fora do cartão!) */}
                <div
                  className={`rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold ${
                    sum.directNetBalance > 0.01
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : sum.directNetBalance < -0.01
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      : 'bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-[11px]">
                    {sum.directNetBalance > 0.01
                      ? 'Pix Direto a Receber:'
                      : sum.directNetBalance < -0.01
                      ? 'Pix Direto a Pagar:'
                      : 'Contas Diretas Quitadas'}
                  </span>
                  <span className="text-sm font-bold">
                    {sum.directNetBalance !== 0
                      ? formatCurrency(Math.abs(sum.directNetBalance))
                      : 'R$ 0,00'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Card de Acertos Diretos (Pix / Dinheiro fora do cartão) */}
          <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Scale className="w-4 h-4" />
                Acertos Diretos (Fora do Cartão)
              </div>
              <div className="text-[11px] text-slate-400 font-medium mb-1">Total fora de cartão: <strong className="text-slate-200">{formatCurrency(totalDirectExpenses)}</strong></div>
              <h3 className="text-base font-bold text-white mb-1">
                Contas da Casa Pagas no Pix / À Vista
              </h3>
              <p className="text-xs text-slate-300/80 mb-4">
                Apenas despesas que foram pagas diretamente do bolso (sem passar em cartão). Não abate valores das faturas de cartão.
              </p>

              {transfers.length === 0 ? (
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-emerald-200">
                    Nenhum Pix Direto Pendente
                  </div>
                  <p className="text-xs text-emerald-300/80">
                    Todas as contas fora do cartão estão quitadas ou individuais neste mês.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((tr, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300">
                          {tr.fromMember.name}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-emerald-300">
                          {tr.toMember.name}
                        </span>
                      </div>
                      <div className="text-center py-1">
                        <div className="text-[11px] text-slate-400">
                          Valor para transferência Pix direta:
                        </div>
                        <div className="text-2xl font-extrabold text-white">
                          {formatCurrency(tr.amount)}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onAddSettlement({
                            id: `settle-${Date.now()}`,
                            competenceMonth: selectedMonth,
                            fromMemberId: tr.fromMember.id,
                            toMemberId: tr.toMember.id,
                            amount: tr.amount,
                            settledAt: new Date().toISOString().slice(0, 10),
                            note: 'Acerto de contas diretas',
                          })
                        }
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Pix Direto
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {monthSettlements.length > 0 && (
              <div className="mt-4 pt-3 border-t border-emerald-500/20 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-300">
                  Acertos diretos já registrados neste mês:
                </div>
                {monthSettlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs bg-slate-950/60 px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="text-slate-300">
                      {memberMap[s.fromMemberId]?.name.split(' ')[0]} →{' '}
                      {memberMap[s.toMemberId]?.name.split(' ')[0]}:{' '}
                      <strong>{formatCurrency(s.amount)}</strong>
                    </span>
                    <button
                      onClick={() => onDeleteSettlement(s.id)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Desfazer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: Tabela de Memória de Cálculo Detalhada */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Memória de Cálculo Item a Item ({expenses.length} despesas)
            </h3>
            <p className="text-xs text-slate-400">
              Veja exatamente a forma de pagamento, a fatura de destino e a parte de cada membro
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">
              Total Compartilhado:{' '}
              <strong className="text-emerald-400">
                {formatCurrency(totalSharedExpenses)}
              </strong>
            </span>
            <span className="text-slate-400">
              Total Individual:{' '}
              <strong className="text-slate-200">
                {formatCurrency(totalIndividualExpenses)}
              </strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4 font-medium">Despesa</th>
                <th className="py-3 px-4 font-medium">Forma / Pagador</th>
                <th className="py-3 px-4 font-medium">Quem Utilizou</th>
                <th className="py-3 px-4 font-medium">Regra de Divisão</th>
                <th className="py-3 px-4 font-medium text-right">Valor Total</th>
                {members.map((m) => (
                  <th key={m.id} className="py-3 px-4 font-medium text-right">
                    Parte de {m.name.split(' ')[0]}
                  </th>
                ))}
                <th className="py-3 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {expenses.map((tx) => {
                const shares = calculateTransactionShares(tx, members);
                const card = tx.cardId ? cardMap[tx.cardId] : undefined;
                const effectiveUsedBy =
                  tx.usedById || tx.beneficiaryId || tx.paidById;
                const currentSplitSelectValue =
                  tx.splitType === 'individual'
                    ? `indiv:${effectiveUsedBy}`
                    : tx.splitType;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-white">
                      {tx.description}
                      {(tx.installmentTotal || 1) > 1 && (
                        <span className="ml-2 text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                          {tx.installmentCurrent}/{tx.installmentTotal}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex flex-col gap-1">
                        <select
                          value={tx.paidById}
                          onChange={(e) =>
                            onUpdateTransaction({
                              ...tx,
                              paidById: e.target.value,
                            })
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {tx.paymentMethod === 'credit_card'
                                ? `Titular: ${m.name.split(' ')[0]}`
                                : `Pago por: ${m.name.split(' ')[0]}`}
                            </option>
                          ))}
                        </select>
                        {card ? (
                          <span className="text-[10px] text-violet-300 font-medium flex items-center gap-1">
                            <CreditCardIcon className="w-3 h-3" />
                            {card.name} (Fatura)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {tx.paymentMethod === 'pix'
                              ? 'Pix direto'
                              : tx.paymentMethod === 'debit'
                              ? 'Débito em conta'
                              : tx.paymentMethod === 'boleto'
                              ? 'Boleto'
                              : 'Dinheiro'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <select
                        value={effectiveUsedBy}
                        onChange={(e) => {
                          const selectedUserId = e.target.value;
                          const becomesIndividual = selectedUserId !== tx.paidById;
                          onUpdateTransaction({
                            ...tx,
                            usedById: selectedUserId,
                            beneficiaryId: selectedUserId,
                            splitType: becomesIndividual
                              ? 'individual'
                              : tx.splitType,
                            splitCount: becomesIndividual
                              ? 1
                              : tx.splitCount || 1,
                            participantIds: becomesIndividual
                              ? [selectedUserId]
                              : tx.participantIds,
                          });
                        }}
                        className="bg-slate-950 border border-violet-500/40 rounded-lg px-2 py-1 text-xs text-violet-200 font-medium focus:outline-none focus:border-violet-400"
                      >
                        {members.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            className="bg-slate-900 text-white"
                          >
                            Utilizado por: {m.name.split(' ')[0]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={
                            tx.splitCount ||
                            (tx.splitType === 'individual'
                              ? 1
                              : Math.max(2, members.length))
                          }
                          onChange={(e) => {
                            const count = Number(e.target.value);
                            if (count === 1) {
                              onUpdateTransaction({
                                ...tx,
                                splitCount: 1,
                                splitType: 'individual',
                                beneficiaryId: effectiveUsedBy,
                                participantIds: [effectiveUsedBy],
                              });
                            } else {
                              onUpdateTransaction({
                                ...tx,
                                splitCount: count,
                                splitType:
                                  tx.splitType === 'individual'
                                    ? 'shared_equal'
                                    : tx.splitType,
                                participantIds: members.map((m) => m.id),
                              });
                            }
                          }}
                          title="Quantas pessoas vão pagar esta parcela"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n} className="bg-slate-900 text-white">
                              {n} {n === 1 ? 'pessoa' : 'pessoas'}
                            </option>
                          ))}
                        </select>

                        <select
                          value={currentSplitSelectValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.startsWith('indiv:')) {
                              const targetMemberId = val.replace('indiv:', '');
                              onUpdateTransaction({
                                ...tx,
                                splitType: 'individual',
                                splitCount: 1,
                                usedById: targetMemberId,
                                beneficiaryId: targetMemberId,
                                participantIds: [targetMemberId],
                                paidById:
                                  tx.paymentMethod === 'credit_card'
                                    ? tx.paidById
                                    : targetMemberId,
                              });
                            } else {
                              onUpdateTransaction({
                                ...tx,
                                splitType: val as Transaction['splitType'],
                                splitCount: Math.max(
                                  2,
                                  tx.splitCount && tx.splitCount > 1
                                    ? tx.splitCount
                                    : members.length
                                ),
                                participantIds: members.map((m) => m.id),
                                beneficiaryId: undefined,
                              });
                            }
                          }}
                          className={`rounded-lg px-2 py-1 text-xs font-medium border focus:outline-none ${
                            tx.splitType === 'individual'
                              ? 'bg-slate-950 border-slate-700 text-slate-200'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <option value="shared_equal" className="bg-slate-900 text-white">
                            {SPLIT_TYPE_LABELS.shared_equal}
                          </option>
                          <option value="shared_proportional" className="bg-slate-900 text-white">
                            {SPLIT_TYPE_LABELS.shared_proportional}
                          </option>
                          {members.map((m) => (
                            <option
                              key={m.id}
                              value={`indiv:${m.id}`}
                              className="bg-slate-900 text-white"
                            >
                              100% de quem utilizou ({m.name.split(' ')[0]})
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {formatCurrency(tx.amount)}
                    </td>
                    {members.map((m) => (
                      <td
                        key={m.id}
                        className="py-3 px-4 text-right text-slate-300 font-medium"
                      >
                        {formatCurrency(shares[m.id] || 0)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          title="Alterar lançamento completo"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
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
                          title="Deletar lançamento"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
