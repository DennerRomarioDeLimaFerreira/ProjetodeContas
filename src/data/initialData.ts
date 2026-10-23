import { Category, CreditCard, FinanceState, Member } from '../types/finance';

export function createInitialFinanceState(): FinanceState {
  const members: Member[] = [
    {
      id: 'm1',
      name: 'Titular 1 (Você)',
      role: 'Membro Principal',
      avatarColor: '#10b981', // emerald
      monthlyIncome: 0,
    },
    {
      id: 'm2',
      name: 'Titular 2 (Parceiro/a)',
      role: 'Co-participante',
      avatarColor: '#8b5cf6', // violet
      monthlyIncome: 0,
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat-moradia',
      name: 'Moradia & Contas',
      icon: 'Home',
      color: '#3b82f6',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'needs',
    },
    {
      id: 'cat-mercado',
      name: 'Supermercado & Feira',
      icon: 'ShoppingCart',
      color: '#10b981',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'needs',
    },
    {
      id: 'cat-restaurante',
      name: 'Restaurantes & iFood',
      icon: 'Utensils',
      color: '#f59e0b',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'wants',
    },
    {
      id: 'cat-transporte',
      name: 'Transporte & Combustível',
      icon: 'Car',
      color: '#06b6d4',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'needs',
    },
    {
      id: 'cat-assinaturas',
      name: 'Assinaturas & Streaming',
      icon: 'Tv',
      color: '#a855f7',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'wants',
    },
    {
      id: 'cat-compras',
      name: 'Compras & Casa',
      icon: 'ShoppingBag',
      color: '#ec4899',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'wants',
    },
    {
      id: 'cat-saude',
      name: 'Saúde & Farmácia',
      icon: 'HeartPulse',
      color: '#ef4444',
      type: 'expense',
      monthlyBudget: 0,
      essentialType: 'needs',
    },
    {
      id: 'cat-lazer',
      name: 'Viagens & Lazer',
      icon: 'Plane',
      color: '#14b8a6',
      type: 'expense',
      monthlyBudget: 0,
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

  const cards: CreditCard[] = [];

  return {
    members,
    categories,
    cards,
    transactions: [],
    settlements: [],
  };
}
