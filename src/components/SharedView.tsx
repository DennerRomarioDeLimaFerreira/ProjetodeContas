import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Edit2,
  Edit3,
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
  parseExactNumber,
  SPLIT_TYPE_LABELS,
} from '../utils/financeUtils';

interface SharedViewProps {
  selectedMonth: string;
  members: Member[];
  cards: CreditCard[];
  monthTransactions: Transaction[];
  settlements: SettlementRecord[];
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
  const [editIncome, setEditIncome] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIncome, setNewMemberIncome] = useState('4500');

  const totalHouseholdIncome = members.reduce(
    (acc, m) => acc + (m.monthlyIncome || 0),
    0
  );

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
    totalSharedExpenses,
    totalIndividualExpenses,
  } = calculateMonthlySettlement(monthTransactions, members, settlementPairs);

  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const expenses = monthTransactions.filter((t) => t.type === 'expense');

  const startEditingMember = (m: Member) => {
    setEditingMemberId(m.id);
    setEditName(m.name);
    setEditIncome(String(m.monthlyIncome));
  };

  const saveMemberEdit = (m: Member) => {
    onUpdateMember({
      ...m,
      name: editName.trim() || m.name,
      monthlyIncome: Math.max(0, parseExactNumber(editIncome)),
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
      monthlyIncome: Math.max(0, parseExactNumber(newMemberIncome)),
    });
    setNewMemberName('');
    setShowAddMember(false);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Finanças Compartilhadas & Acerto de Contas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Divisão inteligente de contas da casa, faturas de cartão e cálculo automático de quem deve para quem em{' '}
            <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong>
          </p>
        </div>

        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
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
          <div className="w-full sm:w-48">
            <label className="block text-xs text-slate-400 mb-1">
              Renda Mensal (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={newMemberIncome}
              onChange={(e) => setNewMemberIncome(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs"
          >
            Adicionar
          </button>
        </form>
      )}

      {/* Cards de Membros + Proporção de Renda */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((sum) => {
          const incomeWeight =
            totalHouseholdIncome > 0
              ? ((sum.member.monthlyIncome / totalHouseholdIncome) * 100).toFixed(2)
              : (100 / members.length).toFixed(2);

          const isEditing = editingMemberId === sum.member.id;

          return (
            <div
              key={sum.member.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
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
                      Peso Proporcional na Casa:{' '}
                      <strong className="text-emerald-400">{incomeWeight}%</strong>
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
                      title="Alterar nome e renda"
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

              {isEditing && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Renda Mensal Base (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editIncome}
                    onChange={(e) => setEditIncome(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Renda cadastrada:</span>
                  <span className="text-slate-200 font-medium">
                    {formatCurrency(sum.member.monthlyIncome)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Dono do Cartão / Pagou Fatura:</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(sum.paidOutOfPocket)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Parte nos Gastos Compartilhados:</span>
                  <span className="text-emerald-300">
                    {formatCurrency(sum.sharedResponsibility)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Utilizou o Cartão (100% Individual):</span>
                  <span className="text-violet-300 font-medium">
                    {formatCurrency(sum.individualResponsibility)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-1.5 border-t border-slate-800">
                  <span className="text-slate-300">Custo Justo Total:</span>
                  <span className="text-white">
                    {formatCurrency(sum.fairShareResponsibility)}
                  </span>
                </div>
              </div>

              <div
                className={`rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold ${
                  sum.netBalance > 0.01
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : sum.netBalance < -0.01
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/60 text-slate-300'
                }`}
              >
                <span>
                  {sum.netBalance > 0.01
                    ? 'Saldo a Receber:'
                    : sum.netBalance < -0.01
                    ? 'Saldo a Pagar:'
                    : 'Saldo Quitado:'}
                </span>
                <span className="text-sm font-bold">
                  {formatCurrency(Math.abs(sum.netBalance))}
                </span>
              </div>
            </div>
          );
        })}

        {/* Card de Fechamento & Pix de Acerto */}
        <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Scale className="w-4 h-4" />
              Resumo do Acerto Mensal
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Como fechar as contas de {formatMonthLabel(selectedMonth)}?
            </h3>
            <p className="text-xs text-slate-300/80 mb-4">
              Calculamos automaticamente todas as faturas de cartão, contas da casa e gastos individuais pagos no cartão um do outro.
            </p>

            {transfers.length === 0 ? (
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-emerald-200">
                  Contas 100% Equilibradas!
                </div>
                <p className="text-xs text-emerald-300/80">
                  Nenhuma transferência pendente entre os membros neste mês.
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
                        Valor exato para transferência / Pix:
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
                        })
                      }
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Pix / Marcar como Acertado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {monthSettlements.length > 0 && (
            <div className="mt-4 pt-3 border-t border-emerald-500/20 space-y-1.5">
              <div className="text-[11px] font-semibold text-emerald-300">
                Acertos já realizados neste mês:
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

      {/* Tabela de Memória de Cálculo Detalhada */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Memória de Cálculo Item a Item ({expenses.length} despesas)
            </h3>
            <p className="text-xs text-slate-400">
              Veja exatamente quem pagou cada despesa e quanto cabe a cada membro
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
                <th className="py-3 px-4 font-medium">Dono do Cartão / Pagador</th>
                <th className="py-3 px-4 font-medium">Quem Utilizou o Cartão</th>
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
                                ? `Dono do Cartão: ${m.name.split(' ')[0]}`
                                : `Pago por: ${m.name.split(' ')[0]}`}
                            </option>
                          ))}
                        </select>
                        {card && (
                          <span className="text-[10px] text-violet-300 font-medium">
                            Cartão: {card.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <select
                        value={effectiveUsedBy}
                        onChange={(e) => {
                          const selectedUserId = e.target.value;
                          onUpdateTransaction({
                            ...tx,
                            usedById: selectedUserId,
                            beneficiaryId: selectedUserId,
                            splitType:
                              selectedUserId !== tx.paidById
                                ? 'individual'
                                : tx.splitType,
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
                      <select
                        value={currentSplitSelectValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('indiv:')) {
                            const targetMemberId = val.replace('indiv:', '');
                            onUpdateTransaction({
                              ...tx,
                              splitType: 'individual',
                              usedById: targetMemberId,
                              beneficiaryId: targetMemberId,
                              paidById:
                                tx.paymentMethod === 'credit_card'
                                  ? tx.paidById
                                  : targetMemberId,
                            });
                          } else {
                            onUpdateTransaction({
                              ...tx,
                              splitType: val as Transaction['splitType'],
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
