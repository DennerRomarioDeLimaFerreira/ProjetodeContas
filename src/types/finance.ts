export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'credit_card' | 'pix' | 'debit' | 'boleto' | 'cash';

export type SplitType =
  | 'shared_equal'        // 50/50 (ou igual entre todos os membros)
  | 'shared_proportional' // Proporcional à renda mensal cadastrada de cada membro
  | 'shared_custom'       // Percentual customizado por membro
  | 'individual';         // 100% de um único membro (beneficiaryId)

export interface Member {
  id: string;
  name: string;
  role: string; // ex: "Você", "Parceiro(a)"
  avatarColor: string;
  monthlyIncome: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  monthlyBudget: number; // Meta de gasto mensal em R$ (0 = sem limite definido)
  essentialType?: 'needs' | 'wants' | 'savings'; // Para análise 50-30-20
}

export interface CreditCard {
  id: string;
  name: string;
  brand: string; // ex: Nubank, Itaú, Inter, C6, XP
  color: string;
  limit: number;
  closingDay: number; // Dia de fechamento (1-31)
  dueDay: number;     // Dia de vencimento (1-31)
  holderId: string;   // Member ID titular do cartão
  lastDigits?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Valor desta parcela (ou valor integral se à vista)
  totalPurchaseAmount?: number; // Valor total da compra original se parcelada
  date: string; // YYYY-MM-DD (data da compra)
  competenceMonth: string; // YYYY-MM (mês de referência do orçamento/fatura)
  type: TransactionType;
  categoryId: string;
  paymentMethod: PaymentMethod;
  cardId?: string; // Obrigatório se paymentMethod === 'credit_card'
  paidById: string; // Member ID dono do cartão / quem pagou a fatura
  usedById?: string; // Member ID da pessoa que utilizou o cartão na compra
  splitType: SplitType;
  splitCount?: number; // Quantidade de pessoas que vão dividir esta parcela (1, 2, 3, 4...)
  participantIds?: string[]; // Quais membros participam da divisão desta despesa
  beneficiaryId?: string; // Member ID responsável quando splitType === 'individual'
  customSplits?: Record<string, number>; // Member ID -> porcentagem (0-100)
  installmentCurrent?: number; // ex: 1
  installmentTotal?: number;   // ex: 6
  groupId?: string;            // Agrupa todas as parcelas da mesma compra
  isRecurring?: boolean;       // Assinatura / Custo fixo mensal
  isPaid: boolean;
  notes?: string;
}

export interface SettlementRecord {
  id: string;
  competenceMonth: string; // YYYY-MM
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  settledAt: string;
  note?: string;
}

export interface FinanceState {
  members: Member[];
  categories: Category[];
  cards: CreditCard[];
  transactions: Transaction[];
  settlements: SettlementRecord[];
}
