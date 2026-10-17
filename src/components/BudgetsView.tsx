import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Plus,
  Target,
} from 'lucide-react';
import { Category, Member, Transaction } from '../types/finance';
import { formatCurrency, formatMonthLabel } from '../utils/financeUtils';

interface BudgetsViewProps {
  selectedMonth: string;
  categories: Category[];
  monthTransactions: Transaction[];
  members: Member[];
  onUpdateCategory: (category: Category) => void;
  onAddCategory: (category: Category) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedMonth,
  categories,
  monthTransactions,
  members,
  onUpdateCategory,
  onAddCategory,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('500');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [newCatEssential, setNewCatEssential] = useState<'needs' | 'wants'>('needs');

  const expenses = monthTransactions.filter((t) => t.type === 'expense');
  const expenseCategories = categories.filter((c) => c.type !== 'income');

  const totalBudgeted = expenseCategories.reduce(
    (acc, c) => acc + (c.monthlyBudget || 0),
    0
  );
  const totalSpent = expenses.reduce((acc, t) => acc + t.amount, 0);

  const combinedIncome = members.reduce(
    (acc, m) => acc + (m.monthlyIncome || 0),
    0
  );

  // Regra 50-30-20
  const needsSpent = expenses
    .filter((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.essentialType === 'needs';
    })
    .reduce((acc, t) => acc + t.amount, 0);

  const wantsSpent = expenses
    .filter((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return cat?.essentialType !== 'needs';
    })
    .reduce((acc, t) => acc + t.amount, 0);

  const savingsLeft = Math.max(0, combinedIncome - totalSpent);

  const handleSaveBudget = (cat: Category) => {
    onUpdateCategory({
      ...cat,
      monthlyBudget: Math.max(0, parseFloat(budgetInput) || 0),
    });
    setEditingCatId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
      type: 'expense',
      monthlyBudget: Math.max(0, parseFloat(newCatBudget) || 0),
      essentialType: newCatEssential,
    });
    setNewCatName('');
    setShowNewCat(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Metas de Gastos por Categoria & Regra 50-30-20
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina tetos mensais para cada categoria e acompanhe os alertas de limite em{' '}
            <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong>
          </p>
        </div>

        <button
          onClick={() => setShowNewCat(!showNewCat)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {showNewCat && (
        <form
          onSubmit={handleCreateCategory}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Pets, Educação, Investimentos..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Meta Mensal (R$)
            </label>
            <input
              type="number"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Classificação 50-30-20
            </label>
            <select
              value={newCatEssential}
              onChange={(e) =>
                setNewCatEssential(e.target.value as 'needs' | 'wants')
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="needs">Essencial (50%)</option>
              <option value="wants">Estilo de Vida / Lazer (30%)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-9 w-12 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
            />
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Criar
            </button>
          </div>
        </form>
      )}

      {/* Resumo Regra 50-30-20 + Teto Total */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Orçamento Planejado Total</div>
          <div className="text-xl font-bold text-white mt-1">
            {formatCurrency(totalBudgeted)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Gasto atual: <strong>{formatCurrency(totalSpent)}</strong> (
            {totalBudgeted > 0
              ? `${((totalSpent / totalBudgeted) * 100).toFixed(0)}%`
              : '0%'}
            )
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Essenciais (Ideal: 50%)</span>
            <span className="font-bold text-blue-400">
              {combinedIncome > 0
                ? `${((needsSpent / combinedIncome) * 100).toFixed(0)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {formatCurrency(needsSpent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Teto sugerido (50%): {formatCurrency(combinedIncome * 0.5)}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Estilo de Vida (Ideal: 30%)</span>
            <span className="font-bold text-amber-400">
              {combinedIncome > 0
                ? `${((wantsSpent / combinedIncome) * 100).toFixed(0)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {formatCurrency(wantsSpent)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Teto sugerido (30%): {formatCurrency(combinedIncome * 0.3)}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Livre / Poupança (Ideal: 20%)</span>
            <span className="font-bold text-emerald-400">
              {combinedIncome > 0
                ? `${((savingsLeft / combinedIncome) * 100).toFixed(0)}%`
                : '0%'}
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {formatCurrency(savingsLeft)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Meta sugerida (20%): {formatCurrency(combinedIncome * 0.2)}
          </div>
        </div>
      </div>

      {/* Cards de Meta por Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseCategories.map((cat) => {
          const spent = expenses
            .filter((t) => t.categoryId === cat.id)
            .reduce((acc, t) => acc + t.amount, 0);

          const budget = cat.monthlyBudget || 0;
          const pct = budget > 0 ? (spent / budget) * 100 : 0;
          const isOver = budget > 0 && spent > budget;
          const isWarning = budget > 0 && spent >= budget * 0.8 && !isOver;
          const remaining = budget - spent;

          const isEditing = editingCatId === cat.id;

          return (
            <div
              key={cat.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 space-y-3 transition ${
                isOver
                  ? 'border-rose-500/40'
                  : isWarning
                  ? 'border-amber-500/40'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: `${cat.color}25`,
                      color: cat.color,
                    }}
                  >
                    {cat.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {cat.name}
                      {isOver && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Estourado
                        </span>
                      )}
                      {!isOver && !isWarning && budget > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> No limite
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {cat.essentialType === 'needs'
                        ? 'Necessidade Essencial (50%)'
                        : 'Estilo de Vida & Desejos (30%)'}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    />
                    <button
                      onClick={() => handleSaveBudget(cat)}
                      className="px-2.5 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setBudgetInput(String(cat.monthlyBudget || 0));
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Meta: {formatCurrency(budget)}
                  </button>
                )}
              </div>

              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: isOver
                      ? '#f43f5e'
                      : isWarning
                      ? '#f59e0b'
                      : cat.color,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Gasto: <strong>{formatCurrency(spent)}</strong> (
                  {pct.toFixed(0)}%)
                </span>
                {budget > 0 && (
                  <span
                    className={`font-medium ${
                      remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {remaining >= 0
                      ? `Disponível: ${formatCurrency(remaining)}`
                      : `Excedeu em ${formatCurrency(Math.abs(remaining))}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
