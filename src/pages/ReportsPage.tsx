import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import {
  EarningEntry,
  EmiLoan,
  EmiPayment,
  ExpenseEntry,
} from '../types/finance';
import { FinanceSummary } from '../utils/financeCalculations';
import {
  downloadCSV,
  formatDateDisplay,
  formatINR,
  getMonthKey,
  getMonthLabel,
  getWeekStartISO,
} from '../utils/formatters';

interface ReportsPageProps {
  earnings: EarningEntry[];
  emis: EmiLoan[];
  payments: EmiPayment[];
  expenses: ExpenseEntry[];
  summary: FinanceSummary;
}

const PIE_COLORS = ['#3B82F6', '#A855F7', '#22C55E', '#F59E0B', '#EF4444'];

export const ReportsPage: React.FC<ReportsPageProps> = ({
  earnings,
  emis,
  payments,
  expenses,
  summary,
}) => {
  const [breakdownTab, setBreakdownTab] = useState<'expense' | 'income'>('expense');

  // Screen 3 Pattern: Expense Category vs Income App Pie + Percentage Bars
  const expensePieData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((ex) => {
      map.set(ex.category, (map.get(ex.category) || 0) + ex.amount);
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([name, value], idx) => ({
        name,
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const incomePieData = useMemo(() => {
    const totals = { Rapido: 0, Bounce: 0, Shiprocket: 0 };
    earnings.forEach((e) => {
      totals[e.app] = (totals[e.app] || 0) + e.totalAmount;
    });
    const entries = Object.entries(totals).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries
      .map(([name, value], idx) => ({
        name,
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [earnings]);

  const activePieList = breakdownTab === 'expense' ? expensePieData : incomePieData;
  const activePieTotal =
    breakdownTab === 'expense' ? summary.totalExpenses : summary.totalLoggedEarnings;

  // Daily Earnings Series
  const dailyChartData = useMemo(() => {
    const map = new Map<string, number>();
    earnings.forEach((e) => {
      map.set(e.date, (map.get(e.date) || 0) + e.totalAmount);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, total]) => ({
        label: formatDateDisplay(date).slice(0, 6),
        earnings: total,
      }));
  }, [earnings]);

  // Weekly Earnings Series
  const weeklyChartData = useMemo(() => {
    const map = new Map<string, number>();
    earnings.forEach((e) => {
      const wk = getWeekStartISO(e.date);
      map.set(wk, (map.get(wk) || 0) + e.totalAmount);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([wk, total]) => ({
        week: `Wk ${formatDateDisplay(wk).slice(0, 6)}`,
        earnings: total,
      }));
  }, [earnings]);

  // Monthly Income vs Expenses Series
  const monthlyComparisonData = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    earnings.forEach((e) => {
      const mk = getMonthKey(e.date);
      const cur = map.get(mk) || { income: 0, expenses: 0 };
      cur.income += e.totalAmount;
      map.set(mk, cur);
    });
    expenses.forEach((ex) => {
      const mk = getMonthKey(ex.date);
      const cur = map.get(mk) || { income: 0, expenses: 0 };
      cur.expenses += ex.amount;
      map.set(mk, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mk, vals]) => ({
        month: getMonthLabel(mk),
        income: vals.income,
        expenses: vals.expenses,
      }));
  }, [earnings, expenses]);

  // App-wise Comparison
  const appComparisonData = useMemo(() => {
    const totals = { Rapido: 0, Bounce: 0, Shiprocket: 0 };
    earnings.forEach((e) => {
      totals[e.app] = (totals[e.app] || 0) + e.totalAmount;
    });
    return [
      { app: 'Rapido', total: totals.Rapido },
      { app: 'Bounce', total: totals.Bounce },
      { app: 'Shiprocket', total: totals.Shiprocket },
    ];
  }, [earnings]);

  // Savings Progress Trajectory
  const savingsProgressData = useMemo(() => {
    const dateSet = new Set<string>();
    earnings.forEach((e) => dateSet.add(e.date));
    expenses.forEach((ex) => dateSet.add(ex.date));
    payments.forEach((p) => dateSet.add(p.paymentDate));
    const sortedDates = Array.from(dateSet).sort();

    if (sortedDates.length === 0) {
      return [
        {
          label: formatDateDisplay('2026-11-16').slice(0, 6),
          netBalance: summary.startingBalance,
        },
      ];
    }

    let running = summary.startingBalance;
    return sortedDates.map((d) => {
      const dayEarn = earnings
        .filter((e) => e.date === d)
        .reduce((s, e) => s + e.totalAmount, 0);
      const dayExp = expenses
        .filter((ex) => ex.date === d)
        .reduce((s, ex) => s + ex.amount, 0);
      const dayPaid = payments
        .filter((p) => p.paymentDate === d)
        .reduce((s, p) => s + p.amount, 0);
      running += dayEarn - dayExp - dayPaid;
      return {
        label: formatDateDisplay(d).slice(0, 6),
        netBalance: running,
      };
    });
  }, [earnings, expenses, payments, summary.startingBalance]);

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [
      ['SECTION', 'DATE', 'TITLE / APP / CATEGORY', 'DETAILS', 'AMOUNT (INR)', 'STATUS / MODE'],
    ];

    earnings.forEach((e) => {
      rows.push([
        'EARNING',
        formatDateDisplay(e.date),
        e.app,
        `Base ${e.baseAmount} + Inc ${e.incentive} + Bonus ${e.bonus}`,
        e.totalAmount,
        e.shiftLabel || 'Single Shift',
      ]);
    });

    expenses.forEach((ex) => {
      rows.push([
        'EXPENSE',
        formatDateDisplay(ex.date),
        ex.category,
        ex.description,
        -ex.amount,
        ex.isRecurring ? 'Recurring' : 'One-time',
      ]);
    });

    emis.forEach((emi) => {
      rows.push([
        'EMI_SCHEDULE',
        formatDateDisplay(emi.dueDate),
        emi.title,
        emi.monthCycle,
        emi.amountDue,
        `Paid: ${emi.amountPaid} (${emi.status})`,
      ]);
    });

    payments.forEach((p) => {
      rows.push([
        'EMI_PAYMENT',
        formatDateDisplay(p.paymentDate),
        p.emiTitle,
        p.monthCycle,
        p.amount,
        p.paymentMode,
      ]);
    });

    downloadCSV(`earnings-emi-report-${summary.todayISO}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-4">
        <div>
          <h2 className="font-display text-base font-bold text-white">
            Stats, Analytics &amp; Exports
          </h2>
          <p className="text-xs text-zinc-400">
            Category breakdown, delivery app comparison, and printable financial statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#232730] hover:bg-[#2C313C] border border-white/[0.08] text-zinc-100 text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Print Summary Header */}
      <div className="hidden print-only border-b border-slate-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-slate-900">
          My Earnings &amp; EMI Manager — Financial Report
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Generated on {formatDateDisplay(summary.todayISO)} · Available Balance:{' '}
          {formatINR(summary.availableBalance)} · Total Pending EMIs:{' '}
          {formatINR(summary.totalPendingEmis)}
        </p>
      </div>

      {/* Screen 3 Pattern: Expense vs Income Underline Tabs + Pie Chart + Percentage Progress Bars */}
      <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-2 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setBreakdownTab('expense')}
            className={`py-3.5 px-4 text-center border-b-2 transition-colors cursor-pointer ${
              breakdownTab === 'expense'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="block text-sm font-semibold">Expense</span>
            <span className="block font-mono-num text-xs mt-0.5 text-red-400">
              {formatINR(summary.totalExpenses)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBreakdownTab('income')}
            className={`py-3.5 px-4 text-center border-b-2 transition-colors cursor-pointer ${
              breakdownTab === 'income'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="block text-sm font-semibold">Income</span>
            <span className="block font-mono-num text-xs mt-0.5 text-emerald-400">
              {formatINR(summary.totalLoggedEarnings)}
            </span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 h-64">
            {activePieList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 text-center px-4">
                {breakdownTab === 'expense'
                  ? 'No expenses logged yet. Add expenses to see category distribution.'
                  : 'No delivery earnings logged yet. Log Rapido, Bounce, or Shiprocket earnings to view breakdown.'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieList}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    stroke="#1B1E24"
                    strokeWidth={2}
                  >
                    {activePieList.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#15181E',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => formatINR(Number(val))}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>
                {breakdownTab === 'expense'
                  ? 'Expense Breakdown by Category'
                  : 'Income Breakdown by Delivery App'}
              </span>
              <span className="font-mono-num text-white font-semibold">
                Total {formatINR(activePieTotal)}
              </span>
            </div>

            {activePieList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4">
                Breakdown rows will appear once entries are recorded.
              </p>
            ) : (
              activePieList.map((item) => (
                <div
                  key={item.name}
                  className="bg-[#14161B] border border-white/[0.06] rounded-xl p-3.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-xs font-bold"
                      style={{ color: item.color }}
                    >
                      {item.name}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-white">
                      {formatINR(item.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-[#252932] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(4, item.pct)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="font-mono-num text-xs font-bold text-zinc-300 w-10 text-right">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-white mb-1">
            Daily Earnings vs Target ({formatINR(summary.todayTarget)})
          </h3>
          <p className="text-xs text-zinc-400 mb-4">Last 14 active earning days</p>
          <div className="h-60 w-full">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Log daily earnings to render this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717A" fontSize={11} />
                  <YAxis stroke="#71717A" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#15181E',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown) => [formatINR(Number(value)), 'Earnings']}
                  />
                  <ReferenceLine
                    y={summary.todayTarget}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="earnings" fill="#4ADE80" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-white mb-1">
            Weekly Earnings Trend
          </h3>
          <p className="text-xs text-zinc-400 mb-4">Aggregated Monday–Sunday totals</p>
          <div className="h-60 w-full">
            {weeklyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                No weekly earning data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
                  <XAxis dataKey="week" stroke="#71717A" fontSize={11} />
                  <YAxis stroke="#71717A" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#15181E',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown) => [formatINR(Number(value)), 'Weekly Total']}
                  />
                  <Bar dataKey="earnings" fill="#38BDF8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-white mb-1">
            Monthly Income vs Expenses
          </h3>
          <p className="text-xs text-zinc-400 mb-4">Net margin comparison</p>
          <div className="h-60 w-full">
            {monthlyComparisonData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Log earnings or expenses to compare monthly cashflow.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData}>
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
                    formatter={(value: unknown) => formatINR(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Income" fill="#4ADE80" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F87171" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-white mb-1">
            App-Wise Earnings Comparison
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Rapido vs Bounce vs Shiprocket contribution
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
                <XAxis dataKey="app" stroke="#71717A" fontSize={12} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#15181E',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [formatINR(Number(value)), 'Total']}
                />
                <Bar dataKey="total" fill="#4ADE80" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Savings Progress Chart */}
      <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
        <h3 className="font-display text-sm font-bold text-white mb-1">
          Available Savings Balance Trajectory
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Running balance starting from {formatINR(summary.startingBalance)} after expenses &amp; EMI payments
        </p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsProgressData}>
              <defs>
                <linearGradient id="reportSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#272B35" vertical={false} />
              <XAxis dataKey="label" stroke="#71717A" fontSize={11} />
              <YAxis stroke="#71717A" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#15181E',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                }}
                formatter={(value: unknown) => [formatINR(Number(value)), 'Balance']}
              />
              <Area
                type="monotone"
                dataKey="netBalance"
                stroke="#38BDF8"
                fill="url(#reportSavingsGrad)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Printable EMI Payment History Table */}
      <section className="print-card bg-[#1B1E24] border border-white/[0.08] rounded-2xl p-5">
        <h3 className="font-display text-base font-bold text-white mb-3">
          EMI Payment History Ledger
        </h3>
        {payments.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4">
            No EMI payments recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Loan</th>
                  <th className="py-2 pr-4 font-medium">Cycle</th>
                  <th className="py-2 pr-4 font-medium">Mode</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 font-mono-num text-zinc-300">
                      {formatDateDisplay(p.paymentDate)}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-white">{p.emiTitle}</td>
                    <td className="py-2.5 pr-4 text-zinc-400">{p.monthCycle}</td>
                    <td className="py-2.5 pr-4 text-zinc-300">{p.paymentMode}</td>
                    <td className="py-2.5 text-right font-mono-num font-semibold text-emerald-400">
                      {formatINR(p.amount)}
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
