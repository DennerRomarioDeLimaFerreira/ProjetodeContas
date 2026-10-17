import { Category, CreditCard, FinanceState, Member, Transaction } from '../types/finance';
import { addMonths, getCurrentYearMonth } from '../utils/financeUtils';

export function createInitialFinanceState(): FinanceState {
  const currentMonth = getCurrentYearMonth();
  const prevMonth = addMonths(currentMonth, -1);

  const members: Member[] = [
    {
      id: 'm1',
      name: 'Você (Titular 1)',
      role: 'Membro Principal',
      avatarColor: '#10b981', // emerald
      monthlyIncome: 7500,
    },
    {
      id: 'm2',
      name: 'Parceiro(a) (Titular 2)',
      role: 'Co-participante',
      avatarColor: '#8b5cf6', // violet
      monthlyIncome: 5500,
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat-moradia',
      name: 'Moradia & Contas',
      icon: 'Home',
      color: '#3b82f6',
      type: 'expense',
      monthlyBudget: 3200,
      essentialType: 'needs',
    },
    {
      id: 'cat-mercado',
      name: 'Supermercado & Feira',
      icon: 'ShoppingCart',
      color: '#10b981',
      type: 'expense',
      monthlyBudget: 1800,
      essentialType: 'needs',
    },
    {
      id: 'cat-restaurante',
      name: 'Restaurantes & iFood',
      icon: 'Utensils',
      color: '#f59e0b',
      type: 'expense',
      monthlyBudget: 900,
      essentialType: 'wants',
    },
    {
      id: 'cat-transporte',
      name: 'Transporte & Combustível',
      icon: 'Car',
      color: '#06b6d4',
      type: 'expense',
      monthlyBudget: 800,
      essentialType: 'needs',
    },
    {
      id: 'cat-assinaturas',
      name: 'Assinaturas & Streaming',
      icon: 'Tv',
      color: '#a855f7',
      type: 'expense',
      monthlyBudget: 250,
      essentialType: 'wants',
    },
    {
      id: 'cat-compras',
      name: 'Compras & Casa',
      icon: 'ShoppingBag',
      color: '#ec4899',
      type: 'expense',
      monthlyBudget: 1200,
      essentialType: 'wants',
    },
    {
      id: 'cat-saude',
      name: 'Saúde & Farmácia',
      icon: 'HeartPulse',
      color: '#ef4444',
      type: 'expense',
      monthlyBudget: 600,
      essentialType: 'needs',
    },
    {
      id: 'cat-lazer',
      name: 'Viagens & Lazer',
      icon: 'Plane',
      color: '#14b8a6',
      type: 'expense',
      monthlyBudget: 1000,
      essentialType: 'wants',
    },
    {
      id: 'cat-renda',
      name: 'Salário & Receitas',
      icon: 'Wallet',
      color: '#22c55e',
      type: 'income',
      monthlyBudget: 0,
      essentialType: 'savings',
    },
  ];

  const cards: CreditCard[] = [
    {
      id: 'card-nubank',
      name: 'Nubank Ultravioleta',
      brand: 'Nubank',
      color: '#820ad1',
      limit: 12000,
      closingDay: 5,
      dueDay: 12,
      holderId: 'm1',
      lastDigits: '4821',
    },
    {
      id: 'card-itau',
      name: 'Itaú Personalité',
      brand: 'Itaú',
      color: '#ea580c',
      limit: 9000,
      closingDay: 15,
      dueDay: 22,
      holderId: 'm2',
      lastDigits: '9034',
    },
    {
      id: 'card-c6',
      name: 'C6 Carbon Casa',
      brand: 'C6 Bank',
      color: '#334155',
      limit: 8000,
      closingDay: 10,
      dueDay: 18,
      holderId: 'm1',
      lastDigits: '1175',
    },
  ];

  const transactions: Transaction[] = [
    // Receitas do mês atual
    {
      id: 'tx-inc-1',
      description: 'Salário Mensal (Titular 1)',
      amount: 7500,
      date: `${currentMonth}-05`,
      competenceMonth: currentMonth,
      type: 'income',
      categoryId: 'cat-renda',
      paymentMethod: 'pix',
      paidById: 'm1',
      beneficiaryId: 'm1',
      splitType: 'individual',
      isPaid: true,
    },
    {
      id: 'tx-inc-2',
      description: 'Salário Mensal (Titular 2)',
      amount: 5500,
      date: `${currentMonth}-05`,
      competenceMonth: currentMonth,
      type: 'income',
      categoryId: 'cat-renda',
      paymentMethod: 'pix',
      paidById: 'm2',
      beneficiaryId: 'm2',
      splitType: 'individual',
      isPaid: true,
    },
    // Contas fixas compartilhadas da casa
    {
      id: 'tx-exp-aluguel',
      description: 'Aluguel + Condomínio',
      amount: 2450,
      date: `${currentMonth}-06`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-moradia',
      paymentMethod: 'boleto',
      paidById: 'm1',
      splitType: 'shared_proportional',
      isRecurring: true,
      isPaid: true,
    },
    {
      id: 'tx-exp-luz-net',
      description: 'Energia Enel + Fibra Vivo 600MB',
      amount: 340,
      date: `${currentMonth}-10`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-moradia',
      paymentMethod: 'pix',
      paidById: 'm2',
      splitType: 'shared_equal',
      isRecurring: true,
      isPaid: true,
    },
    // Supermercado
    {
      id: 'tx-exp-mercado-1',
      description: 'Supermercado Pão de Açúcar (Compra do Mês)',
      amount: 980.5,
      date: `${currentMonth}-08`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-mercado',
      paymentMethod: 'credit_card',
      cardId: 'card-c6',
      paidById: 'm1',
      splitType: 'shared_equal',
      isPaid: false,
    },
    {
      id: 'tx-exp-mercado-2',
      description: 'Hortifruti & Padaria Semanal',
      amount: 320.0,
      date: `${currentMonth}-14`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-mercado',
      paymentMethod: 'pix',
      paidById: 'm2',
      splitType: 'shared_equal',
      isPaid: true,
    },
    // Restaurantes & Delivery
    {
      id: 'tx-exp-rest-1',
      description: 'Jantar Especial Fim de Semana + iFood',
      amount: 460.0,
      date: `${currentMonth}-12`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-restaurante',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      paidById: 'm1',
      splitType: 'shared_equal',
      isPaid: false,
    },
    // Assinaturas Recorrentes no Cartão
    {
      id: 'tx-exp-stream-1',
      description: 'Netflix 4K + Spotify Duo + Amazon Prime',
      amount: 114.7,
      date: `${currentMonth}-03`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-assinaturas',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      paidById: 'm1',
      splitType: 'shared_equal',
      isRecurring: true,
      isPaid: false,
    },
    // Despesas Individuais no Cartão
    {
      id: 'tx-exp-indiv-1',
      description: 'Academia & Suplementos (Individual Titular 1)',
      amount: 260.0,
      date: `${currentMonth}-04`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-saude',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      paidById: 'm1',
      beneficiaryId: 'm1',
      splitType: 'individual',
      isPaid: false,
    },
    {
      id: 'tx-exp-indiv-2',
      description: 'Curso Online & Livros (Individual Titular 2)',
      amount: 195.0,
      date: `${currentMonth}-09`,
      competenceMonth: currentMonth,
      type: 'expense',
      categoryId: 'cat-compras',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      paidById: 'm2',
      beneficiaryId: 'm2',
      splitType: 'individual',
      isPaid: false,
    },
  ];

  // Gerar compra parcelada 1: Lava e Seca Samsung em 6x de R$ 550 (R$ 3.300 total) no Nubank (Compartilhado 50/50)
  // Começou no mês anterior (parcela 1/6 no prevMonth, 2/6 no currentMonth, etc.)
  for (let i = 1; i <= 6; i++) {
    const compMonth = addMonths(prevMonth, i - 1);
    transactions.push({
      id: `tx-inst-lavaseca-${i}`,
      groupId: 'grp-lavaseca',
      description: 'Lava e Seca Samsung Inox',
      amount: 550,
      totalPurchaseAmount: 3300,
      date: `${prevMonth}-02`,
      competenceMonth: compMonth,
      type: 'expense',
      categoryId: 'cat-compras',
      paymentMethod: 'credit_card',
      cardId: 'card-nubank',
      paidById: 'm1',
      splitType: 'shared_equal',
      installmentCurrent: i,
      installmentTotal: 6,
      isPaid: compMonth < currentMonth,
    });
  }

  // Gerar compra parcelada 2: Passagens Aéreas Férias em 4x de R$ 420 (R$ 1.680 total) no Itaú (Compartilhado Proporcional)
  // Começou neste mês (1/4 no currentMonth)
  for (let i = 1; i <= 4; i++) {
    const compMonth = addMonths(currentMonth, i - 1);
    transactions.push({
      id: `tx-inst-viagem-${i}`,
      groupId: 'grp-viagem',
      description: 'Passagens Aéreas LATAM (Férias)',
      amount: 420,
      totalPurchaseAmount: 1680,
      date: `${currentMonth}-07`,
      competenceMonth: compMonth,
      type: 'expense',
      categoryId: 'cat-lazer',
      paymentMethod: 'credit_card',
      cardId: 'card-itau',
      paidById: 'm2',
      splitType: 'shared_proportional',
      installmentCurrent: i,
      installmentTotal: 4,
      isPaid: false,
    });
  }

  return {
    members,
    categories,
    cards,
    transactions,
    settlements: [],
  };
}
