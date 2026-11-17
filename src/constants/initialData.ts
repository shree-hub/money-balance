import {
  EarningEntry,
  EmiLoan,
  EmiPayment,
  ExpenseEntry,
  UserProfile,
} from '../types/finance';

export const DEFAULT_DAILY_TARGET = 1500;
export const DEFAULT_STARTING_BALANCE = 1800;
export const DEFAULT_STARTING_BALANCE_DATE = '2026-11-16';
export const DEFAULT_EV_WEEKLY_RENT = 2300;
export const DEFAULT_DAILY_FOOD_BUDGET = 200;

export interface InitialEmiSeed {
  id: string;
  title: string;
  lender: string;
  monthCycle: 'November 2026' | 'December 2026';
  dueDate: string;
  amountDue: number;
  notes: string;
}

export const INITIAL_EMI_SCHEDULE: InitialEmiSeed[] = [
  // November 2026 Pending EMIs (Total: ₹7,327)
  {
    id: 'nov-2026-pocketly-17',
    title: 'Pocketly',
    lender: 'Pocketly',
    monthCycle: 'November 2026',
    dueDate: '2026-11-17',
    amountDue: 1767,
    notes: 'November cycle instalment 1',
  },
  {
    id: 'nov-2026-branch-18',
    title: 'Branch',
    lender: 'Branch',
    monthCycle: 'November 2026',
    dueDate: '2026-11-18',
    amountDue: 2000,
    notes: 'November cycle instalment',
  },
  {
    id: 'nov-2026-pocketly-25',
    title: 'Pocketly',
    lender: 'Pocketly',
    monthCycle: 'November 2026',
    dueDate: '2026-11-25',
    amountDue: 3560,
    notes: 'November cycle instalment 2',
  },

  // December 2026 EMIs (Total: ₹32,910)
  {
    id: 'dec-2026-creditsea-01',
    title: 'CreditSea',
    lender: 'CreditSea',
    monthCycle: 'December 2026',
    dueDate: '2026-12-01',
    amountDue: 9000,
    notes: 'December 1 priority obligation',
  },
  {
    id: 'dec-2026-laptop-02',
    title: 'Laptop EMI',
    lender: 'Laptop Finance',
    monthCycle: 'December 2026',
    dueDate: '2026-12-02',
    amountDue: 4840,
    notes: 'Monthly laptop EMI',
  },
  {
    id: 'dec-2026-kreditbee-03',
    title: 'KreditBee',
    lender: 'KreditBee',
    monthCycle: 'December 2026',
    dueDate: '2026-12-03',
    amountDue: 1243,
    notes: 'Regular KreditBee EMI',
  },
  {
    id: 'dec-2026-kreditbee-interest-03',
    title: 'KreditBee outside interest',
    lender: 'Outside Interest',
    monthCycle: 'December 2026',
    dueDate: '2026-12-03',
    amountDue: 4500,
    notes: 'Outside interest obligation',
  },
  {
    id: 'dec-2026-moneyview-05',
    title: 'Moneyview',
    lender: 'Moneyview',
    monthCycle: 'December 2026',
    dueDate: '2026-12-05',
    amountDue: 6000,
    notes: 'December Moneyview EMI',
  },
  {
    id: 'dec-2026-pocketly-17',
    title: 'Pocketly',
    lender: 'Pocketly',
    monthCycle: 'December 2026',
    dueDate: '2026-12-17',
    amountDue: 1767,
    notes: 'December cycle instalment 1',
  },
  {
    id: 'dec-2026-branch-18',
    title: 'Branch',
    lender: 'Branch',
    monthCycle: 'December 2026',
    dueDate: '2026-12-18',
    amountDue: 2000,
    notes: 'December cycle instalment',
  },
  {
    id: 'dec-2026-pocketly-25',
    title: 'Pocketly',
    lender: 'Pocketly',
    monthCycle: 'December 2026',
    dueDate: '2026-12-25',
    amountDue: 3560,
    notes: 'December cycle instalment 2',
  },
];

// Isolated Demo Sandbox Data — NEVER used in Live Firebase Mode
export const DEMO_PROFILE: UserProfile = {
  userId: 'demo-sandbox-user',
  displayName: 'Bengaluru Rider (Demo)',
  email: 'demo-sandbox@local.preview',
  dailyTarget: 1500,
  startingBalance: 1800,
  startingBalanceDate: '2026-11-16',
  evWeeklyRent: 2300,
  dailyFoodBudget: 200,
};

export const DEMO_EARNINGS: EarningEntry[] = [
  {
    id: 'demo-earn-1',
    userId: 'demo-sandbox-user',
    date: '2026-11-16',
    app: 'Rapido',
    baseAmount: 680,
    incentive: 120,
    bonus: 50,
    totalAmount: 850,
    shiftLabel: 'Morning Peak',
    allowMultipleShifts: false,
    notes: 'Indiranagar & Koramangala rides',
  },
  {
    id: 'demo-earn-2',
    userId: 'demo-sandbox-user',
    date: '2026-11-16',
    app: 'Shiprocket',
    baseAmount: 720,
    incentive: 150,
    bonus: 0,
    totalAmount: 870,
    shiftLabel: 'Afternoon Parcels',
    allowMultipleShifts: false,
    notes: 'HSR Layout hub deliveries',
  },
  {
    id: 'demo-earn-3',
    userId: 'demo-sandbox-user',
    date: '2026-11-17',
    app: 'Bounce',
    baseAmount: 540,
    incentive: 80,
    bonus: 0,
    totalAmount: 620,
    shiftLabel: 'Midday Shift',
    allowMultipleShifts: false,
    notes: 'EV swap & short trips',
  },
  {
    id: 'demo-earn-4',
    userId: 'demo-sandbox-user',
    date: '2026-11-17',
    app: 'Rapido',
    baseAmount: 890,
    incentive: 200,
    bonus: 100,
    totalAmount: 1190,
    shiftLabel: 'Evening Surge',
    allowMultipleShifts: false,
    notes: 'Whitefield rain surge bonus',
  },
];

export const DEMO_EMIS: EmiLoan[] = INITIAL_EMI_SCHEDULE.map((item) => {
  if (item.id === 'nov-2026-pocketly-17') {
    return {
      ...item,
      userId: 'demo-sandbox-user',
      amountPaid: 1767,
      status: 'paid',
      lastPaidDate: '2026-11-17',
    };
  }
  return {
    ...item,
    userId: 'demo-sandbox-user',
    amountPaid: 0,
    status: 'pending',
    lastPaidDate: '',
  };
});

export const DEMO_EMI_PAYMENTS: EmiPayment[] = [
  {
    id: 'demo-pay-1',
    userId: 'demo-sandbox-user',
    emiId: 'nov-2026-pocketly-17',
    emiTitle: 'Pocketly',
    monthCycle: 'November 2026',
    amount: 1767,
    paymentDate: '2026-11-17',
    paymentMode: 'UPI',
    notes: 'Cleared on due date (Demo)',
  },
];

export const DEMO_EXPENSES: ExpenseEntry[] = [
  {
    id: 'demo-exp-1',
    userId: 'demo-sandbox-user',
    date: '2026-11-16',
    category: 'EV Rental',
    amount: 2300,
    description: 'Weekly EV scooter rental',
    isRecurring: true,
  },
  {
    id: 'demo-exp-2',
    userId: 'demo-sandbox-user',
    date: '2026-11-16',
    category: 'Food',
    amount: 200,
    description: 'Daily meals & tea',
    isRecurring: true,
  },
  {
    id: 'demo-exp-3',
    userId: 'demo-sandbox-user',
    date: '2026-11-17',
    category: 'Food',
    amount: 200,
    description: 'Daily meals & water',
    isRecurring: true,
  },
];
