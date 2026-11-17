import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import { NewEarningInput } from '../hooks/useFinanceStore';
import { DeliveryApp, EarningEntry } from '../types/finance';
import {
  formatDateDisplay,
  formatINR,
  getMonthKey,
  getMonthLabel,
  getTodayISO,
} from '../utils/formatters';

interface DailyEarningsPageProps {
  earnings: EarningEntry[];
  dailyTarget: number;
  onAdd: (input: NewEarningInput) => Promise<void>;
  onUpdate: (id: string, input: NewEarningInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const APPS: DeliveryApp[] = ['Rapido', 'Bounce', 'Shiprocket'];

export const DailyEarningsPage: React.FC<DailyEarningsPageProps> = ({
  earnings,
  dailyTarget,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [date, setDate] = useState(getTodayISO());
  const [app, setApp] = useState<DeliveryApp>('Rapido');
  const [baseAmount, setBaseAmount] = useState('');
  const [incentive, setIncentive] = useState('0');
  const [bonus, setBonus] = useState('0');
  const [allowMultipleShifts, setAllowMultipleShifts] = useState(false);
  const [shiftLabel, setShiftLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [appFilter, setAppFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const computedTotal =
    (Number(baseAmount) || 0) + (Number(incentive) || 0) + (Number(bonus) || 0);

  const duplicateExists = useMemo(() => {
    return earnings.some(
      (e) => e.date === date && e.app === app && e.id !== editingId
    );
  }, [earnings, date, app, editingId]);

  const availableMonths = useMemo(() => {
    const keys = Array.from(new Set(earnings.map((e) => getMonthKey(e.date)))).filter(Boolean);
    return keys.sort((a, b) => b.localeCompare(a));
  }, [earnings]);

  const filteredEarnings = useMemo(() => {
    return earnings.filter((e) => {
      if (monthFilter !== 'all' && getMonthKey(e.date) !== monthFilter) return false;
      if (appFilter !== 'all' && e.app !== appFilter) return false;
      return true;
    });
  }, [earnings, monthFilter, appFilter]);

  const appTotals = useMemo(() => {
    const totals = { Rapido: 0, Bounce: 0, Shiprocket: 0 };
    filteredEarnings.forEach((e) => {
      totals[e.app] = (totals[e.app] || 0) + e.totalAmount;
    });
    return totals;
  }, [filteredEarnings]);

  const dailySummaries = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        Rapido: number;
        Bounce: number;
        Shiprocket: number;
        total: number;
        entries: EarningEntry[];
      }
    >();

    filteredEarnings.forEach((entry) => {
      const existing = byDate.get(entry.date) || {
        date: entry.date,
        Rapido: 0,
        Bounce: 0,
        Shiprocket: 0,
        total: 0,
        entries: [],
      };
      existing[entry.app] += entry.totalAmount;
      existing.total += entry.totalAmount;
      existing.entries.push(entry);
      byDate.set(entry.date, existing);
    });

    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredEarnings]);

  const resetForm = () => {
    setEditingId(null);
    setBaseAmount('');
    setIncentive('0');
    setBonus('0');
    setAllowMultipleShifts(false);
    setShiftLabel('');
    setNotes('');
    setFormError(null);
  };

  const handleEdit = (entry: EarningEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setApp(entry.app);
    setBaseAmount(String(entry.baseAmount));
    setIncentive(String(entry.incentive));
    setBonus(String(entry.bonus));
    setAllowMultipleShifts(entry.allowMultipleShifts);
    setShiftLabel(entry.shiftLabel);
    setNotes(entry.notes);
    setFormError(null);
    setSuccessNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    const base = Number(baseAmount);
    const inc = Number(incentive || 0);
    const bon = Number(bonus || 0);

    if (!date) {
      setFormError('Please select an earning date.');
      return;
    }
    if (
      !Number.isFinite(base) ||
      base < 0 ||
      !Number.isFinite(inc) ||
      inc < 0 ||
      !Number.isFinite(bon) ||
      bon < 0
    ) {
      setFormError('Amounts must be ₹0 or greater.');
      return;
    }
    if (base + inc + bon <= 0) {
      setFormError('Total earning amount must be greater than ₹0.');
      return;
    }
    if (duplicateExists && !allowMultipleShifts) {
      setFormError(
        `An entry for ${app} on ${formatDateDisplay(date)} already exists. Check "Add as extra shift" or edit the existing entry.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: NewEarningInput = {
        date,
        app,
        baseAmount: base,
        incentive: inc,
        bonus: bon,
        shiftLabel: allowMultipleShifts ? shiftLabel || 'Extra Shift' : shiftLabel,
        allowMultipleShifts,
        notes,
      };

      if (editingId) {
        await onUpdate(editingId, payload);
        setSuccessNotice(`Updated ${app} entry for ${formatDateDisplay(date)}.`);
      } else {
        await onAdd(payload);
        setSuccessNotice(
          `Saved ${formatINR(base + inc + bon)} from ${app} on ${formatDateDisplay(date)}.`
        );
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save earning.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFilteredEarnings = filteredEarnings.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div className="space-y-5">
      {/* Screen-2 Inspired 3-Column Platform Summary Strip */}
      <section className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4">
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] text-center">
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Rapido</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-emerald-400">
              {formatINR(appTotals.Rapido)}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Bounce</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-sky-400">
              {formatINR(appTotals.Bounce)}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-0.5">Shiprocket</p>
            <p className="font-mono-num text-sm sm:text-xl font-bold text-amber-400">
              {formatINR(appTotals.Shiprocket)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Entry Form */}
        <section className="lg:col-span-5 bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display text-base font-bold text-white">
              {editingId ? 'Edit Earning Entry' : 'Log Delivery Earnings'}
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
                Delivery Platform
              </label>
              <div className="grid grid-cols-3 gap-2">
                {APPS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setApp(item)}
                    className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                      app === item
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#121419] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Earning Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1 font-mono-num">
                {formatDateDisplay(date)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Base Fare (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Incentive (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={incentive}
                  onChange={(e) => setIncentive(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Bonus (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {duplicateExists && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Entry for {app} on {formatDateDisplay(date)} already exists.
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultipleShifts}
                    onChange={(e) => setAllowMultipleShifts(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-900 text-emerald-500"
                  />
                  <span>Add as an extra shift for {app} on this date</span>
                </label>
              </div>
            )}

            {(allowMultipleShifts || shiftLabel) && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Shift Label
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={shiftLabel}
                  onChange={(e) => setShiftLabel(e.target.value)}
                  placeholder="e.g. Evening Shift"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Koramangala peak hours, 18 trips"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121419] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#121419] border border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-zinc-400">Entry Total</span>
              <span className="font-mono-num text-lg font-bold text-emerald-400">
                {formatINR(computedTotal)}
              </span>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
                {formError}
              </p>
            )}
            {successNotice && (
              <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successNotice}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Saving...'
                  : editingId
                  ? 'Update Earning Entry'
                  : 'Save Earning Entry'}
              </span>
            </button>
          </form>
        </section>

        {/* Date-Grouped Earnings Ledger (Screen 2 Aesthetic) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-400">Filtered Earnings Total</p>
              <p className="font-mono-num text-xl font-bold text-emerald-400">
                {formatINR(totalFilteredEarnings)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121419] border border-white/[0.1] text-xs text-zinc-200"
              >
                <option value="all">All Apps</option>
                {APPS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121419] border border-white/[0.1] text-xs text-zinc-200"
              >
                <option value="all">All Months</option>
                {availableMonths.map((mk) => (
                  <option key={mk} value={mk}>
                    {getMonthLabel(mk)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {dailySummaries.length === 0 ? (
            <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-white mb-1">
                No earnings logged yet
              </p>
              <p className="text-xs text-zinc-400">
                Log your first Rapido, Bounce, or Shiprocket shift to see daily target progress.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySummaries.map((day) => {
                const diff = day.total - dailyTarget;
                const metTarget = diff >= 0;

                return (
                  <div key={day.date} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-medium text-zinc-400">
                        {formatDateDisplay(day.date)}
                      </p>
                      <p
                        className={`text-xs font-mono-num font-semibold ${
                          metTarget ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formatINR(day.total)} ·{' '}
                        {metTarget
                          ? `+${formatINR(diff)} extra`
                          : `${formatINR(Math.abs(diff))} short`}
                      </p>
                    </div>

                    <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
                      {day.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 flex items-center justify-between gap-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 flex-1 min-w-0 items-center">
                            <span className="sm:col-span-3 text-sm font-semibold text-white truncate">
                              {entry.app}
                            </span>
                            <div className="sm:col-span-9 min-w-0">
                              <p className="text-xs sm:text-sm text-zinc-200 truncate">
                                {entry.shiftLabel || 'Regular Shift'}
                              </p>
                              <p className="text-[11px] text-zinc-500 font-mono-num truncate">
                                Base {formatINR(entry.baseAmount)} + Inc{' '}
                                {formatINR(entry.incentive)} + Bonus{' '}
                                {formatINR(entry.bonus)}
                                {entry.notes ? ` · ${entry.notes}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono-num text-sm font-bold text-emerald-400 mr-1">
                              +{formatINR(entry.totalAmount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEdit(entry)}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                              title="Edit entry"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(entry.id)}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                              title="Delete entry"
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
