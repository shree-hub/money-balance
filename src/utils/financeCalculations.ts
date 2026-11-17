import {
  AppNotification,
  EarningEntry,
  EmiLoan,
  EmiPayment,
  ExpenseEntry,
  UserProfile,
} from '../types/finance';
import {
  daysBetween,
  formatDateDisplay,
  formatINR,
  getMonthKey,
  getTodayISO,
  getWeekStartISO,
} from './formatters';

export interface WaterfallPlanItem {
  emi: EmiLoan;
  remainingDue: number;
  daysLeft: number;
  isOverdue: boolean;
  allocatedFromAvailable: number;
  uncoveredGap: number;
  cumulativeNeeded: number;
  cumulativeCovered: boolean;
  recommendedDailyReserve: number;
}

export interface FinanceSummary {
  todayISO: string;
  todayEarnings: number;
  todayTarget: number;
  todayDiff: number;
  monthlyEarnings: number;
  monthlyExpenses: number;
  totalLoggedEarnings: number;
  startingBalance: number;
  totalAvailableGrossPool: number;
  totalExpenses: number;
  netSavingsAfterExpenses: number;
  totalEmiPaid: number;
  availableBalance: number;
  totalPendingEmis: number;
  novemberTotal: number;
  novemberPaid: number;
  novemberRemaining: number;
  novemberAllocatedBalance: number;
  novemberShortfall: number;
  decemberTotal: number;
  decemberPaid: number;
  decemberRemaining: number;
  decemberAllocatedSavings: number;
  decemberShortfall: number;
  decemberProgressPct: number;
  remainingToEarnForAllEmis: number;
  nextDeadlineEmi: EmiLoan | null;
  daysUntilNextDeadline: number | null;
  daysUntilFinalDecemberDeadline: number;
  requiredDailyAverageForUpcoming: number;
  weeklyTarget: number;
  monthlyTarget: number;
  thisWeekEarnings: number;
  thisWeekExpenses: number;
  thisWeekNetSavings: number;
  weeklyProjectedExpenses: number;
  waterfallPlan: WaterfallPlanItem[];
  notifications: AppNotification[];
}

export function getEffectiveEmiStatus(emi: EmiLoan, todayISO: string): EmiLoan['status'] {
  if (emi.amountPaid >= emi.amountDue || emi.status === 'paid') return 'paid';
  if (emi.dueDate < todayISO) return 'overdue';
  if (emi.amountPaid > 0) return 'partial';
  return emi.status === 'overdue' ? 'overdue' : 'pending';
}

export function computeFinanceSummary(
  profile: UserProfile,
  earnings: EarningEntry[],
  emis: EmiLoan[],
  _payments: EmiPayment[],
  expenses: ExpenseEntry[],
  referenceDateISO?: string
): FinanceSummary {
  const todayISO = referenceDateISO || getTodayISO();
  const currentMonthKey = getMonthKey(todayISO);
  const currentWeekKey = getWeekStartISO(todayISO);

  const todayEarnings = earnings
    .filter((e) => e.date === todayISO)
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const monthlyEarnings = earnings
    .filter((e) => getMonthKey(e.date) === currentMonthKey)
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const monthlyExpenses = expenses
    .filter((ex) => getMonthKey(ex.date) === currentMonthKey)
    .reduce((sum, ex) => sum + ex.amount, 0);

  const thisWeekEarnings = earnings
    .filter((e) => getWeekStartISO(e.date) === currentWeekKey)
    .reduce((sum, e) => sum + e.totalAmount, 0);

  const thisWeekExpenses = expenses
    .filter((ex) => getWeekStartISO(ex.date) === currentWeekKey)
    .reduce((sum, ex) => sum + ex.amount, 0);

  const totalLoggedEarnings = earnings.reduce((sum, e) => sum + e.totalAmount, 0);
  const startingBalance = profile.startingBalance || 0;
  const totalAvailableGrossPool = startingBalance + totalLoggedEarnings;
  const totalExpenses = expenses.reduce((sum, ex) => sum + ex.amount, 0);

  // Never treat gross earnings as available savings
  const netSavingsAfterExpenses = totalAvailableGrossPool - totalExpenses;

  const normalizedEmis = emis.map((emi) => ({
    ...emi,
    status: getEffectiveEmiStatus(emi, todayISO),
  }));

  const totalEmiPaid = normalizedEmis.reduce((sum, e) => sum + e.amountPaid, 0);
  const availableBalance = netSavingsAfterExpenses - totalEmiPaid;

  const unpaidEmis = normalizedEmis
    .filter((e) => e.amountDue - e.amountPaid > 0 && e.status !== 'paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalPendingEmis = unpaidEmis.reduce(
    (sum, e) => sum + Math.max(0, e.amountDue - e.amountPaid),
    0
  );

  // Separate November and December funds
  const novEmis = normalizedEmis.filter((e) => e.monthCycle === 'November 2026');
  const decEmis = normalizedEmis.filter((e) => e.monthCycle === 'December 2026');

  const novemberTotal = novEmis.reduce((sum, e) => sum + e.amountDue, 0);
  const novemberPaid = novEmis.reduce((sum, e) => sum + e.amountPaid, 0);
  const novemberRemaining = novEmis.reduce(
    (sum, e) => sum + Math.max(0, e.amountDue - e.amountPaid),
    0
  );

  const decemberTotal = decEmis.reduce((sum, e) => sum + e.amountDue, 0);
  const decemberPaid = decEmis.reduce((sum, e) => sum + e.amountPaid, 0);
  const decemberRemaining = decEmis.reduce(
    (sum, e) => sum + Math.max(0, e.amountDue - e.amountPaid),
    0
  );

  // Non-double-counting waterfall: allocate positive available balance strictly in due-date order
  let remainingUnallocatedPool = Math.max(0, availableBalance);
  let cumulativeNeeded = 0;

  const waterfallPlan: WaterfallPlanItem[] = unpaidEmis.map((emi) => {
    const remainingDue = Math.max(0, emi.amountDue - emi.amountPaid);
    cumulativeNeeded += remainingDue;
    const allocatedFromAvailable = Math.min(remainingUnallocatedPool, remainingDue);
    remainingUnallocatedPool -= allocatedFromAvailable;
    const uncoveredGap = remainingDue - allocatedFromAvailable;
    const daysLeft = daysBetween(todayISO, emi.dueDate);
    const effectiveDays = Math.max(1, daysLeft);
    const recommendedDailyReserve = Math.ceil(uncoveredGap / effectiveDays);

    return {
      emi,
      remainingDue,
      daysLeft,
      isOverdue: daysLeft < 0,
      allocatedFromAvailable,
      uncoveredGap,
      cumulativeNeeded,
      cumulativeCovered: Math.max(0, availableBalance) >= cumulativeNeeded,
      recommendedDailyReserve,
    };
  });

  const novemberAllocatedBalance = waterfallPlan
    .filter((item) => item.emi.monthCycle === 'November 2026')
    .reduce((sum, item) => sum + item.allocatedFromAvailable, 0);

  const novemberShortfall = Math.max(0, novemberRemaining - novemberAllocatedBalance);

  const decemberAllocatedSavings = waterfallPlan
    .filter((item) => item.emi.monthCycle === 'December 2026')
    .reduce((sum, item) => sum + item.allocatedFromAvailable, 0);

  const decemberShortfall = Math.max(0, decemberRemaining - decemberAllocatedSavings);
  const decemberProgressPct =
    decemberTotal > 0
      ? Math.min(100, Math.round(((decemberPaid + decemberAllocatedSavings) / decemberTotal) * 100))
      : 100;

  const remainingToEarnForAllEmis = Math.max(0, totalPendingEmis - availableBalance);

  const nextDeadlineEmi = unpaidEmis.length > 0 ? unpaidEmis[0] : null;
  const daysUntilNextDeadline = nextDeadlineEmi
    ? daysBetween(todayISO, nextDeadlineEmi.dueDate)
    : null;

  const lastUnpaidDate =
    unpaidEmis.length > 0 ? unpaidEmis[unpaidEmis.length - 1].dueDate : '2026-12-25';
  const daysUntilFinalDecemberDeadline = Math.max(1, daysBetween(todayISO, lastUnpaidDate));

  const requiredDailyAverageForUpcoming =
    remainingToEarnForAllEmis > 0
      ? Math.ceil(remainingToEarnForAllEmis / daysUntilFinalDecemberDeadline)
      : 0;

  const todayTarget = profile.dailyTarget || 1500;
  const todayDiff = todayEarnings - todayTarget;
  const weeklyTarget = todayTarget * 7;
  const monthlyTarget = todayTarget * 30;

  const weeklyProjectedExpenses =
    (profile.evWeeklyRent || 0) + (profile.dailyFoodBudget || 0) * 7;
  const thisWeekNetSavings = thisWeekEarnings - thisWeekExpenses;

  // Build smart notifications
  const notifications: AppNotification[] = [];

  waterfallPlan.forEach((item) => {
    if (item.isOverdue) {
      notifications.push({
        id: `overdue-${item.emi.id}`,
        type: 'overdue',
        title: `Overdue EMI: ${item.emi.title}`,
        message: `${formatINR(item.remainingDue)} was due on ${formatDateDisplay(item.emi.dueDate)} (${Math.abs(item.daysLeft)} day${Math.abs(item.daysLeft) === 1 ? '' : 's'} overdue).`,
        actionPage: 'emis',
        dateLabel: formatDateDisplay(item.emi.dueDate),
      });
    } else if (item.daysLeft <= 3) {
      const gapNote =
        item.uncoveredGap > 0
          ? ` Shortfall of ${formatINR(item.uncoveredGap)} against allocated funds.`
          : ' Fully covered by current balance.';
      notifications.push({
        id: `upcoming-${item.emi.id}`,
        type: item.uncoveredGap > 0 ? 'warning' : 'upcoming',
        title: `Due ${item.daysLeft === 0 ? 'Today' : `in ${item.daysLeft} day${item.daysLeft === 1 ? '' : 's'}`}: ${item.emi.title}`,
        message: `${formatINR(item.remainingDue)} due on ${formatDateDisplay(item.emi.dueDate)}.${gapNote}`,
        actionPage: 'emis',
        dateLabel: formatDateDisplay(item.emi.dueDate),
      });
    }
  });

  if (nextDeadlineEmi && availableBalance < nextDeadlineEmi.amountDue - nextDeadlineEmi.amountPaid) {
    const needed = nextDeadlineEmi.amountDue - nextDeadlineEmi.amountPaid - Math.max(0, availableBalance);
    notifications.push({
      id: 'insufficient-next-emi',
      type: 'warning',
      title: `Insufficient Balance for ${nextDeadlineEmi.title}`,
      message: `Available balance is ${formatINR(availableBalance)}. You need ${formatINR(needed)} more net savings before ${formatDateDisplay(nextDeadlineEmi.dueDate)}.`,
      actionPage: 'planner',
      dateLabel: formatDateDisplay(nextDeadlineEmi.dueDate),
    });
  }

  if (todayEarnings < todayTarget) {
    notifications.push({
      id: 'daily-target-pending',
      type: 'target',
      title: 'Daily Earning Target In Progress',
      message: `Earned ${formatINR(todayEarnings)} today. ${formatINR(todayTarget - todayEarnings)} remaining to hit your ${formatINR(todayTarget)} daily goal.`,
      actionPage: 'earnings',
      dateLabel: formatDateDisplay(todayISO),
    });
  } else {
    notifications.push({
      id: 'daily-target-met',
      type: 'success',
      title: 'Daily Target Achieved',
      message: `Today's earnings (${formatINR(todayEarnings)}) beat your ${formatINR(todayTarget)} target by ${formatINR(todayDiff)}.`,
      actionPage: 'earnings',
      dateLabel: formatDateDisplay(todayISO),
    });
  }

  const weeklySavingsGoal = Math.max(0, weeklyTarget - weeklyProjectedExpenses);
  if (thisWeekNetSavings < weeklySavingsGoal) {
    notifications.push({
      id: 'weekly-savings-watch',
      type: 'target',
      title: 'Weekly Net Savings Tracker',
      message: `Net savings this week: ${formatINR(thisWeekNetSavings)} vs ${formatINR(weeklySavingsGoal)} target (after EV rent & food budget).`,
      actionPage: 'expenses',
    });
  }

  return {
    todayISO,
    todayEarnings,
    todayTarget,
    todayDiff,
    monthlyEarnings,
    monthlyExpenses,
    totalLoggedEarnings,
    startingBalance,
    totalAvailableGrossPool,
    totalExpenses,
    netSavingsAfterExpenses,
    totalEmiPaid,
    availableBalance,
    totalPendingEmis,
    novemberTotal,
    novemberPaid,
    novemberRemaining,
    novemberAllocatedBalance,
    novemberShortfall,
    decemberTotal,
    decemberPaid,
    decemberRemaining,
    decemberAllocatedSavings,
    decemberShortfall,
    decemberProgressPct,
    remainingToEarnForAllEmis,
    nextDeadlineEmi,
    daysUntilNextDeadline,
    daysUntilFinalDecemberDeadline,
    requiredDailyAverageForUpcoming,
    weeklyTarget,
    monthlyTarget,
    thisWeekEarnings,
    thisWeekExpenses,
    thisWeekNetSavings,
    weeklyProjectedExpenses,
    waterfallPlan,
    notifications,
  };
}
