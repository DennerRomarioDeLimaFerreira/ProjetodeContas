import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard as CreditCardIcon,
  DollarSign,
  FileText,
  LogOut,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { AuthSession } from '../types/auth';
import { Category, CreditCard, Member, Transaction } from '../types/finance';
import {
  addMonths,
  calculateMonthlySettlement,
  calculateTransactionShares,
  formatCurrency,
  formatMonthLabel,
} from '../utils/financeUtils';

export interface MemberPersonalViewProps {
  session: AuthSession;
  linkedMemberId: string;
  members: Member[];
  cards: CreditCard[];
  categories: Category[];
  monthTransactions: Transaction[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onSyncFromCloud: () => void;
  isSyncing: boolean;
  onLogout: () => void;
}

type FilterType = 'all' | 'cards' | 'direct';

export const MemberPersonalView: React.FC<MemberPersonalViewProps> = ({
  session,
  linkedMemberId,
  members,
  cards,
  categories,
  monthTransactions,
  selectedMonth,
  onSelectMonth,
  onSyncFromCloud,
  isSyncing,
  onLogout,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Identifica o membro vinculado
  const linkedMember = useMemo(() => {
    return (
      members.find((m) => m.id === linkedMemberId) || {
        id: linkedMemberId,
        name: session.user.name,
        role: 'Participante',
        avatarColor: '#10b981',
        monthlyIncome: 0,
      }
    );
  }, [members, linkedMemberId, session.user.name]);

  // Identifica o titular (geralmente o primeiro membro ou ROOT)
  const householdHolder = useMemo(() => {
    return members.find((m) => m.id !== linkedMemberId) || members[0] || linkedMember;
  }, [members, linkedMemberId, linkedMember]);

  // Executa o cálculo de liquidação mensal oficial
  const settlement = useMemo(() => {
    return calculateMonthlySettlement(monthTransactions, members, undefined, cards);
  }, [monthTransactions, members, cards]);

  const mySummary = useMemo(() => {
    return (
      settlement.summaries.find((s) => s.member.id === linkedMemberId) || {
        member: linkedMember,
        paidOutOfPocket: 0,
        fairShareResponsibility: 0,
        sharedResponsibility: 0,
        individualResponsibility: 0,
        netBalance: 0,
        cardsResponsibility: 0,
        directResponsibility: 0,
        directNetBalance: 0,
      }
    );
  }, [settlement, linkedMemberId, linkedMember]);

  // Transações com participação do membro
  const myTransactions = useMemo(() => {
    return monthTransactions
      .map((tx) => {
        const shares = calculateTransactionShares(tx, members);
        const myShare = shares[linkedMemberId] || 0;
        return {
          tx,
          myShare,
          category: categories.find((c) => c.id === tx.categoryId),
          card: cards.find((c) => c.id === tx.cardId),
        };
      })
      .filter((item) => item.myShare > 0);
  }, [monthTransactions, members, categories, cards, linkedMemberId]);

  // Filtros aplicados
  const filteredTransactions = useMemo(() => {
    return myTransactions.filter((item) => {
      if (filterType === 'cards' && item.tx.paymentMethod !== 'credit_card') {
        return false;
      }
      if (filterType === 'direct' && item.tx.paymentMethod === 'credit_card') {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = item.tx.description.toLowerCase().includes(term);
        const matchesCat = item.category?.name.toLowerCase().includes(term);
        const matchesCard = item.card?.name.toLowerCase().includes(term);
        if (!matchesDesc && !matchesCat && !matchesCard) return false;
      }
      return true;
    });
  }, [myTransactions, filterType, searchTerm]);

  // Cartões onde o membro teve despesas
  const myCardBreakdowns = useMemo(() => {
    return settlement.cardBreakdowns
      .map((cb) => {
        const share = cb.memberShares.find((ms) => ms.memberId === linkedMemberId);
        return {
          card: cb.card,
          totalShare: share?.totalShare || 0,
          isPaid: cb.isPaid,
        };
      })
      .filter((item) => item.totalShare > 0);
  }, [settlement, linkedMemberId]);

  const handleCopyPix = () => {
    // Chave padrão: email do titular ou do sistema
    const pixKey = session.user.email;
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Identificação */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  DuoFinance
                </h1>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  Extrato do Participante
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Olá, <strong className="text-slate-200">{session.user.name}</strong> • Conectado à conta de {householdHolder.name}
              </p>
            </div>
          </div>

          {/* Ações do Topo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSyncFromCloud}
              disabled={isSyncing}
              title="Sincronizar com a Nuvem"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onLogout}
              title="Sair da Conta"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner de Boas-Vindas e Seletor de Mês */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-900/60 p-5 rounded-3xl border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Fatura & Despesas Pessoais
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Extrato de {linkedMember.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Consulte seus gastos em cartões e a sua cota nas despesas da casa em tempo real.
            </p>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl p-1 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onSelectMonth(addMonths(selectedMonth, -1))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 flex items-center gap-1.5 text-xs font-bold text-white min-w-[140px] justify-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatMonthLabel(selectedMonth)}</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectMonth(addMonths(selectedMonth, 1))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Cards de Resumo / KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total a Pagar no Mês */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-emerald-400">
                Total a Transferir
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(mySummary.fairShareResponsibility)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Sua responsabilidade total em {formatMonthLabel(selectedMonth)}</span>
            </p>
          </div>

          {/* Fatura nos Cartões */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">
                Cartões de Crédito
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                <CreditCardIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(mySummary.cardsResponsibility)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Compras feitas no seu nome ou cota
            </p>
          </div>

          {/* Contas Fora do Cartão */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">
                Contas & Boletos
              </span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(mySummary.directResponsibility)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Luz, água, internet e boletos divididos
            </p>
          </div>

          {/* Chave Pix para Pagamento Rápido */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                Pagar via Pix
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-medium">
                1-Clique
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Transfira para {householdHolder.name} ao fechar o mês.
            </p>

            <button
              type="button"
              onClick={handleCopyPix}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                pixCopied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40'
              }`}
            >
              {pixCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Chave Pix Copiada!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Chave Pix
                </>
              )}
            </button>
          </div>
        </div>

        {/* Detalhamento por Cartão (se houver) */}
        {myCardBreakdowns.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-indigo-400" />
              Sua Fatura por Cartão de Crédito
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myCardBreakdowns.map((item) => (
                <div
                  key={item.card.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: item.card.color || '#6366f1' }}
                    >
                      {item.card.brand ? item.card.brand.slice(0, 3).toUpperCase() : 'CC'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {item.card.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.card.lastDigits ? `Final ${item.card.lastDigits}` : 'Fatura do Mês'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-indigo-300">
                      {formatCurrency(item.totalShare)}
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        item.isPaid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.isPaid ? 'Fatura Paga' : 'Aberta'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({myTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'cards'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💳 Cartões
            </button>
            <button
              type="button"
              onClick={() => setFilterType('direct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'direct'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Boletos & Pix
            </button>
          </div>

          {/* Busca por texto */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar no extrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Lançamentos com sua participação ({filteredTransactions.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Modo Leitura • Atualizado pelo Titular da Conta
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/50 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Nenhum lançamento encontrado
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhuma compra corresponde aos termos pesquisados.'
                  : 'Você não possui gastos atribuídos neste mês selecionado.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredTransactions.map((item) => {
                const isCard = item.tx.paymentMethod === 'credit_card';
                const isIndividual = item.tx.splitType === 'individual';
                const installmentLabel =
                  item.tx.installmentTotal && item.tx.installmentTotal > 1
                    ? ` (${item.tx.installmentCurrent || 1}/${item.tx.installmentTotal}x)`
                    : '';

                return (
                  <div
                    key={item.tx.id}
                    className="p-4 hover:bg-slate-850/40 transition flex items-center justify-between gap-3"
                  >
                    {/* Ícone e Detalhes */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                        style={{
                          backgroundColor: item.category?.color || '#3b82f6',
                        }}
                      >
                        {isCard ? (
                          <CreditCardIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{item.tx.description}</span>
                          {installmentLabel && (
                            <span className="text-[10px] text-amber-400 font-semibold">
                              {installmentLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>{item.category?.name || 'Geral'}</span>
                          <span>•</span>
                          <span>
                            {new Date(item.tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span>•</span>
                          {isCard ? (
                            <span className="inline-flex items-center gap-1 text-indigo-300 font-medium">
                              💳 {item.card?.name || 'Cartão'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                              📄 Boleto/Pix
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-slate-500 text-[10px]">
                            {isIndividual ? 'Individual (100%)' : 'Dividido'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-400">
                        {formatCurrency(item.myShare)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Total da compra: {formatCurrency(item.tx.amount)}
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium inline-block mt-0.5 ${
                          item.tx.isPaid
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.tx.isPaid ? 'Liquidado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer Simples */}
      <footer className="mt-auto py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <p>DuoFinance • Gestão Financeira Familiar Compartilhada</p>
      </footer>
    </div>
  );
};
