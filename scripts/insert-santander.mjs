import { neon } from '@neondatabase/serverless';

const DEFAULT_NEON_URL =
  'postgresql://neondb_owner:npg_5IKbMQYG2irZ@ep-restless-cell-b6lqfrty-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DEFAULT_NEON_URL);
const STORE_KEY = 'main_household';

function normalizeName(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function addMonths(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const newY = d.getFullYear();
  const newM = String(d.getMonth() + 1).padStart(2, '0');
  return `${newY}-${newM}`;
}

/**
 * Mesma regra do app (computeFirstCompetenceMonth em financeUtils.ts):
 * Se o dia da compra (d) for >= dia de fechamento do cartão (closingDay),
 * a 1ª parcela entra na fatura do mês seguinte.
 */
function computeFirstCompetenceMonth(purchaseDateISO, closingDay) {
  const [y, m, d] = purchaseDateISO.split('-').map(Number);
  const baseMonth = `${y}-${String(m).padStart(2, '0')}`;
  if (closingDay && d >= closingDay) {
    return addMonths(baseMonth, 1);
  }
  return baseMonth;
}

async function main() {
  const rows = await sql`
    SELECT state_json, updated_at
    FROM duofinance_cloud_store
    WHERE id = ${STORE_KEY}
    LIMIT 1
  `;

  let state = rows?.[0]?.state_json || {
    members: [],
    categories: [],
    cards: [],
    transactions: [],
    settlements: [],
  };

  console.log(
    `Estado atual no Neon DB: ${state.members?.length || 0} membros, ${
      state.cards?.length || 0
    } cartões, ${state.transactions?.length || 0} transações.`
  );

  // 1. Garantir e unificar Membros (evitando duplicidade entre "Mae" e "Mãe")
  let members = Array.isArray(state.members) ? [...state.members] : [];

  // Se houver tanto o membro original "Mae" quanto o duplicado "m-mae", unifica no original
  const originalMae = members.find(
    (m) => normalizeName(m.name) === 'mae' && m.id !== 'm-mae'
  );
  if (originalMae) {
    originalMae.name = 'Mãe';
    members = members.filter((m) => m.id !== 'm-mae');
  }

  function ensureMember(name, role, avatarColor) {
    const targetNorm = normalizeName(name);
    let found = members.find((m) => normalizeName(m.name) === targetNorm);
    if (!found) {
      found = {
        id: `m-${targetNorm}`,
        name,
        role,
        avatarColor,
        monthlyIncome: 0,
      };
      members.push(found);
    }
    return found;
  }

  const memberDenner = ensureMember('Denner', 'Membro Principal', '#10b981');
  const memberMae = ensureMember('Mãe', 'Titular Cartão Santander', '#3b82f6');
  const memberEder = ensureMember('Eder', 'Participante', '#ec4899');

  // 2. Garantir Categorias: Compras, Farmacia, Mercado, Seguro
  let categories = Array.isArray(state.categories) ? [...state.categories] : [];

  function ensureCategory(searchTerms, defaultObj) {
    let found = categories.find((c) =>
      searchTerms.some((term) => normalizeName(c.name).includes(term))
    );
    if (!found) {
      found = defaultObj;
      categories.push(found);
    }
    return found;
  }

  const catCompras = ensureCategory(['compras'], {
    id: 'cat-compras',
    name: 'Compras & Casa',
    icon: 'ShoppingBag',
    color: '#ec4899',
    type: 'expense',
    monthlyBudget: 0,
    essentialType: 'wants',
  });

  const catFarmacia = ensureCategory(['farmacia', 'saude'], {
    id: 'cat-saude',
    name: 'Saúde & Farmácia',
    icon: 'HeartPulse',
    color: '#ef4444',
    type: 'expense',
    monthlyBudget: 0,
    essentialType: 'needs',
  });

  const catMercado = ensureCategory(['mercado', 'supermercado'], {
    id: 'cat-mercado',
    name: 'Supermercado & Feira',
    icon: 'ShoppingCart',
    color: '#10b981',
    type: 'expense',
    monthlyBudget: 0,
    essentialType: 'needs',
  });

  const catSeguro = ensureCategory(['seguro'], {
    id: 'cat-seguro',
    name: 'Seguro',
    icon: 'Shield',
    color: '#f59e0b',
    type: 'expense',
    monthlyBudget: 0,
    essentialType: 'needs',
  });

  // 3. Garantir Cartão Santander (Dono do Cartão: Mãe)
  let cards = Array.isArray(state.cards) ? [...state.cards] : [];
  let santanderCard = cards.find((c) =>
    normalizeName(c.name).includes('santander')
  );
  if (!santanderCard) {
    santanderCard = {
      id: 'card-santander-mae',
      name: 'Santander',
      brand: 'Santander',
      color: '#ec0000',
      limit: 13030,
      closingDay: 18,
      dueDay: 25,
      holderId: memberMae.id,
      lastDigits: '3599',
    };
    cards.push(santanderCard);
  } else {
    santanderCard.holderId = memberMae.id;
  }

  const closingDay = santanderCard.closingDay || 18;

  // 4. Lista dos 14 lançamentos enviados para o cartão Santander
  const rawPurchases = [
    {
      key: '01',
      description: 'Santa Marina Educacional',
      date: '2026-01-28',
      installments: 10,
      installmentAmount: 189.45,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '02',
      description: 'Unidas locadora',
      date: '2026-01-30',
      installments: 10,
      installmentAmount: 148.57,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '03',
      description: 'Otica',
      date: '2026-03-24',
      installments: 8,
      installmentAmount: 87.37,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '04',
      description: 'Lancheria Magna',
      date: '2026-06-22',
      installments: 6,
      installmentAmount: 266.66,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '05',
      description: 'Lancheria Magna',
      date: '2026-07-30',
      installments: 6,
      installmentAmount: 366.66,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '06',
      description: 'Guajuvirasmatde',
      date: '2026-09-21',
      installments: 3,
      installmentAmount: 66.33,
      responsible: memberDenner,
      category: catCompras,
    },
    {
      key: '07',
      description: 'Farmácias São João',
      date: '2026-09-26',
      installments: 3,
      installmentAmount: 106.17,
      responsible: memberEder,
      category: catFarmacia,
    },
    {
      key: '08',
      description: 'Unisuper Guajuviras',
      date: '2026-10-18',
      installments: 1,
      installmentAmount: 27.96,
      responsible: memberDenner,
      category: catMercado,
    },
    {
      key: '09',
      description: 'Mercado SM',
      date: '2026-10-18',
      installments: 1,
      installmentAmount: 28.07,
      responsible: memberDenner,
      category: catMercado,
    },
    {
      key: '10',
      description: 'Mercado Farias',
      date: '2026-10-19',
      installments: 1,
      installmentAmount: 15.0,
      responsible: memberDenner,
      category: catMercado,
    },
    {
      key: '11',
      description: 'Octopus Comercial',
      date: '2026-10-22',
      installments: 1,
      installmentAmount: 42.0,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '12',
      description: 'Delma morais gobbi',
      date: '2026-10-22',
      installments: 5,
      installmentAmount: 486.0,
      responsible: memberEder,
      category: catCompras,
    },
    {
      key: '13',
      description: 'Farias',
      date: '2026-10-22',
      installments: 1,
      installmentAmount: 8.28,
      responsible: memberDenner,
      category: catSeguro,
    },
    {
      key: '14',
      description: 'Delma morais gobbi',
      date: '2026-10-22',
      installments: 1,
      installmentAmount: 54.61,
      responsible: memberDenner,
      category: catMercado,
    },
  ];

  // Preservar lançamentos anteriores que não sejam deste lote Santander,
  // atualizando eventual referência de 'm-mae' para o ID unificado da Mãe
  const existingTransactions = (state.transactions || [])
    .filter((t) => !String(t.id).startsWith('tx-santander-2026-'))
    .map((t) => {
      const updated = { ...t };
      if (updated.paidById === 'm-mae') updated.paidById = memberMae.id;
      if (updated.usedById === 'm-mae') updated.usedById = memberMae.id;
      if (updated.beneficiaryId === 'm-mae') updated.beneficiaryId = memberMae.id;
      if (Array.isArray(updated.participantIds)) {
        updated.participantIds = updated.participantIds.map((id) =>
          id === 'm-mae' ? memberMae.id : id
        );
      }
      if (updated.customSplits && 'm-mae' in updated.customSplits) {
        const nextSplits = { ...updated.customSplits };
        delete nextSplits['m-mae'];
        updated.customSplits = nextSplits;
      }
      return updated;
    });

  const generatedTransactions = [];

  for (const item of rawPurchases) {
    // Calcula o mês da 1ª fatura respeitando o fechamento dia 18 do cartão Santander
    const firstMonth = computeFirstCompetenceMonth(item.date, closingDay);
    const totalPurchaseAmount = Number(
      (item.installmentAmount * item.installments).toFixed(2)
    );
    const groupId =
      item.installments > 1 ? `grp-santander-2026-${item.key}` : undefined;

    for (let i = 1; i <= item.installments; i++) {
      const compMonth = addMonths(firstMonth, i - 1);
      generatedTransactions.push({
        id: `tx-santander-2026-${item.key}-p${i}`,
        groupId,
        description: item.description,
        amount: item.installmentAmount,
        totalPurchaseAmount:
          item.installments > 1 ? totalPurchaseAmount : undefined,
        date: item.date,
        competenceMonth: compMonth,
        type: 'expense',
        categoryId: item.category.id,
        paymentMethod: 'credit_card',
        cardId: santanderCard.id,
        paidById: memberMae.id, // Dono do Cartão: Mãe
        usedById: item.responsible.id, // Quem utilizou / Responsável
        beneficiaryId: item.responsible.id, // 100% Individual do responsável
        splitType: 'individual',
        splitCount: 1,
        participantIds: [item.responsible.id],
        installmentCurrent: item.installments > 1 ? i : undefined,
        installmentTotal: item.installments > 1 ? item.installments : undefined,
        isRecurring: false,
        isPaid: compMonth <= '2026-10', // Faturas até Out/2026 quitadas; Nov/2026 aberta
      });
    }
  }

  const allTransactions = [...generatedTransactions, ...existingTransactions];

  const nextState = {
    ...state,
    members,
    categories,
    cards,
    transactions: allTransactions,
  };

  const payload = JSON.stringify(nextState);
  await sql`
    INSERT INTO duofinance_cloud_store (id, state_json, updated_at)
    VALUES (${STORE_KEY}, ${payload}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      state_json = EXCLUDED.state_json,
      updated_at = NOW()
  `;

  // Conferência de Outubro/2026 (2026-10) e Novembro/2026 (2026-11)
  const octTxs = allTransactions.filter((t) => t.competenceMonth === '2026-10');
  const novTxs = allTransactions.filter((t) => t.competenceMonth === '2026-11');

  const totalNov = novTxs.reduce((acc, t) => acc + t.amount, 0);

  console.log('==========================================================');
  console.log(
    `✅ RECÁLCULO CONCLUÍDO COM FECHAMENTO DIA ${closingDay} (CARTÃO SANTANDER)`
  );
  console.log('==========================================================');
  console.log(`Membros ativos (${members.length}): ${members.map((m) => m.name).join(', ')}`);
  console.log(`Itens em Outubro/2026 (2026-10): ${octTxs.length}`);
  console.log(`Itens em Novembro/2026 (2026-11 - Fatura Atual Aberta): ${novTxs.length}`);
  console.log(`Valor Total da Fatura Santander em Nov/2026: R$ ${totalNov.toFixed(2)}`);
  for (const t of novTxs) {
    console.log(
      `  - ${t.description} | Parcela: ${t.installmentCurrent || 1}/${
        t.installmentTotal || 1
      } | R$ ${t.amount.toFixed(2)} | Compra: ${t.date}`
    );
  }
  console.log('==========================================================');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
