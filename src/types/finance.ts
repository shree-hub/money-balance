export type DeliveryApp = 'Rapido' | 'Bounce' | 'Shiprocket';

export type EmiStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type EmiMonthCycle = 'November 2026' | 'December 2026' | 'Other';

export type PaymentMode = 'UPI' | 'Bank Transfer' | 'Cash' | 'Auto Debit';

export type ExpenseCategory =
  | 'EV Rental'
  | 'Food'
  | 'Money Sent Home'
  | 'Personal'
  | 'Other';

export type PageKey =
  | 'dashboard'
  | 'earnings'
  | 'emis'
  | 'expenses'
  | 'planner'
  | 'reports'
  | 'settings';

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  dailyTarget: number;
  startingBalance: number;
  startingBalanceDate: string; // YYYY-MM-DD
  evWeeklyRent: number;
  dailyFoodBudget: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EarningEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  app: DeliveryApp;
  baseAmount: number;
  incentive: number;
  bonus: number;
  totalAmount: number;
  shiftLabel: string;
  allowMultipleShifts: boolean;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmiLoan {
  id: string;
  userId: string;
  title: string;
  lender: string;
  monthCycle: EmiMonthCycle;
  dueDate: string; // YYYY-MM-DD
  amountDue: number;
  amountPaid: number;
  status: EmiStatus;
  lastPaidDate: string; // YYYY-MM-DD or ''
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmiPayment {
  id: string;
  userId: string;
  emiId: string;
  emiTitle: string;
  monthCycle: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  notes: string;
  createdAt?: unknown;
}

export interface ExpenseEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  description: string;
  isRecurring: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  type: 'overdue' | 'upcoming' | 'warning' | 'target' | 'success';
  title: string;
  message: string;
  actionPage: PageKey;
  dateLabel?: string;
}
