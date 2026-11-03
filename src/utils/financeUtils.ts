import {
  Category,
  CreditCard,
  CardInvoiceBreakdown,
  CardInvoiceMemberShare,
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
  paidOutOfPocket: number;       // Total desembolsado diretamente (ou fatura já paga se titular)
  fairShareResponsibility: number; // Custo justo total do membro no mês (cartões + diretos)
  sharedResponsibility: number;    // Apenas a parte dele nos gastos compartilhados
  individualResponsibility: number; // Apenas gastos individuais dele
  netBalance: number;              // Saldo líquido direto (apenas de contas fora do cartão)
  cardsResponsibility: number;     // Total que deve destinar para faturas de cartão
  directResponsibility: number;    // Total devido em contas diretas (Pix/Dinheiro)
  directNetBalance: number;        // Saldo de acerto direto entre pessoas
}

export interface TransferSuggestion {
  fromMember: Member;
  toMember: Member;
  amount: number;
}

/**
 * Calcula o detalhamento da fatura de cada cartão de crédito para o mês.
 * O dinheiro vai para a fatura do cartão, e não abatido entre participantes!
 */
export function calculateCardInvoiceBreakdowns(
  transactions: Transaction[],
  cards: CreditCard[],
  members: Member[]
): CardInvoiceBreakdown[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return cards.map((card) => {
    const cardTxs = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.paymentMethod === 'credit_card' &&
        t.cardId === card.id
    );

    const invoiceTotal = cardTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
    const isPaid = cardTxs.length > 0 && cardTxs.every((t) => t.isPaid);
    const holder = memberMap.get(card.holderId);

    const memberSharesMap: Record<
      string,
      { individual: number; shared: number; total: number }
    > = {};

    members.forEach((m) => {
      memberSharesMap[m.id] = { individual: 0, shared: 0, total: 0 };
    });

    cardTxs.forEach((tx) => {
      const shares = calculateTransactionShares(tx, members);
      const isIndiv = tx.splitType === 'individual';
      members.forEach((m) => {
        const val = shares[m.id] || 0;
        if (val > 0) {
          if (isIndiv) {
            memberSharesMap[m.id].individual += val;
          } else {
            memberSharesMap[m.id].shared += val;
          }
          memberSharesMap[m.id].total += val;
        }
      });
    });

    const memberShares: CardInvoiceMemberShare[] = members.map((m) => {
      const st = memberSharesMap[m.id] || { individual: 0, shared: 0, total: 0 };
      const percentage = invoiceTotal > 0 ? (st.total / invoiceTotal) * 100 : 0;
      return {
        memberId: m.id,
        memberName: m.name,
        avatarColor: m.avatarColor,
        isHolder: m.id === card.holderId,
        individualTotal: st.individual,
        sharedTotal: st.shared,
        totalShare: st.total,
        percentage,
      };
    });

    return {
      card,
      holder,
      invoiceTotal,
      isPaid,
      memberShares,
      transactionsCount: cardTxs.length,
    };
  });
}

/**
 * Calcula o balanço mensal dividindo com precisão:
 * 1. Faturas de Cartão (o valor é destinado à fatura do cartão respectivo)
 * 2. Despesas Diretas (Pix/Dinheiro/Débito - acertadas diretamente entre pessoas sem abater cartão)
 */
export function calculateMonthlySettlement(
  transactions: Transaction[],
  members: Member[],
  alreadySettledAmountForPair?: { fromId: string; toId: string; amount: number }[],
  cards: CreditCard[] = []
): {
  summaries: MemberBalanceSummary[];
  transfers: TransferSuggestion[];
  cardBreakdowns: CardInvoiceBreakdown[];
  totalSharedExpenses: number;
  totalIndividualExpenses: number;
  totalCardsInvoice: number;
  totalDirectExpenses: number;
} {
  const expenses = transactions.filter((t) => t.type === 'expense');

  // 1. Detalhamento das faturas de cartão
  const cardBreakdowns = calculateCardInvoiceBreakdowns(expenses, cards, members);
  const totalCardsInvoice = cardBreakdowns.reduce(
    (acc, b) => acc + b.invoiceTotal,
    0
  );

  // Mapeia cotas de cartões por membro
  const memberCardsRespMap: Record<string, number> = {};
  members.forEach((m) => {
    memberCardsRespMap[m.id] = 0;
  });
  cardBreakdowns.forEach((cb) => {
    cb.memberShares.forEach((ms) => {
      memberCardsRespMap[ms.memberId] =
        (memberCardsRespMap[ms.memberId] || 0) + ms.totalShare;
    });
  });

  // 2. Despesas diretas (fora de cartão de crédito: Pix, dinheiro, débito, boleto)
  const directExpenses = expenses.filter((t) => t.paymentMethod !== 'credit_card');
  const totalDirectExpenses = directExpenses.reduce((acc, t) => acc + t.amount, 0);

  const directPaidMap: Record<string, number> = {};
  const directFairShareMap: Record<string, number> = {};
  const sharedRespMap: Record<string, number> = {};
  const individualRespMap: Record<string, number> = {};
  const fairShareMap: Record<string, number> = {};
  const allPaidOutOfPocketMap: Record<string, number> = {};

  members.forEach((m) => {
    directPaidMap[m.id] = 0;
    directFairShareMap[m.id] = 0;
    sharedRespMap[m.id] = 0;
    individualRespMap[m.id] = 0;
    fairShareMap[m.id] = 0;
    allPaidOutOfPocketMap[m.id] = 0;
  });

  let totalSharedExpenses = 0;
  let totalIndividualExpenses = 0;

  expenses.forEach((tx) => {
    const shares = calculateTransactionShares(tx, members);
    const isIndiv = tx.splitType === 'individual';

    if (isIndiv) {
      totalIndividualExpenses += tx.amount;
    } else {
      totalSharedExpenses += tx.amount;
    }

    // Se a despesa já foi paga (ou se for direta), registra o desembolso
    const payerId = tx.paidById || members[0]?.id;
    if (payerId && (tx.paymentMethod !== 'credit_card' || tx.isPaid)) {
      allPaidOutOfPocketMap[payerId] =
        (allPaidOutOfPocketMap[payerId] || 0) + tx.amount;
    }

    if (tx.paymentMethod !== 'credit_card') {
      if (payerId) {
        directPaidMap[payerId] = (directPaidMap[payerId] || 0) + tx.amount;
      }
    }

    members.forEach((m) => {
      const share = shares[m.id] || 0;
      fairShareMap[m.id] += share;
      if (isIndiv) {
        individualRespMap[m.id] += share;
      } else {
        sharedRespMap[m.id] += share;
      }

      if (tx.paymentMethod !== 'credit_card') {
        directFairShareMap[m.id] += share;
      }
    });
  });

  // Ajusta acertos diretos já realizados entre membros
  if (alreadySettledAmountForPair) {
    alreadySettledAmountForPair.forEach((s) => {
      if (directPaidMap[s.fromId] !== undefined) directPaidMap[s.fromId] += s.amount;
      if (directPaidMap[s.toId] !== undefined) directPaidMap[s.toId] -= s.amount;
    });
  }

  // 3. Resumos por membro
  const summaries: MemberBalanceSummary[] = members.map((m) => {
    const cardsResp = memberCardsRespMap[m.id] || 0;
    const directResp = directFairShareMap[m.id] || 0;
    const directPaid = directPaidMap[m.id] || 0;
    // O saldo a pagar/receber entre pessoas é APENAS o de despesas diretas!
    const directNetBalance = directPaid - directResp;

    return {
      member: m,
      paidOutOfPocket: allPaidOutOfPocketMap[m.id] || 0,
      fairShareResponsibility: fairShareMap[m.id] || 0,
      sharedResponsibility: sharedRespMap[m.id] || 0,
      individualResponsibility: individualRespMap[m.id] || 0,
      netBalance: directNetBalance,
      cardsResponsibility: cardsResp,
      directResponsibility: directResp,
      directNetBalance,
    };
  });

  // 4. Transferências diretas entre devedores e credores de contas diretas (sem abater faturas)
  const debtors = summaries
    .filter((s) => s.directNetBalance < -0.01)
    .map((s) => ({ member: s.member, amount: Math.abs(s.directNetBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = summaries
    .filter((s) => s.directNetBalance > 0.01)
    .map((s) => ({ member: s.member, amount: s.directNetBalance }))
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
    cardBreakdowns,
    totalSharedExpenses,
    totalIndividualExpenses,
    totalCardsInvoice,
    totalDirectExpenses,
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

  // Detecta tipo de divisão (padrão: 1 pessoa / individual, salvo se informar compartilhado/proporcional)
  let splitType: SplitType = 'individual';
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
