import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { Category, Member, Transaction } from '../types/finance';
import {
  formatCurrency,
  formatMonthLabel,
  parseExactNumber,
} from '../utils/financeUtils';

interface BudgetsViewProps {
  selectedMonth: string;
  categories: Category[];
  monthTransactions: Transaction[];
  members: Member[];
  onUpdateCategory: (category: Category) => void;
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  selectedMonth,
  categories,
  monthTransactions,
  members,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [editColorInput, setEditColorInput] = useState('#10b981');

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('0');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [newCatEssential, setNewCatEssential] = useState<'needs' | 'wants'>('needs');

  const expenses = monthTransactions.filter((t) => t.type === 'expense');
  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const incomeCategories = categories.filter((c) => c.type === 'income');

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

  const handleSaveCategoryEdit = (cat: Category) => {
    onUpdateCategory({
      ...cat,
      name: editNameInput.trim() || cat.name,
      color: editColorInput || cat.color,
      monthlyBudget: Math.max(0, parseExactNumber(budgetInput)),
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
      type: newCatType,
      monthlyBudget:
        newCatType === 'expense'
          ? Math.max(0, parseExactNumber(newCatBudget))
          : 0,
      essentialType: newCatType === 'expense' ? newCatEssential : 'savings',
    });
    setNewCatName('');
    setNewCatBudget('0');
    setShowNewCat(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Categorias, Metas de Gastos & Regra 50-30-20
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Adicione, edite ou exclua categorias e defina tetos mensais para{' '}
            <strong className="text-slate-200">{formatMonthLabel(selectedMonth)}</strong>
          </p>
        </div>

        <button
          onClick={() => setShowNewCat(!showNewCat)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {showNewCat && (
        <form
          onSubmit={handleCreateCategory}
          className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Pets, Educação, Freelas..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select
              value={newCatType}
              onChange={(e) =>
                setNewCatType(e.target.value as 'expense' | 'income')
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="expense">Despesa / Gasto</option>
              <option value="income">Receita / Entrada</option>
            </select>
          </div>
          {newCatType === 'expense' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Meta Mensal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
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
            </>
          )}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-9 w-12 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
            />
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Salvar
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
              ? `${((totalSpent / totalBudgeted) * 100).toFixed(2)}%`
              : '0%'}
            )
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Essenciais (Ideal: 50%)</span>
            <span className="font-bold text-blue-400">
              {combinedIncome > 0
                ? `${((needsSpent / combinedIncome) * 100).toFixed(2)}%`
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
                ? `${((wantsSpent / combinedIncome) * 100).toFixed(2)}%`
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
                ? `${((savingsLeft / combinedIncome) * 100).toFixed(2)}%`
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

      {/* Cards de Categorias de Despesa */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3">
          Categorias de Despesas ({expenseCategories.length})
        </h3>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: `${cat.color}25`,
                        color: cat.color,
                      }}
                    >
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="color"
                            value={editColorInput}
                            onChange={(e) => setEditColorInput(e.target.value)}
                            className="w-7 h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editNameInput}
                            onChange={(e) => setEditNameInput(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            placeholder="Nome da categoria"
                          />
                        </div>
                      ) : (
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
                      )}
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
                        step="0.01"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        placeholder="Meta R$"
                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                      />
                      <button
                        onClick={() => handleSaveCategoryEdit(cat)}
                        className="px-2.5 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditNameInput(cat.name);
                          setEditColorInput(cat.color);
                          setBudgetInput(String(cat.monthlyBudget || 0));
                        }}
                        title="Editar nome, cor ou meta"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Meta: {formatCurrency(budget)}
                      </button>
                      {expenseCategories.length > 1 && (
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          title="Excluir categoria"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
                    Gasto: <strong>{formatCurrency(spent)}</strong>
                    {budget > 0 && ` (${pct.toFixed(2)}%)`}
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

      {/* Categorias de Receita */}
      {incomeCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3">
            Categorias de Receita ({incomeCategories.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {incomeCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs font-semibold text-white">
                    {cat.name}
                  </span>
                </div>
                {incomeCategories.length > 1 && (
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    title="Excluir categoria de receita"
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
