import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard as CreditCardIcon,
  Layers,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Category,
  CreditCard,
  Member,
  SettlementRecord,
  Transaction,
} from '../types/finance';
import {
  addMonths,
  calculateMonthlySettlement,
  formatCurrency,
  formatShortMonthLabel,
} from '../utils/financeUtils';

interface DashboardViewProps {
  selectedMonth: string;
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  cards: CreditCard[];
  members: Member[];
  settlements: SettlementRecord[];
  onNavigateTab: (tab: 'transactions' | 'cards' | 'shared' | 'budgets') => void;
  onSelectMonth: (month: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedMonth,
  transactions,
  allTransactions,
  categories,
  cards,
  members,
  settlements,
  onNavigateTab,
  onSelectMonth,
}) => {
  const monthIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const combinedRegisteredIncome = members.reduce(
    (acc, m) => acc + (m.monthlyIncome || 0),
    0
  );

  const effectiveIncome = monthIncomes > 0 ? monthIncomes : combinedRegisteredIncome;

  const monthExpenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = monthExpenses.reduce((acc, t) => acc + t.amount, 0);

  const cardExpenses = monthExpenses
    .filter((t) => t.paymentMethod === 'credit_card')
    .reduce((acc, t) => acc + t.amount, 0);

  const installmentExpenses = monthExpenses
    .filter((t) => (t.installmentTotal || 1) > 1)
    .reduce((acc, t) => acc + t.amount, 0);

  const monthSettlements = settlements
    .filter((s) => s.competenceMonth === selectedMonth)
    .map((s) => ({
      fromId: s.fromMemberId,
      toId: s.toMemberId,
      amount: s.amount,
    }));

  const settlementData = calculateMonthlySettlement(
    monthExpenses,
    members,
    monthSettlements
  );

  const balance = effectiveIncome - totalExpenses;

  // Dados por Categoria
  const categoryBreakdown = categories
    .filter((c) => c.type !== 'income')
    .map((cat) => {
      const spent = monthExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      const pctOfTotal = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
      const budgetPct =
        cat.monthlyBudget > 0 ? (spent / cat.monthlyBudget) * 100 : 0;
      return {
        category: cat,
        spent,
        pctOfTotal,
        budgetPct,
        isOverBudget: cat.monthlyBudget > 0 && spent > cat.monthlyBudget,
        isNearBudget:
          cat.monthlyBudget > 0 &&
          spent >= cat.monthlyBudget * 0.8 &&
          spent <= cat.monthlyBudget,
      };
    })
    .filter((item) => item.spent > 0 || item.category.monthlyBudget > 0)
    .sort((a, b) => b.spent - a.spent);

  const overBudgetCount = categoryBreakdown.filter((c) => c.isOverBudget).length;

  // Projeção de 6 meses (-1 mês até +4 meses) para visualizar impacto de parcelas futuras e recorrentes
  const timelineMonths = [-1, 0, 1, 2, 3, 4].map((offset) =>
    addMonths(selectedMonth, offset)
  );

  const timelineStats = timelineMonths.map((m) => {
    const mTxs = allTransactions.filter(
      (t) => t.competenceMonth === m && t.type === 'expense'
    );
    const inst = mTxs
      .filter((t) => (t.installmentTotal || 1) > 1)
      .reduce((a, t) => a + t.amount, 0);
    const rec = mTxs
      .filter((t) => t.isRecurring && (t.installmentTotal || 1) === 1)
      .reduce((a, t) => a + t.amount, 0);
    const single = mTxs
      .filter((t) => !t.isRecurring && (t.installmentTotal || 1) === 1)
      .reduce((a, t) => a + t.amount, 0);
    return {
      month: m,
      label: formatShortMonthLabel(m),
      inst,
      rec,
      single,
      total: inst + rec + single,
    };
  });

  const maxTimelineTotal = Math.max(
    ...timelineStats.map((s) => s.total),
    effectiveIncome * 0.6,
    1000
  );

  // Construção do Donut SVG
  let cumulativePercent = 0;
  const donutSegments = categoryBreakdown
    .filter((c) => c.spent > 0)
    .map((item) => {
      const startPct = cumulativePercent;
      cumulativePercent += item.pctOfTotal;
      return {
        ...item,
        startPct,
        dashArray: `${item.pctOfTotal} ${100 - item.pctOfTotal}`,
        dashOffset: 100 - startPct + 25,
      };
    });

  return (
    <div className="space-y-6">
      {/* Alertas de Metas Estouradas */}
      {overBudgetCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-200">
                Atenção ao Orçamento Mensal
              </h4>
              <p className="text-xs text-amber-300/80">
                Você possui {overBudgetCount}{' '}
                {overBudgetCount === 1
                  ? 'categoria que ultrapassou'
                  : 'categorias que ultrapassaram'}{' '}
                a meta definida para este mês.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('budgets')}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/20 px-3 py-2 rounded-xl transition"
          >
            Ver Metas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receitas & Saldo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Receita Familiar / Mensal
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(effectiveIncome)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Saldo livre do mês:</span>
              <span
                className={`font-semibold ${
                  balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                totalExpenses > effectiveIncome ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  effectiveIncome > 0 ? (totalExpenses / effectiveIncome) * 100 : 0
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Card 2: Despesas Totais */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Despesas do Mês
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalExpenses)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Comprometimento da renda:</span>
              <span className="font-semibold text-slate-200">
                {effectiveIncome > 0
                  ? `${((totalExpenses / effectiveIncome) * 100).toFixed(2)}%`
                  : '0%'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Compartilhado: {formatCurrency(settlementData.totalSharedExpenses)}</span>
            <span>Individual: {formatCurrency(settlementData.totalIndividualExpenses)}</span>
          </div>
        </div>

        {/* Card 3: Cartões & Parcelas */}
        <div
          onClick={() => onNavigateTab('cards')}
          className="bg-slate-900/90 border border-slate-800 hover:border-violet-500/40 cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 group-hover:text-violet-300 transition">
              Faturas de Cartão no Mês
            </span>
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
              <CreditCardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(cardExpenses)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-violet-400" /> Em parcelas:
              </span>
              <span className="font-semibold text-violet-300">
                {formatCurrency(installmentExpenses)}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-violet-400 font-medium flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{cards.length} cartões ativos</span>
            <span className="flex items-center gap-1">
              Ver faturas <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Acerto de Contas Compartilhado */}
        <div
          onClick={() => onNavigateTab('shared')}
          className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">
              Acerto de Contas do Mês
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            {settlementData.transfers.length > 0 ? (
              <>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(settlementData.transfers[0].amount)}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  <span className="font-semibold text-amber-300">
                    {settlementData.transfers[0].fromMember.name.split(' ')[0]}
                  </span>{' '}
                  transfere para{' '}
                  <span className="font-semibold text-emerald-300">
                    {settlementData.transfers[0].toMember.name.split(' ')[0]}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-emerald-300">
                  Tudo Quitado!
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Nenhuma pendência entre os membros neste mês.
                </div>
              </>
            )}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center justify-between pt-1 border-t border-emerald-500/20">
            <span>Divisão justa calculada</span>
            <span className="flex items-center gap-1">
              Detalhar acerto <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Principais: Projeção de 6 Meses + Donut de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolução e Projeção de Parcelas / Gastos (7 colunas) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Fluxo Mensal & Projeção de Parcelas Futuras
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em qualquer mês para inspecionar as faturas e parcelas daquele período
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />
                  Parcelados
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
                  Fixos/Recorrentes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  Variáveis à Vista
                </span>
              </div>
            </div>

            {/* Gráfico de Barras Empilhadas */}
            <div className="grid grid-cols-6 gap-3 items-end h-56 pt-6 px-2 border-b border-slate-800">
              {timelineStats.map((stat) => {
                const isSelected = stat.month === selectedMonth;
                const instHeight =
                  maxTimelineTotal > 0 ? (stat.inst / maxTimelineTotal) * 100 : 0;
                const recHeight =
                  maxTimelineTotal > 0 ? (stat.rec / maxTimelineTotal) * 100 : 0;
                const singleHeight =
                  maxTimelineTotal > 0 ? (stat.single / maxTimelineTotal) * 100 : 0;

                return (
                  <button
                    key={stat.month}
                    onClick={() => onSelectMonth(stat.month)}
                    className={`group flex flex-col items-center h-full justify-end rounded-xl p-1.5 transition ${
                      isSelected
                        ? 'bg-slate-800/90 ring-1 ring-emerald-500/50'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-300 mb-1.5 text-center leading-tight">
                      {formatCurrency(stat.total)}
                    </span>
                    <div className="w-full max-w-[44px] h-36 bg-slate-950 rounded-lg overflow-hidden flex flex-col justify-end p-0.5 border border-slate-800/80">
                      {stat.single > 0 && (
                        <div
                          style={{ height: `${Math.max(4, singleHeight)}%` }}
                          className="w-full bg-emerald-500 rounded-t-sm transition-all"
                          title={`À vista: ${formatCurrency(stat.single)}`}
                        />
                      )}
                      {stat.rec > 0 && (
                        <div
                          style={{ height: `${Math.max(4, recHeight)}%` }}
                          className="w-full bg-cyan-500 transition-all"
                          title={`Fixos/Recorrentes: ${formatCurrency(stat.rec)}`}
                        />
                      )}
                      {stat.inst > 0 && (
                        <div
                          style={{ height: `${Math.max(4, instHeight)}%` }}
                          className="w-full bg-violet-500 rounded-b-sm transition-all"
                          title={`Parcelas: ${formatCurrency(stat.inst)}`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        isSelected ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {stat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumo por Membro na parte inferior do card */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settlementData.summaries.map((sum) => (
              <div
                key={sum.member.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950"
                    style={{ backgroundColor: sum.member.avatarColor }}
                  >
                    {sum.member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {sum.member.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Pagou: {formatCurrency(sum.paidOutOfPocket)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Parte Justa</div>
                  <div className="text-xs font-bold text-slate-200">
                    {formatCurrency(sum.fairShareResponsibility)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico Donut de Categorias & Metas (5 colunas) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  Gastos por Categoria
                </h3>
                <p className="text-xs text-slate-400">
                  Distribuição das despesas e limite do mês
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('budgets')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Editar metas
              </button>
            </div>

            {/* Donut SVG */}
            <div className="flex items-center justify-center my-4">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 42 42" className="w-full h-full">
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="5"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.category.id}
                      cx="21"
                      cy="21"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={seg.category.color}
                      strokeWidth="5.2"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Total Mês
                  </span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de Categorias com Barra de Meta */}
            <div className="space-y-3 mt-4 max-h-60 overflow-y-auto pr-1">
              {categoryBreakdown.map((item) => (
                <div key={item.category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.category.color }}
                      />
                      <span className="font-medium text-slate-200">
                        {item.category.name}
                      </span>
                      {item.isOverBudget && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-semibold">
                          Limite Excedido
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-white">
                        {formatCurrency(item.spent)}
                      </span>
                      {item.category.monthlyBudget > 0 && (
                        <span className="text-slate-500 text-[11px]">
                          {' '}
                          / {formatCurrency(item.category.monthlyBudget)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          item.category.monthlyBudget > 0
                            ? item.budgetPct
                            : item.pctOfTotal
                        )}%`,
                        backgroundColor: item.isOverBudget
                          ? '#f43f5e'
                          : item.isNearBudget
                          ? '#f59e0b'
                          : item.category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Total de Lançamentos no Mês: {transactions.length}
            </span>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-emerald-400 hover:underline font-medium"
            >
              Ver extrato completo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
