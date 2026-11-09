import { describe, it, expect } from 'vitest';
import {
  parseExactNumber,
  formatCurrency,
  computeFirstCompetenceMonth,
  calculateTransactionShares,
  calculateCardInvoiceBreakdowns,
  addMonths,
} from './financeUtils';
import type { Member, CreditCard, Transaction } from '../types/finance';

describe('Finance Utilities — QA Financial Precision & Invariants', () => {
  describe('parseExactNumber & formatCurrency', () => {
    it('deve converter formatos monetários brasileiros e universais com precisão', () => {
      expect(parseExactNumber('R$ 1.250,50')).toBe(1250.5);
      expect(parseExactNumber('1.250,50')).toBe(1250.5);
      expect(parseExactNumber('1250.50')).toBe(1250.5);
      expect(parseExactNumber('  R$  99,90 ')).toBe(99.9);
      expect(parseExactNumber('0')).toBe(0);
      expect(parseExactNumber('')).toBe(0);
      expect(parseExactNumber('abc')).toBe(0);
    });

    it('deve formatar valor em padrão monetário BRL', () => {
      const formatted = formatCurrency(1250.5);
      expect(formatted).toContain('1.250,50');
      expect(formatted).toMatch(/R\$/);
    });
  });

  describe('addMonths & computeFirstCompetenceMonth', () => {
    it('deve calcular viradas de mês e ano corretamente', () => {
      expect(addMonths('2026-05', 1)).toBe('2026-06');
      expect(addMonths('2026-12', 1)).toBe('2027-01');
      expect(addMonths('2026-01', -1)).toBe('2025-12');
    });

    it('deve jogar a compra para a fatura seguinte se for no dia do fechamento ou posterior', () => {
      const card: CreditCard = {
        id: 'card-1',
        name: 'Nubank',
        brand: 'mastercard',
        lastDigits: '1234',
        limit: 5000,
        closingDay: 15,
        dueDay: 22,
        color: '#820ad1',
        holderId: 'm1',
      };

      // Compra antes do fechamento (dia 14) -> Fatura do próprio mês 2026-05
      const compBefore = computeFirstCompetenceMonth('2026-05-14', 'credit_card', card);
      expect(compBefore).toBe('2026-05');

      // Compra no dia do fechamento (dia 15) -> Fatura do mês seguinte 2026-06
      const compOnClosing = computeFirstCompetenceMonth('2026-05-15', 'credit_card', card);
      expect(compOnClosing).toBe('2026-06');

      // Compra após o fechamento (dia 20) -> Fatura do mês seguinte 2026-06
      const compAfter = computeFirstCompetenceMonth('2026-05-20', 'credit_card', card);
      expect(compAfter).toBe('2026-06');
    });
  });

  describe('calculateTransactionShares — Divisão Justa sem Perda de Centavos', () => {
    const members: Member[] = [
      { id: 'm1', name: 'Denner', role: 'Você', avatarColor: '#3b82f6', monthlyIncome: 6000 },
      { id: 'm2', name: 'Parceiro(a)', role: 'Parceiro(a)', avatarColor: '#ec4899', monthlyIncome: 4000 },
    ];

    it('deve dividir igualmente despesas compartilhadas (shared_equal)', () => {
      const tx: Transaction = {
        id: 'tx-1',
        description: 'Supermercado',
        amount: 300,
        date: '2026-05-10',
        categoryId: 'cat-mercado',
        type: 'expense',
        paymentMethod: 'pix',
        paidById: 'm1',
        competenceMonth: '2026-05',
        splitType: 'shared_equal',
        isPaid: true,
      };

      const shares = calculateTransactionShares(tx, members);
      expect(shares['m1']).toBe(150);
      expect(shares['m2']).toBe(150);
      expect(shares['m1'] + shares['m2']).toBe(300);
    });

    it('deve atribuir 100% da despesa ao beneficiário em despesa individual', () => {
      const tx: Transaction = {
        id: 'tx-2',
        description: 'Curso Pessoal',
        amount: 250,
        date: '2026-05-12',
        categoryId: 'cat-educacao',
        type: 'expense',
        paymentMethod: 'pix',
        paidById: 'm1',
        beneficiaryId: 'm1',
        competenceMonth: '2026-05',
        splitType: 'individual',
        isPaid: true,
      };

      const shares = calculateTransactionShares(tx, members);
      expect(shares['m1']).toBe(250);
      expect(shares['m2']).toBe(0);
    });

    it('deve calcular divisão proporcional baseada na renda dos membros', () => {
      // Total de renda = 10.000 (m1=60%, m2=40%)
      const tx: Transaction = {
        id: 'tx-3',
        description: 'Aluguel Compartilhado',
        amount: 1000,
        date: '2026-05-05',
        categoryId: 'cat-moradia',
        type: 'expense',
        paymentMethod: 'pix',
        paidById: 'm1',
        competenceMonth: '2026-05',
        splitType: 'shared_proportional',
        isPaid: true,
      };

      const shares = calculateTransactionShares(tx, members);
      expect(shares['m1']).toBeCloseTo(600, 2);
      expect(shares['m2']).toBeCloseTo(400, 2);
      expect(shares['m1'] + shares['m2']).toBeCloseTo(1000, 2);
    });
  });

  describe('calculateCardInvoiceBreakdowns — Regra de Ouro (Não-Abatimento Cruzado de Cartões)', () => {
    const members: Member[] = [
      { id: 'm1', name: 'Denner', role: 'Você', avatarColor: '#3b82f6', monthlyIncome: 6000 },
      { id: 'm2', name: 'Carla', role: 'Parceiro(a)', avatarColor: '#ec4899', monthlyIncome: 4000 },
    ];

    const cards: CreditCard[] = [
      {
        id: 'card-inter',
        name: 'Inter Black',
        brand: 'mastercard',
        lastDigits: '9988',
        limit: 10000,
        closingDay: 10,
        dueDay: 17,
        color: '#ff7a00',
        holderId: 'm1',
      },
      {
        id: 'card-c6',
        name: 'C6 Carbon',
        brand: 'mastercard',
        lastDigits: '4455',
        limit: 8000,
        closingDay: 15,
        dueDay: 22,
        color: '#242424',
        holderId: 'm2',
      },
    ];

    it('deve isolar estritamente cada fatura de cartão e as cotas dos membros', () => {
      const transactions: Transaction[] = [
        // Compra no Cartão Inter (Titular Denner): Compartilhado R$ 200 (100 para cada)
        {
          id: 'tx-inter-1',
          description: 'Jantar Restaurante',
          amount: 200,
          date: '2026-05-02',
          categoryId: 'cat-restaurante',
          type: 'expense',
          paymentMethod: 'credit_card',
          cardId: 'card-inter',
          paidById: 'm1',
          competenceMonth: '2026-05',
          splitType: 'shared_equal',
          isPaid: false,
        },
        // Compra no Cartão Inter (Titular Denner): Individual da Carla R$ 150
        {
          id: 'tx-inter-2',
          description: 'Roupas da Carla',
          amount: 150,
          date: '2026-05-04',
          categoryId: 'cat-vestuario',
          type: 'expense',
          paymentMethod: 'credit_card',
          cardId: 'card-inter',
          paidById: 'm1',
          beneficiaryId: 'm2',
          competenceMonth: '2026-05',
          splitType: 'individual',
          isPaid: false,
        },
        // Compra no Cartão C6 (Titular Carla): Individual do Denner R$ 80
        {
          id: 'tx-c6-1',
          description: 'Livro Denner',
          amount: 80,
          date: '2026-05-08',
          categoryId: 'cat-livros',
          type: 'expense',
          paymentMethod: 'credit_card',
          cardId: 'card-c6',
          paidById: 'm2',
          beneficiaryId: 'm1',
          competenceMonth: '2026-05',
          splitType: 'individual',
          isPaid: false,
        },
      ];

      const breakdowns = calculateCardInvoiceBreakdowns(transactions, cards, members);
      expect(breakdowns).toHaveLength(2);

      // Fatura do Inter
      const interBreakdown = breakdowns.find((b) => b.card.id === 'card-inter');
      expect(interBreakdown).toBeDefined();
      expect(interBreakdown?.invoiceTotal).toBe(350); // 200 + 150

      // Cota do Denner no Inter: 100 (da parte dele do jantar)
      const dennerShareInter = interBreakdown?.memberShares.find((s) => s.memberId === 'm1');
      expect(dennerShareInter?.totalShare).toBe(100);

      // Cota da Carla no Inter: 100 (metade do jantar) + 150 (individual dela) = 250
      const carlaShareInter = interBreakdown?.memberShares.find((s) => s.memberId === 'm2');
      expect(carlaShareInter?.totalShare).toBe(250);

      // Soma das cotas do Inter DEVE bater exatamente com o total da fatura
      expect(dennerShareInter!.totalShare + carlaShareInter!.totalShare).toBe(350);

      // Fatura do C6
      const c6Breakdown = breakdowns.find((b) => b.card.id === 'card-c6');
      expect(c6Breakdown).toBeDefined();
      expect(c6Breakdown?.invoiceTotal).toBe(80);

      // Cota do Denner no C6: 80
      const dennerShareC6 = c6Breakdown?.memberShares.find((s) => s.memberId === 'm1');
      expect(dennerShareC6?.totalShare).toBe(80);
      expect(c6Breakdown?.memberShares.find((s) => s.memberId === 'm2')?.totalShare).toBe(0);
    });
  });
});
