import React, { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Plus, Trash2, Zap } from 'lucide-react';
import { NewExpenseInput } from '../hooks/useFinanceStore';
import { ExpenseCategory, ExpenseEntry, UserProfile } from '../types/finance';
import { FinanceSummary } from '../utils/financeCalculations';
import { formatDateDisplay, formatINR, getTodayISO } from '../utils/formatters';

interface ExpensesPageProps {
  expenses: ExpenseEntry[];
  profile: UserProfile;
  summary: FinanceSummary;
  onAdd: (input: NewExpenseInput) => Promise<void>;
  onUpdate: (id: string, input: NewExpenseInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORIES: ExpenseCategory[] = [
  'EV Rental',
  'Food',
  'Money Sent Home',
  'Personal',
  'Other',
];

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses,
  profile,
  summary,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [date, setDate] = useState(getTodayISO());
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const groupedByDate = useMemo(() => {
    const filtered = expenses
      .filter((ex) => filterCat === 'all' || ex.category === filterCat)
      .sort((a, b) => b.date.localeCompare(a.date));

    const map = new Map<string, ExpenseEntry[]>();
    filtered.forEach((item) => {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    });
    return Array.from(map.entries());
  }, [expenses, filterCat]);

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setIsRecurring(false);
    setFormError(null);
  };

  const handleQuickLog = async (
    cat: ExpenseCategory,
    amt: number,
    desc: string
  ) => {
    setFormError(null);
    setSuccessMsg(null);
    try {
      await onAdd({
        date: getTodayISO(),
        category: cat,
        amount: amt,
        description: desc,
        isRecurring: true,
      });
      setSuccessMsg(`Logged ${cat} (${formatINR(amt)}) for today.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to log quick expense.');
    }
  };

  const handleEdit = (item: ExpenseEntry) => {
    setEditingId(item.id);
    setDate(item.date);
    setCategory(item.category);
    setAmount(String(item.amount));
    setDescription(item.description);
    setIsRecurring(item.isRecurring);
    setFormError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    const parsed = Number(amount);

    if (!date) {
      setFormError('Select an expense date.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter an expense amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: NewExpenseInput = {
        date,
        category,
        amount: parsed,
        description: description.trim() || category,
        isRecurring,
      };
      if (editingId) {
        await onUpdate(editingId, payload);
        setSuccessMsg('Updated expense entry.');
      } else {
        await onAdd(payload);
        setSuccessMsg(`Recorded ${formatINR(parsed)} under ${category}.`);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Screen-2 Inspired 3-Column Net Reconciliation Strip */}
      <section className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4">
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] text-center">
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Gross Pool</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-white">
              {formatINR(summary.totalAvailableGrossPool)}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Expenses</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-red-400">
              -{formatINR(summary.totalExpenses)}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Net After Expenses</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-emerald-400">
              {formatINR(summary.netSavingsAfterExpenses)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form + Quick Presets */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-sm font-bold text-white">
                Quick Recurring Presets
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleQuickLog(
                    'EV Rental',
                    profile.evWeeklyRent,
                    'Weekly EV scooter rental'
                  )
                }
                className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#232730] hover:bg-[#2B303B] border border-white/[0.08] text-left cursor-pointer"
              >
                <p className="text-xs font-semibold text-white">Log EV Rental</p>
                <p className="text-xs font-mono-num text-amber-400">
                  {formatINR(profile.evWeeklyRent)} / week
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLog(
                    'Food',
                    profile.dailyFoodBudget,
                    'Daily food & tea'
                  )
                }
                className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#232730] hover:bg-[#2B303B] border border-white/[0.08] text-left cursor-pointer"
              >
                <p className="text-xs font-semibold text-white">Log Daily Food</p>
                <p className="text-xs font-mono-num text-amber-400">
                  {formatINR(profile.dailyFoodBudget)} / day
                </p>
              </button>
            </div>
          </div>

          <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-white">
                {editingId ? 'Edit Expense' : 'Record Expense'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="200"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sent home to family, battery swap, lunch"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-900 text-emerald-500"
                />
                <span>Recurring fixed expense (EV rent / daily food)</span>
              </label>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
                  {formError}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Saving...'
                    : editingId
                    ? 'Update Expense'
                    : 'Save Expense'}
                </span>
              </button>
            </form>
          </div>
        </section>

        {/* Date-Grouped Expense Ledger */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-white">
              Expense History
            </h2>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121419] border border-white/[0.1] text-xs text-zinc-200"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {groupedByDate.length === 0 ? (
            <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-white mb-1">
                No expenses logged
              </p>
              <p className="text-xs text-zinc-400">
                Track EV rental, food, or money sent home so your available EMI balance stays realistic.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByDate.map(([dayDate, items]) => {
                const dayTotal = items.reduce((s, i) => s + i.amount, 0);
                return (
                  <div key={dayDate} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-medium text-zinc-400">
                        {formatDateDisplay(dayDate)}
                      </p>
                      <p className="text-xs font-mono-num font-semibold text-red-400">
                        -{formatINR(dayTotal)}
                      </p>
                    </div>

                    <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 flex items-center justify-between gap-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 flex-1 min-w-0 items-center">
                            <span className="sm:col-span-4 text-sm font-semibold text-white truncate">
                              {item.category}
                            </span>
                            <p className="sm:col-span-8 text-xs sm:text-sm text-zinc-400 truncate">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono-num text-sm font-bold text-red-400 mr-1">
                              -{formatINR(item.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                              title="Edit expense"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(item.id)}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
