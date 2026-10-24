import {
  Category,
  CreditCard,
  Member,
  PaymentMethod,
  SplitType,
  Transaction,
} from '../types/finance';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function parseExactNumber(raw: string): number {
  const clean = String(raw || '').replace(/[R$\s]/g, '').trim();
  if (!clean) return 0;
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(clean.replace(/,/g, '')) || 0;
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  return `${newY}-${newM}`;
}

export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const date = new Date(y, m - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const date = new Date(y, m - 1, 1);
  const monthStr = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(date)
    .replace('.', '');
  return `${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}/${String(y).slice(-2)}`;
}

/**
 * Calcula o mês de competência (fatura) para uma compra no cartão de crédito.
 * Se o dia da compra for maior ou igual ao dia de fechamento do cartão,
 * a primeira parcela entra no mês seguinte.
 */
export function computeFirstCompetenceMonth(
  purchaseDateISO: string,
  paymentMethod: PaymentMethod,
  card?: CreditCard
): string {
  const [y, m, d] = purchaseDateISO.split('-').map(Number);
  if (!y || !m) return getCurrentYearMonth();
  const baseMonth = `${y}-${String(m).padStart(2, '0')}`;

  if (paymentMethod === 'credit_card' && card && d >= card.closingDay) {
    return addMonths(baseMonth, 1);
  }
  return baseMonth;
}

/**
 * Calcula quanto cada membro é responsável por pagar em uma transação de despesa.
 * Retorna um mapa { [memberId]: valorEmReais }
 */
export function calculateTransactionShares(
  tx: Transaction,
  members: Member[]
): Record<string, number> {
  const shares: Record<string, number> = {};
  if (members.length === 0) return shares;

  members.forEach((m) => {
    shares[m.id] = 0;
  });

  if (tx.type === 'income') {
    const owner = tx.beneficiaryId || tx.paidById || members[0].id;
    shares[owner] = tx.amount;
    return shares;
  }

  const validParticipantIds = (tx.participantIds || []).filter((id) =>
    members.some((m) => m.id === id)
  );
  const activeMembers =
    validParticipantIds.length > 0
      ? members.filter((m) => validParticipantIds.includes(m.id))
      : members;

  if (tx.splitType === 'individual') {
    const targetId =
      tx.beneficiaryId || tx.usedById || tx.paidById || members[0].id;
    const divisor =
      tx.splitCount && tx.splitCount > 1 ? tx.splitCount : 1;
    shares[targetId] = tx.amount / divisor;
    return shares;
  }

  if (tx.splitType === 'shared_equal') {
    const baseCount = Math.max(1, activeMembers.length);
    const divisor =
      tx.splitCount && tx.splitCount >= baseCount ? tx.splitCount : baseCount;
    const perMember = tx.amount / divisor;
    activeMembers.forEach((m) => {
      shares[m.id] = perMember;
    });
    return shares;
  }

  if (tx.splitType === 'shared_proportional') {
    const totalIncome = activeMembers.reduce(
      (acc, m) => acc + (m.monthlyIncome || 0),
      0
    );
    const baseCount = Math.max(1, activeMembers.length);
    const divisor =
      tx.splitCount && tx.splitCount >= baseCount ? tx.splitCount : baseCount;
    const householdPool = (tx.amount * baseCount) / divisor;

    if (totalIncome <= 0) {
      const perMember = householdPool / baseCount;
      activeMembers.forEach((m) => {
        shares[m.id] = perMember;
      });
      return shares;
    }
    activeMembers.forEach((m) => {
      const weight = (m.monthlyIncome || 0) / totalIncome;
      shares[m.id] = householdPool * weight;
    });
    return shares;
  }

  if (tx.splitType === 'shared_custom' && tx.customSplits) {
    const totalPct = Object.values(tx.customSplits).reduce((a, b) => a + b, 0);
    if (totalPct <= 0) {
      const perMember = tx.amount / Math.max(1, activeMembers.length);
      activeMembers.forEach((m) => {
        shares[m.id] = perMember;
      });
      return shares;
    }
    members.forEach((m) => {
      const pct = tx.customSplits?.[m.id] ?? 0;
      shares[m.id] = (tx.amount * pct) / totalPct;
    });
    return shares;
  }

  // Fallback
  const perMember = tx.amount / Math.max(1, activeMembers.length);
  activeMembers.forEach((m) => {
    shares[m.id] = perMember;
  });
  return shares;
}

export interface MemberBalanceSummary {
  member: Member;
  paidOutOfPocket: number;       // Total que este membro desembolsou (ou passou no próprio cartão)
  fairShareResponsibility: number; // Quanto este membro realmente deveria custear (individuais dele + parte dele nos compartilhados)
  sharedResponsibility: number;    // Apenas a parte dele nos gastos compartilhados
  individualResponsibility: number; // Apenas gastos individuais dele
  netBalance: number;              // Positivo = tem a receber; Negativo = tem a pagar
}

export interface TransferSuggestion {
  fromMember: Member;
  toMember: Member;
  amount: number;
}

/**
 * Calcula o balanço de finanças compartilhadas do mês e quem deve transferir quanto para quem.
 */
export function calculateMonthlySettlement(
  transactions: Transaction[],
  members: Member[],
  alreadySettledAmountForPair?: { fromId: string; toId: string; amount: number }[]
): {
  summaries: MemberBalanceSummary[];
  transfers: TransferSuggestion[];
  totalSharedExpenses: number;
  totalIndividualExpenses: number;
} {
  const expenses = transactions.filter((t) => t.type === 'expense');

  const paidMap: Record<string, number> = {};
  const settledPaidMap: Record<string, number> = {};
  const fairShareMap: Record<string, number> = {};
  const sharedRespMap: Record<string, number> = {};
  const individualRespMap: Record<string, number> = {};

  members.forEach((m) => {
    paidMap[m.id] = 0;
    settledPaidMap[m.id] = 0;
    fairShareMap[m.id] = 0;
    sharedRespMap[m.id] = 0;
    individualRespMap[m.id] = 0;
  });

  let totalSharedExpenses = 0;
  let totalIndividualExpenses = 0;

  expenses.forEach((tx) => {
    const payerId = tx.paidById || members[0]?.id;
    const shares = calculateTransactionShares(tx, members);
    const assignedTotal = Object.values(shares).reduce((a, b) => a + b, 0);

    if (payerId && paidMap[payerId] !== undefined) {
      paidMap[payerId] += tx.amount;
      settledPaidMap[payerId] += assignedTotal;
    }

    if (tx.splitType === 'individual') {
      totalIndividualExpenses += tx.amount;
    } else {
      totalSharedExpenses += tx.amount;
    }

    members.forEach((m) => {
      const share = shares[m.id] || 0;
      fairShareMap[m.id] += share;
      if (tx.splitType === 'individual') {
        individualRespMap[m.id] += share;
      } else {
        sharedRespMap[m.id] += share;
      }
    });
  });

  // Ajusta acertos já realizados no mês
  if (alreadySettledAmountForPair) {
    alreadySettledAmountForPair.forEach((s) => {
      if (paidMap[s.fromId] !== undefined) paidMap[s.fromId] += s.amount;
      if (paidMap[s.toId] !== undefined) paidMap[s.toId] -= s.amount;
      if (settledPaidMap[s.fromId] !== undefined)
        settledPaidMap[s.fromId] += s.amount;
      if (settledPaidMap[s.toId] !== undefined)
        settledPaidMap[s.toId] -= s.amount;
    });
  }

  const summaries: MemberBalanceSummary[] = members.map((m) => {
    const paidOutOfPocket = paidMap[m.id] || 0;
    const effectivePaidForSettlement = settledPaidMap[m.id] || 0;
    const fairShareResponsibility = fairShareMap[m.id] || 0;
    const netBalance = effectivePaidForSettlement - fairShareResponsibility;
    return {
      member: m,
      paidOutOfPocket,
      fairShareResponsibility,
      sharedResponsibility: sharedRespMap[m.id] || 0,
      individualResponsibility: individualRespMap[m.id] || 0,
      netBalance,
    };
  });

  // Algoritmo guloso para minimizar transferências entre devedores e credores
  const debtors = summaries
    .filter((s) => s.netBalance < -0.01)
    .map((s) => ({ member: s.member, amount: Math.abs(s.netBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = summaries
    .filter((s) => s.netBalance > 0.01)
    .map((s) => ({ member: s.member, amount: s.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: TransferSuggestion[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.001) {
      transfers.push({
        fromMember: debtor.member,
        toMember: creditor.member,
        amount: transferAmount,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return {
    summaries,
    transfers,
    totalSharedExpenses,
    totalIndividualExpenses,
  };
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'Pix',
  debit: 'Débito',
  boleto: 'Boleto',
  cash: 'Dinheiro',
};

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  shared_equal: 'Compartilhado (50/50)',
  shared_proportional: 'Compartilhado (Proporcional à Renda)',
  shared_custom: 'Compartilhado (Personalizado)',
  individual: 'Individual (100% de 1 pessoa)',
};

/**
 * Interpretador de entrada rápida em linguagem natural:
 * Ex: "Supermercado Pão de Açúcar 385,90 2x Nubank compartilhado"
 * Ex: "Uber 24,50 pix individual"
 */
export function parseQuickEntry(
  rawText: string,
  categories: Category[],
  cards: CreditCard[],
  members: Member[]
): {
  description: string;
  amount: number;
  installments: number;
  paymentMethod: PaymentMethod;
  cardId?: string;
  categoryId: string;
  splitType: SplitType;
  paidById: string;
} | null {
  const text = rawText.trim();
  if (!text) return null;

  // Detecta parcelas ex: 3x, 10x, 12X
  let installments = 1;
  let cleaned = text;
  const installmentMatch = cleaned.match(/\b(\d{1,2})[xX]\b/);
  if (installmentMatch) {
    installments = Math.max(1, Math.min(48, parseInt(installmentMatch[1], 10)));
    cleaned = cleaned.replace(installmentMatch[0], ' ');
  }

  // Detecta valor monetário (ex: R$ 1.250,90 ou 125,50 ou 89.90 ou 150)
  const amountRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/g;
  const matches = [...cleaned.matchAll(amountRegex)];
  if (matches.length === 0) return null;

  // Pega o último número que parece valor
  const amountMatch = matches[matches.length - 1];
  const rawNumber = amountMatch[1];
  let amount = 0;
  if (rawNumber.includes(',') && rawNumber.includes('.')) {
    amount = parseFloat(rawNumber.replace(/\./g, '').replace(',', '.'));
  } else if (rawNumber.includes(',')) {
    amount = parseFloat(rawNumber.replace(',', '.'));
  } else {
    amount = parseFloat(rawNumber);
  }

  if (isNaN(amount) || amount <= 0) return null;
  cleaned =
    cleaned.slice(0, amountMatch.index) +
    ' ' +
    cleaned.slice((amountMatch.index || 0) + amountMatch[0].length);

  // Detecta cartão pelo nome
  let matchedCard: CreditCard | undefined;
  for (const card of cards) {
    const regex = new RegExp(`\\b${card.name}\\b|\\b${card.brand}\\b`, 'i');
    if (regex.test(cleaned)) {
      matchedCard = card;
      cleaned = cleaned.replace(regex, ' ');
      break;
    }
  }

  // Detecta método de pagamento
  let paymentMethod: PaymentMethod =
    matchedCard || installments > 1 ? 'credit_card' : 'pix';

  if (/\bpix\b/i.test(cleaned)) {
    paymentMethod = 'pix';
    cleaned = cleaned.replace(/\bpix\b/i, ' ');
  } else if (/\bd[eé]bito\b/i.test(cleaned)) {
    paymentMethod = 'debit';
    cleaned = cleaned.replace(/\bd[eé]bito\b/i, ' ');
  } else if (/\bboleto\b/i.test(cleaned)) {
    paymentMethod = 'boleto';
    cleaned = cleaned.replace(/\bboleto\b/i, ' ');
  } else if (/\bdinheiro\b/i.test(cleaned)) {
    paymentMethod = 'cash';
    cleaned = cleaned.replace(/\bdinheiro\b/i, ' ');
  } else if (/\bcart[aã]o\b|\bcr[eé]dito\b/i.test(cleaned)) {
    paymentMethod = 'credit_card';
    cleaned = cleaned.replace(/\bcart[aã]o\b|\bcr[eé]dito\b/gi, ' ');
  }

  if (paymentMethod === 'credit_card' && !matchedCard && cards.length > 0) {
    matchedCard = cards[0];
  }

  // Detecta tipo de divisão
  let splitType: SplitType = 'shared_equal';
  if (/\bproporcional\b/i.test(cleaned)) {
    splitType = 'shared_proportional';
    cleaned = cleaned.replace(/\bproporcional\b/i, ' ');
  } else if (/\bindividual\b|\bmeu\b|\bminha\b/i.test(cleaned)) {
    splitType = 'individual';
    cleaned = cleaned.replace(/\bindividual\b|\bmeu\b|\bminha\b/gi, ' ');
  } else if (/\bcompartilhad[oa]\b|\bcasal\b|\bcasa\b|\bdividid[oa]\b/i.test(cleaned)) {
    splitType = 'shared_equal';
    cleaned = cleaned.replace(/\bcompartilhad[oa]\b|\bcasal\b|\bcasa\b|\bdividid[oa]\b/gi, ' ');
  }

  const description =
    cleaned.replace(/\s+/g, ' ').trim() || 'Despesa Rápida';

  const categoryId = guessCategoryByDescription(description, categories);
  const paidById = matchedCard?.holderId || members[0]?.id || 'm1';

  return {
    description,
    amount,
    installments,
    paymentMethod,
    cardId: paymentMethod === 'credit_card' ? matchedCard?.id : undefined,
    categoryId,
    splitType,
    paidById,
  };
}

/**
 * Categorização inteligente automática por palavras-chave (usada no input rápido e importação CSV/OFX)
 */
export function guessCategoryByDescription(
  description: string,
  categories: Category[]
): string {
  const lower = description.toLowerCase();
  const keywordMap: { keywords: string[]; categoryNamePattern: RegExp }[] = [
    {
      keywords: [
        'mercado',
        'supermercado',
        'atacadao',
        'assai',
        'carrefour',
        'pao de acucar',
        'hortifruti',
        'padaria',
        'acougue',
      ],
      categoryNamePattern: /mercado|alimenta/i,
    },
    {
      keywords: [
        'ifood',
        'rappi',
        'restaurante',
        'lanchonete',
        'burger',
        'pizza',
        'outback',
        'jantar',
        'almoco',
        'cafe',
        'bar',
      ],
      categoryNamePattern: /restaurante|delivery|lazer|alimenta/i,
    },
    {
      keywords: [
        'uber',
        '99app',
        '99pop',
        'posto',
        'gasolina',
        'combustivel',
        'ipiranga',
        'shell',
        'estacionamento',
        'sem parar',
        'veloe',
        'metro',
        'onibus',
      ],
      categoryNamePattern: /transporte|mobilidade/i,
    },
    {
      keywords: [
        'aluguel',
        'condominio',
        'energia',
        'luz',
        'enel',
        'agua',
        'sabesp',
        'gas',
        'iptu',
        'internet',
        'vivo',
        'claro',
        'tim',
        'faxina',
      ],
      categoryNamePattern: /moradia|casa|contas/i,
    },
    {
      keywords: [
        'netflix',
        'spotify',
        'amazon prime',
        'disney',
        'hbo',
        'max',
        'youtube',
        'icloud',
        'google one',
        'chatgpt',
        'assinatura',
      ],
      categoryNamePattern: /assinatura|streaming/i,
    },
    {
      keywords: [
        'farmacia',
        'drogasil',
        'droga raia',
        'pague menos',
        'medico',
        'consulta',
        'exame',
        'hospital',
        'dentista',
        'academia',
        'smartfit',
      ],
      categoryNamePattern: /sa[uú]de|farm[aá]cia/i,
    },
    {
      keywords: [
        'mercadolivre',
        'mercado livre',
        'amazon',
        'shopee',
        'magalu',
        'shein',
        'zara',
        'renner',
        'roupa',
        'presente',
        'eletronico',
      ],
      categoryNamePattern: /compras|shopping|vestu[aá]rio/i,
    },
    {
      keywords: ['hotel', 'airbnb', 'latam', 'gol', 'azul', 'viagem', 'passagem', 'booking'],
      categoryNamePattern: /viagem|lazer/i,
    },
  ];

  for (const rule of keywordMap) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      const found = categories.find(
        (c) => c.type !== 'income' && rule.categoryNamePattern.test(c.name)
      );
      if (found) return found.id;
    }
  }

  const defaultExpenseCat = categories.find((c) => c.type !== 'income');
  return defaultExpenseCat?.id || categories[0]?.id || 'cat-outros';
}
