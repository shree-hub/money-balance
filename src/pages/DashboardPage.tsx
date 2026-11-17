import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import { ReadinessGauge } from '../components/ReadinessGauge';
import {
  EarningEntry,
  EmiLoan,
  EmiPayment,
  ExpenseEntry,
  PageKey,
  UserProfile,
} from '../types/finance';
import { FinanceSummary } from '../utils/financeCalculations';
import {
  formatDateDisplay,
  formatINR,
  getMonthKey,
  getMonthLabel,
} from '../utils/formatters';

interface DashboardPageProps {
  profile: UserProfile;
  earnings: EarningEntry[];
  expenses: ExpenseEntry[];
  payments: EmiPayment[];
  summary: FinanceSummary;
  onNavigate: (page: PageKey) => void;
  onOpenPaymentModal: (emi: EmiLoan) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  earnings,
  expenses,
  payments,
  summary,
  onNavigate,
  onOpenPaymentModal,
}) => {
  const [periodMode, setPeriodMode] = useState<'monthly' | 'all'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    getMonthKey(summary.todayISO)
  );

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([
      getMonthKey(summary.todayISO),
      '2026-11',
      '2026-12',
    ]);
    earnings.forEach((e) => keys.add(getMonthKey(e.date)));
    expenses.forEach((ex) => keys.add(getMonthKey(ex.date)));
    return Array.from(keys).filter(Boolean).sort().reverse();
  }, [earnings, expenses, summary.todayISO]);

  const periodEarnings = useMemo(() => {
    if (periodMode === 'all') return summary.totalLoggedEarnings;
    return earnings
      .filter((e) => getMonthKey(e.date) === selectedMonth)
      .reduce((s, e) => s + e.totalAmount, 0);
  }, [periodMode, selectedMonth, earnings, summary.totalLoggedEarnings]);

  const periodExpenses = useMemo(() => {
    if (periodMode === 'all') return summary.totalExpenses;
    return expenses
      .filter((ex) => getMonthKey(ex.date) === selectedMonth)
      .reduce((s, ex) => s + ex.amount, 0);
  }, [periodMode, selectedMonth, expenses, summary.totalExpenses]);

  const totalObligations = summary.totalEmiPaid + summary.totalPendingEmis;
  const emiReadinessPct =
    totalObligations > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((summary.totalEmiPaid + Math.max(0, summary.availableBalance)) /
                totalObligations) *
                100
            )
          )
        )
      : 100;

  const firstName = (profile.displayName || 'Partner').split(' ')[0];
  const todayProgressPct =
    summary.todayTarget > 0
      ? Math.min(100, Math.round((summary.todayEarnings / summary.todayTarget) * 100))
      : 0;

  const urgentAlerts = summary.notifications.filter(
    (n) => n.type === 'overdue' || n.type === 'warning'
  );

  const upcomingFour = summary.waterfallPlan.slice(0, 4);

  // Chart 1: Monthly Income vs Expenses BarChart
  const monthlyStatsChart = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    const seedMonths = ['2026-11', '2026-12'];
    seedMonths.forEach((m) =>
      map.set(m, { month: getMonthLabel(m).split(' ')[0], income: 0, expense: 0 })
    );

    earnings.forEach((e) => {
      const mk = getMonthKey(e.date);
      const cur = map.get(mk) || {
        month: getMonthLabel(mk).split(' ')[0],
        income: 0,
        expense: 0,
      };
      cur.income += e.totalAmount;
      map.set(mk, cur);
    });

    expenses.forEach((ex) => {
      const mk = getMonthKey(ex.date);
      const cur = map.get(mk) || {
        month: getMonthLabel(mk).split(' ')[0],
        income: 0,
        expense: 0,
      };
      cur.expense += ex.amount;
      map.set(mk, cur);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, val]) => val);
  }, [earnings, expenses]);

  // Chart 2: Running Balance AreaChart
  const balanceCurveData = useMemo(() => {
    const dates = new Set<string>();
    earnings.forEach((e) => dates.add(e.date));
    expenses.forEach((ex) => dates.add(ex.date));
    payments.forEach((p) => dates.add(p.paymentDate));
    const sorted = Array.from(dates).sort();

    if (sorted.length === 0) {
      return [
        {
          date: formatDateDisplay(profile.startingBalanceDate || '2026-11-16').slice(0, 6),
          balance: summary.startingBalance,
        },
        {
          date: formatDateDisplay(summary.todayISO).slice(0, 6),
          balance: summary.availableBalance,
        },
      ];
    }

    let running = summary.startingBalance;
    return sorted.map((d) => {
      const dayIn = earnings
        .filter((e) => e.date === d)
        .reduce((s, e) => s + e.totalAmount, 0);
      const dayOut = expenses
        .filter((ex) => ex.date === d)
        .reduce((s, ex) => s + ex.amount, 0);
      const dayEmi = payments
        .filter((p) => p.paymentDate === d)
        .reduce((s, p) => s + p.amount, 0);
      running += dayIn - dayOut - dayEmi;
      return {
        date: formatDateDisplay(d).slice(0, 6),
        balance: running,
      };
    });
  }, [
    earnings,
    expenses,
    payments,
    profile.startingBalanceDate,
    summary.startingBalance,
    summary.availableBalance,
    summary.todayISO,
  ]);

  const netPeriodSavingsRate =
    periodEarnings > 0
      ? Math.round(((periodEarnings - periodExpenses) / periodEarnings) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Top Period Filter Controls (Reference Screen Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value as 'monthly' | 'all')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1B1E24] border border-white/[0.1] text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="monthly">Monthly</option>
            <option value="all">All Time</option>
          </select>

          {periodMode === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white text-zinc-950 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {monthOptions.map((mk) => (
                <option key={mk} value={mk}>
                  {getMonthLabel(mk)}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="text-xs font-mono-num text-zinc-400">
          {formatDateDisplay(summary.todayISO)}
        </p>
      </div>

      {/* Urgent Warning Banner (Only when overdue or cash shortfall exists) */}
      {urgentAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">
                {urgentAlerts[0].title}
              </p>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                {urgentAlerts[0].message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(urgentAlerts[0].actionPage)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review Plan
          </button>
        </div>
      )}

      {/* Greeting + EMI Readiness Gauge Hero Row */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {firstName}!
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {summary.remainingToEarnForAllEmis === 0 ? (
              <>
                All scheduled EMIs are{' '}
                <span className="text-emerald-400 font-semibold">Fully Funded</span>
              </>
            ) : (
              <>
                EMI coverage is{' '}
                <span className="text-sky-400 font-semibold font-mono-num">
                  {emiReadinessPct}%
                </span>{' '}
                ·{' '}
                <span className="text-zinc-300 font-mono-num">
                  {formatINR(summary.remainingToEarnForAllEmis)}
                </span>{' '}
                left to earn
              </>
            )}
          </p>
        </div>

        <ReadinessGauge
          percentage={emiReadinessPct}
          label="EMI readiness"
          sublabel={
            emiReadinessPct >= 75
              ? 'On Track'
              : emiReadinessPct >= 35
              ? 'Building Reserve'
              : 'Action Needed'
          }
        />
      </section>

      {/* Unified 3-Column Balance / Income / Expenses Card (Reference Pattern) */}
      <section className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] text-center">
          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-1">Balance</p>
            <p
              className={`font-mono-num text-base sm:text-2xl font-bold truncate ${
                summary.availableBalance >= 0 ? 'text-white' : 'text-red-400'
              }`}
            >
              {formatINR(summary.availableBalance)}
            </p>
            <p className="text-[11px] font-mono-num text-sky-400 mt-1">
              Net {netPeriodSavingsRate}%
            </p>
          </div>

          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-1">
              {periodMode === 'monthly' ? 'Month Income' : 'Total Income'}
            </p>
            <p className="font-mono-num text-base sm:text-2xl font-bold text-emerald-400 truncate">
              {formatINR(periodEarnings)}
            </p>
            <p className="text-[11px] font-mono-num text-zinc-400 mt-1">
              Start {formatINR(summary.startingBalance)}
            </p>
          </div>

          <div className="px-2">
            <p className="text-xs text-zinc-400 mb-1">
              {periodMode === 'monthly' ? 'Month Expenses' : 'Total Expenses'}
            </p>
            <p className="font-mono-num text-base sm:text-2xl font-bold text-red-400 truncate">
              {formatINR(periodExpenses)}
            </p>
            <p className="text-[11px] font-mono-num text-zinc-400 mt-1">
              Paid {formatINR(summary.totalEmiPaid)}
            </p>
          </div>
        </div>
      </section>

      {/* 4 Core Delivery & EMI KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Today&apos;s Earnings</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="font-mono-num text-xl sm:text-2xl font-bold text-white">
              {formatINR(summary.todayEarnings)}
            </p>
            <span className="text-xs font-mono-num text-zinc-400">
              / {formatINR(summary.todayTarget)}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-[#2A2F3A] overflow-hidden">
            <div
              className={`h-full rounded-full ${
                summary.todayDiff >= 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${todayProgressPct}%` }}
            />
          </div>
          <p
            className={`text-[11px] mt-2 font-medium ${
              summary.todayDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {summary.todayDiff >= 0
              ? `Target met (+${formatINR(summary.todayDiff)})`
              : `${formatINR(Math.abs(summary.todayDiff))} to daily target`}
          </p>
        </div>

        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Pending EMIs</span>
            <CalendarClock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-mono-num text-xl sm:text-2xl font-bold text-white">
            {formatINR(summary.totalPendingEmis)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2">
            Nov {formatINR(summary.novemberRemaining)} · Dec{' '}
            {formatINR(summary.decemberRemaining)}
          </p>
        </div>

        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Dec Loan Savings</span>
            <PiggyBank className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="font-mono-num text-xl sm:text-2xl font-bold text-white">
              {summary.decemberProgressPct}%
            </p>
            <span className="text-xs font-mono-num text-zinc-400">
              {formatINR(summary.decemberPaid + summary.decemberAllocatedSavings)} /{' '}
              {formatINR(summary.decemberTotal)}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-[#2A2F3A] overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{ width: `${summary.decemberProgressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Filled after Nov {formatINR(summary.novemberTotal)} pool
          </p>
        </div>

        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Next EMI Deadline</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-mono-num text-xl sm:text-2xl font-bold text-white">
            {summary.nextDeadlineEmi ? (
              (summary.daysUntilNextDeadline ?? 0) < 0 ? (
                <span className="text-red-400">
                  {Math.abs(summary.daysUntilNextDeadline ?? 0)}d overdue
                </span>
              ) : summary.daysUntilNextDeadline === 0 ? (
                <span className="text-amber-400">Due Today</span>
              ) : (
                `${summary.daysUntilNextDeadline} days`
              )
            ) : (
              'All Clear'
            )}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2 truncate">
            {summary.nextDeadlineEmi
              ? `${summary.nextDeadlineEmi.title} · ${formatDateDisplay(
                  summary.nextDeadlineEmi.dueDate
                )}`
              : 'Zero pending EMIs'}
          </p>
        </div>
      </section>

      {/* Reference-Inspired Dual Dashboard Charts: Monthly Stats + Monthly Balance */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-white">
              Monthly Stats
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-400 inline-block" />
                Expense
              </span>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStatsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
                <XAxis dataKey="month" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15181E',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(v: unknown) => formatINR(Number(v))}
                />
                <Bar dataKey="income" name="Income" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#F87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-white">
              Available Balance Trend
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Stats</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceCurveData}>
                <defs>
                  <linearGradient id="dashBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
                <XAxis dataKey="date" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15181E',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(v: unknown) => [formatINR(Number(v)), 'Balance']}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fill="url(#dashBalanceGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Priority EMI Deadlines Queue */}
      <section className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Priority EMI Deadlines
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Chronological allocation from Available Balance (no double counting)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('emis')}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#232730] hover:bg-[#2B303B] border border-white/[0.08] text-xs font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span>All EMIs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingFour.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">All EMIs Paid</p>
            <p className="text-xs text-zinc-400 mt-1">
              You have cleared every scheduled EMI instalment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {upcomingFour.map((item) => {
              const statusText = item.isOverdue
                ? `Overdue by ${Math.abs(item.daysLeft)}d`
                : item.daysLeft === 0
                ? 'Due today'
                : `${item.daysLeft}d left`;

              const statusColor = item.isOverdue
                ? 'text-red-400'
                : item.daysLeft <= 3
                ? 'text-amber-400'
                : 'text-zinc-400';

              return (
                <div
                  key={item.emi.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{item.emi.title}</p>
                      <span className="text-zinc-600">·</span>
                      <span className="text-xs font-mono-num text-zinc-400">
                        {formatDateDisplay(item.emi.dueDate)}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className={`text-xs font-medium ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Covered now:{' '}
                      <span className="font-mono-num text-emerald-400">
                        {formatINR(item.allocatedFromAvailable)}
                      </span>{' '}
                      · Remaining gap:{' '}
                      <span
                        className={`font-mono-num ${
                          item.uncoveredGap > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatINR(item.uncoveredGap)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <p className="font-mono-num text-base font-bold text-white">
                      {formatINR(item.remainingDue)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenPaymentModal(item.emi)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
