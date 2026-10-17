import { Category, CreditCard, FinanceState, Member, Transaction } from '../types/finance';
import { getCurrentYearMonth, guessCategoryByDescription } from './financeUtils';

export interface ParsedImportRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  selected: boolean;
}

function normalizeDateString(raw: string): string {
  const clean = raw.trim().replace(/['"]/g, '');
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  // OFX format YYYYMMDD...
  const ofxMatch = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }

  return `${getCurrentYearMonth()}-10`;
}

function parseMonetaryString(raw: string): number {
  const clean = raw.replace(/[R$\s'"]/g, '').trim();
  if (!clean) return NaN;
  if (clean.includes(',') && clean.includes('.')) {
    // Decide which is decimal separator by last occurrence
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    } else {
      return parseFloat(clean.replace(/,/g, ''));
    }
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean);
}

function detectInstallmentsFromDescription(desc: string): {
  installmentCurrent?: number;
  installmentTotal?: number;
} {
  // Ex: "Compra X 02/10" ou "Parcela 2/6"
  const match = desc.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (match) {
    const cur = parseInt(match[1], 10);
    const tot = parseInt(match[2], 10);
    if (cur >= 1 && tot >= 2 && cur <= tot && tot <= 48) {
      return { installmentCurrent: cur, installmentTotal: tot };
    }
  }
  return {};
}

export function parseCSVContent(
  csvText: string,
  categories: Category[]
): ParsedImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(separator)
      .map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    // Heurística para encontrar coluna de data, valor e descrição (Nubank, Inter, Itaú, C6, genérico)
    let dateCol = '';
    let amountVal = NaN;
    const textParts: string[] = [];

    for (const col of cols) {
      if (
        !dateCol &&
        (/^\d{4}-\d{2}-\d{2}/.test(col) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(col))
      ) {
        dateCol = col;
        continue;
      }
      const maybeNum = parseMonetaryString(col);
      if (
        isNaN(amountVal) &&
        !isNaN(maybeNum) &&
        /^[-+]?(?:R\$\s*)?\d+(?:[.,]\d+)?$/.test(col.replace(/\./g, ''))
      ) {
        amountVal = maybeNum;
        continue;
      }
      if (col) {
        textParts.push(col);
      }
    }

    if (isNaN(amountVal) || amountVal === 0) continue;

    const description = textParts.join(' - ') || 'Item Importado';
    // Ignora linhas de pagamento de fatura anterior em CSV de cartão
    if (/pagamento recebido|pagamento de fatura/i.test(description)) {
      continue;
    }

    const absAmount = Math.abs(amountVal);
    const date = dateCol ? normalizeDateString(dateCol) : `${getCurrentYearMonth()}-10`;
    const inst = detectInstallmentsFromDescription(description);
    const categoryId = guessCategoryByDescription(description, categories);

    rows.push({
      date,
      description,
      amount: Number(absAmount.toFixed(2)),
      type: 'expense',
      categoryId,
      ...inst,
      selected: true,
    });
  }

  return rows;
}

export function parseOFXContent(
  ofxText: string,
  categories: Category[]
): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  const blocks = ofxText.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const dtMatch = block.match(/<DTPOSTED>([^\r\n<]+)/i);
    const amtMatch = block.match(/<TRNAMT>([^\r\n<]+)/i);
    const memoMatch =
      block.match(/<MEMO>([^\r\n<]+)/i) || block.match(/<NAME>([^\r\n<]+)/i);

    if (!amtMatch) continue;
    const rawAmt = parseMonetaryString(amtMatch[1]);
    if (isNaN(rawAmt) || rawAmt === 0) continue;

    const description = (memoMatch ? memoMatch[1].trim() : 'Transação OFX').replace(
      /\s+/g,
      ' '
    );
    if (/pagamento recebido|pagamento fatura/i.test(description)) continue;

    const date = dtMatch
      ? normalizeDateString(dtMatch[1])
      : `${getCurrentYearMonth()}-10`;
    const inst = detectInstallmentsFromDescription(description);
    const categoryId = guessCategoryByDescription(description, categories);

    rows.push({
      date,
      description,
      amount: Number(Math.abs(rawAmt).toFixed(2)),
      type: 'expense',
      categoryId,
      ...inst,
      selected: true,
    });
  }

  return rows;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  members: Member[],
  cards: CreditCard[],
  filename = 'extrato-duofinance.csv'
): void {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const memMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.name]));

  const headers = [
    'Data Compra',
    'Competencia/Fatura',
    'Descricao',
    'Tipo',
    'Categoria',
    'Metodo',
    'Cartao',
    'Parcela',
    'Pago Por',
    'Divisao',
    'Status',
    'Valor (R$)',
  ];

  const lines = transactions.map((t) => {
    const instLabel =
      t.installmentTotal && t.installmentTotal > 1
        ? `${t.installmentCurrent}/${t.installmentTotal}`
        : 'À vista';
    return [
      t.date,
      t.competenceMonth,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Receita' : 'Despesa',
      `"${catMap[t.categoryId] || 'Outros'}"`,
      t.paymentMethod,
      `"${t.cardId ? cardMap[t.cardId] || '' : '-'}"`,
      instLabel,
      `"${memMap[t.paidById] || ''}"`,
      t.splitType,
      t.isPaid ? 'Pago' : 'Pendente',
      t.amount.toFixed(2).replace('.', ','),
    ].join(';');
  });

  // UTF-8 BOM para Excel reconhecer acentos automaticamente
  const csvContent = '\uFEFF' + [headers.join(';'), ...lines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBackupJSON(state: FinanceState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-duofinance-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
