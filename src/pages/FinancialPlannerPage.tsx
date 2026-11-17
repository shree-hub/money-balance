import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { SettingsUpdateInput } from '../hooks/useFinanceStore';
import { EmiLoan, UserProfile } from '../types/finance';
import { FinanceSummary } from '../utils/financeCalculations';
import { formatDateDisplay, formatINR } from '../utils/formatters';

interface FinancialPlannerPageProps {
  profile: UserProfile;
  summary: FinanceSummary;
  onUpdateSettings: (updates: SettingsUpdateInput) => Promise<void>;
  onOpenPaymentModal: (emi: EmiLoan) => void;
}

export const FinancialPlannerPage: React.FC<FinancialPlannerPageProps> = ({
  profile,
  summary,
  onUpdateSettings,
  onOpenPaymentModal,
}) => {
  const [targetInput, setTargetInput] = useState(String(profile.dailyTarget));
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  useEffect(() => {
    setTargetInput(String(profile.dailyTarget));
  }, [profile.dailyTarget]);

  const dailyFixedBurn = Math.ceil(
    (profile.evWeeklyRent || 0) / 7 + (profile.dailyFoodBudget || 0)
  );
  const realisticGrossDailyNeeded =
    summary.requiredDailyAverageForUpcoming > 0
      ? summary.requiredDailyAverageForUpcoming + dailyFixedBurn
      : 0;

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(targetInput);
    if (!Number.isFinite(val) || val < 100) return;
    setSavingTarget(true);
    setTargetSaved(false);
    try {
      await onUpdateSettings({ dailyTarget: val });
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2500);
    } finally {
      setSavingTarget(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Earning Target Calculator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-base font-bold text-white">
              Earning Target Calculator
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Adjust your daily earning goal. Weekly, monthly, and daily reserve projections update immediately across the dashboard.
          </p>

          <form onSubmit={handleSaveTarget} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Daily Earning Target (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="50"
                  required
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  {savingTarget ? 'Saving...' : 'Update Target'}
                </button>
              </div>
              {targetSaved && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Daily target updated</span>
                </p>
              )}
            </div>
          </form>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-[#0A1120] border border-slate-800/70">
              <p className="text-[11px] text-slate-400">Weekly Target (7d)</p>
              <p className="font-mono-num text-base font-bold text-white mt-0.5">
                {formatINR(summary.weeklyTarget)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0A1120] border border-slate-800/70">
              <p className="text-[11px] text-slate-400">Monthly Target (30d)</p>
              <p className="font-mono-num text-base font-bold text-white mt-0.5">
                {formatINR(summary.monthlyTarget)}
              </p>
            </div>
          </div>
        </div>

        {/* Realistic Repayment Summary */}
        <div className="lg:col-span-7 bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white mb-4">
              Realistic Repayment Plan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <p className="text-[11px] text-slate-400">Total Pending EMIs</p>
                <p className="font-mono-num text-lg font-bold text-white mt-0.5">
                  {formatINR(summary.totalPendingEmis)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <p className="text-[11px] text-slate-400">Available Cash Pool</p>
                <p
                  className={`font-mono-num text-lg font-bold mt-0.5 ${
                    summary.availableBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatINR(summary.availableBalance)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <p className="text-[11px] text-slate-400">Net Shortfall to Earn</p>
                <p className="font-mono-num text-lg font-bold text-amber-400 mt-0.5">
                  {formatINR(summary.remainingToEarnForAllEmis)}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-[#0A1120] border border-slate-800/70 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span>Net daily reserve needed (for EMIs only):</span>
                <span className="font-mono-num font-bold text-emerald-400 text-sm">
                  {formatINR(summary.requiredDailyAverageForUpcoming)} / day
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  Estimated daily fixed cost (EV {formatINR(profile.evWeeklyRent)}/wk + Food {formatINR(profile.dailyFoodBudget)}/day):
                </span>
                <span className="font-mono-num font-semibold text-amber-300">
                  +{formatINR(dailyFixedBurn)} / day
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-semibold text-white">
                  Recommended gross riding target (next {summary.daysUntilFinalDecemberDeadline} days):
                </span>
                <span className="font-mono-num font-bold text-white text-sm">
                  {formatINR(realisticGrossDailyNeeded)} / day
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4">
            Every rupee in Available Balance is assigned strictly once in chronological order of due date—never counted twice between November and December.
          </p>
        </div>
      </section>

      {/* Separated Pool Status */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-bold text-white">
              Pool 1 · November 2026 Funds
            </h3>
            <span className="text-xs font-mono-num text-slate-400">
              {formatINR(summary.novemberRemaining)} pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Allocated from available balance:{' '}
            <strong className="font-mono-num text-emerald-400">
              {formatINR(summary.novemberAllocatedBalance)}
            </strong>{' '}
            · Shortfall:{' '}
            <strong className="font-mono-num text-amber-400">
              {formatINR(summary.novemberShortfall)}
            </strong>
          </p>
          {summary.novemberShortfall > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Available balance is insufficient to cover all November EMIs. Clear this {formatINR(summary.novemberShortfall)} gap before reserving cash for December.
              </span>
            </div>
          )}
        </div>

        <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-bold text-white">
              Pool 2 · December 2026 Funds
            </h3>
            <span className="text-xs font-mono-num text-slate-400">
              {formatINR(summary.decemberRemaining)} pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Allocated surplus after November:{' '}
            <strong className="font-mono-num text-emerald-400">
              {formatINR(summary.decemberAllocatedSavings)}
            </strong>{' '}
            · Remaining needed:{' '}
            <strong className="font-mono-num text-amber-400">
              {formatINR(summary.decemberShortfall)}
            </strong>
          </p>
          {summary.decemberAllocatedSavings === 0 && summary.novemberShortfall > 0 && (
            <div className="flex items-start gap-2 text-xs text-slate-300 bg-[#0A1120] border border-slate-800 rounded-xl p-3">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                December allocation starts once the November {formatINR(summary.novemberShortfall)} deficit is funded.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Chronological Waterfall Table */}
      <section className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-white">
            Chronological Repayment Waterfall
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Nearest deadlines first. Recalculates automatically when an EMI is paid or a new expense is logged.
          </p>
        </div>

        {summary.waterfallPlan.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">
              No pending EMIs in queue
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Due Date</th>
                  <th className="py-2.5 pr-4 font-medium">Loan</th>
                  <th className="py-2.5 pr-4 font-medium">Pool</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Due Bal.</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Allocated Now</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Gap to Earn</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Reserve / Day</th>
                  <th className="py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                {summary.waterfallPlan.map((row) => (
                  <tr key={row.emi.id}>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="font-mono-num text-slate-200">
                        {formatDateDisplay(row.emi.dueDate)}
                      </span>
                      <span
                        className={`block text-[11px] ${
                          row.isOverdue
                            ? 'text-red-400'
                            : row.daysLeft <= 3
                            ? 'text-amber-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {row.isOverdue
                          ? `${Math.abs(row.daysLeft)}d overdue`
                          : row.daysLeft === 0
                          ? 'Due today'
                          : `${row.daysLeft}d left`}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-white">
                      {row.emi.title}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-400">
                      {row.emi.monthCycle}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-num text-white">
                      {formatINR(row.remainingDue)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-num text-emerald-400">
                      {formatINR(row.allocatedFromAvailable)}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-mono-num font-semibold ${
                        row.uncoveredGap > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatINR(row.uncoveredGap)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-num text-slate-200">
                      {row.uncoveredGap > 0 ? `${formatINR(row.recommendedDailyReserve)}/d` : 'Covered'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(row.emi)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Pay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
