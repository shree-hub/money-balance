import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DEFAULT_DAILY_FOOD_BUDGET,
  DEFAULT_DAILY_TARGET,
  DEFAULT_EV_WEEKLY_RENT,
  DEFAULT_STARTING_BALANCE,
  DEFAULT_STARTING_BALANCE_DATE,
  DEMO_EARNINGS,
  DEMO_EMI_PAYMENTS,
  DEMO_EMIS,
  DEMO_EXPENSES,
  DEMO_PROFILE,
  INITIAL_EMI_SCHEDULE,
} from '../constants/initialData';
import {
  DeliveryApp,
  EarningEntry,
  EmiLoan,
  EmiMonthCycle,
  EmiPayment,
  EmiStatus,
  ExpenseCategory,
  ExpenseEntry,
  PaymentMode,
  UserProfile,
} from '../types/finance';
import { computeFinanceSummary, FinanceSummary } from '../utils/financeCalculations';
import { sanitizeId } from '../utils/formatters';

export type AppMode = 'loading' | 'unauthenticated' | 'live' | 'demo';

export interface NewEarningInput {
  date: string;
  app: DeliveryApp;
  baseAmount: number;
  incentive: number;
  bonus: number;
  shiftLabel: string;
  allowMultipleShifts: boolean;
  notes: string;
}

export interface NewEmiInput {
  title: string;
  lender: string;
  monthCycle: EmiMonthCycle;
  dueDate: string;
  amountDue: number;
  notes: string;
}

export interface EmiPaymentInput {
  emiId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  notes: string;
}

export interface NewExpenseInput {
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  isRecurring: boolean;
}

export interface SettingsUpdateInput {
  displayName?: string;
  dailyTarget?: number;
  startingBalance?: number;
  startingBalanceDate?: string;
  evWeeklyRent?: number;
  dailyFoodBudget?: number;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return sanitizeId(`${prefix}-${Date.now()}-${rand}`);
}

export function useFinanceStore() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [initializingProfile, setInitializingProfile] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Firestore State
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(null);
  const [liveEarnings, setLiveEarnings] = useState<EarningEntry[]>([]);
  const [liveEmis, setLiveEmis] = useState<EmiLoan[]>([]);
  const [livePayments, setLivePayments] = useState<EmiPayment[]>([]);
  const [liveExpenses, setLiveExpenses] = useState<ExpenseEntry[]>([]);

  // Isolated Demo Sandbox State
  const [demoProfile, setDemoProfile] = useState<UserProfile>(DEMO_PROFILE);
  const [demoEarnings, setDemoEarnings] = useState<EarningEntry[]>(DEMO_EARNINGS);
  const [demoEmis, setDemoEmis] = useState<EmiLoan[]>(DEMO_EMIS);
  const [demoPayments, setDemoPayments] = useState<EmiPayment[]>(DEMO_EMI_PAYMENTS);
  const [demoExpenses, setDemoExpenses] = useState<ExpenseEntry[]>(DEMO_EXPENSES);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        setIsDemoMode(false);
      }
    });
    return () => unsub();
  }, []);

  // Ensure user profile and initial Nov/Dec EMI schedule exist on first live login
  const ensureUserInitialized = useCallback(async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      setInitializingProfile(true);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const newProfile = {
          userId: user.uid,
          displayName: (user.displayName || 'Delivery Partner').slice(0, 100),
          email: (user.email || 'user@example.com').slice(0, 150),
          dailyTarget: DEFAULT_DAILY_TARGET,
          startingBalance: DEFAULT_STARTING_BALANCE,
          startingBalanceDate: DEFAULT_STARTING_BALANCE_DATE,
          evWeeklyRent: DEFAULT_EV_WEEKLY_RENT,
          dailyFoodBudget: DEFAULT_DAILY_FOOD_BUDGET,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);

        // Seed exact November & December 2026 EMI records (zero fake earnings)
        const existingEmisSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'emis'), where('userId', '==', user.uid))
        );
        if (existingEmisSnap.empty) {
          const batch = writeBatch(db);
          INITIAL_EMI_SCHEDULE.forEach((item) => {
            const emiRef = doc(db, 'users', user.uid, 'emis', item.id);
            batch.set(emiRef, {
              userId: user.uid,
              title: item.title,
              lender: item.lender,
              monthCycle: item.monthCycle,
              dueDate: item.dueDate,
              amountDue: item.amountDue,
              amountPaid: 0,
              status: 'pending',
              lastPaidDate: '',
              notes: item.notes,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to initialize your Firebase ledger.'
      );
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setInitializingProfile(false);
    }
  }, []);

  // Attach real-time Firestore listeners only when authenticated & not in demo mode
  useEffect(() => {
    if (!authReady || !authUser || isDemoMode) {
      setLiveProfile(null);
      setLiveEarnings([]);
      setLiveEmis([]);
      setLivePayments([]);
      setLiveExpenses([]);
      return;
    }

    let isMounted = true;
    const uid = authUser.uid;
    setDataLoading(true);
    setErrorMessage(null);

    let unsubProfile: (() => void) | undefined;
    let unsubEarnings: (() => void) | undefined;
    let unsubEmis: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubExpenses: (() => void) | undefined;

    ensureUserInitialized(authUser)
      .then(() => {
        if (!isMounted) return;

        unsubProfile = onSnapshot(
          doc(db, 'users', uid),
          (snapshot) => {
            if (snapshot.exists()) {
              setLiveProfile(snapshot.data() as UserProfile);
            }
            setDataLoading(false);
          },
          (error) => {
            setDataLoading(false);
            handleFirestoreError(error, OperationType.GET, `users/${uid}`);
          }
        );

        unsubEarnings = onSnapshot(
          query(collection(db, 'users', uid, 'earnings'), where('userId', '==', uid)),
          (snapshot) => {
            const list: EarningEntry[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<EarningEntry, 'id'>),
            }));
            list.sort((a, b) => b.date.localeCompare(a.date));
            setLiveEarnings(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/earnings`);
          }
        );

        unsubEmis = onSnapshot(
          query(collection(db, 'users', uid, 'emis'), where('userId', '==', uid)),
          (snapshot) => {
            const list: EmiLoan[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<EmiLoan, 'id'>),
            }));
            list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            setLiveEmis(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/emis`);
          }
        );

        unsubPayments = onSnapshot(
          query(collection(db, 'users', uid, 'emiPayments'), where('userId', '==', uid)),
          (snapshot) => {
            const list: EmiPayment[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<EmiPayment, 'id'>),
            }));
            list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
            setLivePayments(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/emiPayments`);
          }
        );

        unsubExpenses = onSnapshot(
          query(collection(db, 'users', uid, 'expenses'), where('userId', '==', uid)),
          (snapshot) => {
            const list: ExpenseEntry[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<ExpenseEntry, 'id'>),
            }));
            list.sort((a, b) => b.date.localeCompare(a.date));
            setLiveExpenses(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${uid}/expenses`);
          }
        );
      })
      .catch((err) => {
        if (isMounted) {
          setDataLoading(false);
          setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to Firestore.');
        }
      });

    return () => {
      isMounted = false;
      unsubProfile?.();
      unsubEarnings?.();
      unsubEmis?.();
      unsubPayments?.();
      unsubExpenses?.();
    };
  }, [authReady, authUser, isDemoMode, ensureUserInitialized]);

  const mode: AppMode = useMemo(() => {
    if (!authReady) return 'loading';
    if (isDemoMode) return 'demo';
    if (!authUser) return 'unauthenticated';
    return 'live';
  }, [authReady, isDemoMode, authUser]);

  const activeProfile: UserProfile = useMemo(() => {
    if (mode === 'demo') return demoProfile;
    if (liveProfile) return liveProfile;
    return {
      userId: authUser?.uid || '',
      displayName: authUser?.displayName || 'Delivery Partner',
      email: authUser?.email || '',
      dailyTarget: DEFAULT_DAILY_TARGET,
      startingBalance: DEFAULT_STARTING_BALANCE,
      startingBalanceDate: DEFAULT_STARTING_BALANCE_DATE,
      evWeeklyRent: DEFAULT_EV_WEEKLY_RENT,
      dailyFoodBudget: DEFAULT_DAILY_FOOD_BUDGET,
    };
  }, [mode, demoProfile, liveProfile, authUser]);

  const activeEarnings = mode === 'demo' ? demoEarnings : liveEarnings;
  const activeEmis = mode === 'demo' ? demoEmis : liveEmis;
  const activePayments = mode === 'demo' ? demoPayments : livePayments;
  const activeExpenses = mode === 'demo' ? demoExpenses : liveExpenses;

  const summary: FinanceSummary = useMemo(
    () =>
      computeFinanceSummary(
        activeProfile,
        activeEarnings,
        activeEmis,
        activePayments,
        activeExpenses
      ),
    [activeProfile, activeEarnings, activeEmis, activePayments, activeExpenses]
  );

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsDemoMode(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google sign-in failed.';
      setErrorMessage(msg);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsDemoMode(false);
    setErrorMessage(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    setDemoProfile(DEMO_PROFILE);
    setDemoEarnings(DEMO_EARNINGS);
    setDemoEmis(DEMO_EMIS);
    setDemoPayments(DEMO_EMI_PAYMENTS);
    setDemoExpenses(DEMO_EXPENSES);
    setIsDemoMode(true);
    setErrorMessage(null);
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setErrorMessage(null);
  }, []);

  // --- CRUD: Earnings ---
  const addEarning = useCallback(
    async (input: NewEarningInput) => {
      const totalAmount = Number(input.baseAmount) + Number(input.incentive) + Number(input.bonus);
      const id = makeDocId('earn');

      if (mode === 'demo') {
        const entry: EarningEntry = {
          id,
          userId: demoProfile.userId,
          date: input.date,
          app: input.app,
          baseAmount: Number(input.baseAmount),
          incentive: Number(input.incentive),
          bonus: Number(input.bonus),
          totalAmount,
          shiftLabel: input.shiftLabel.trim().slice(0, 50),
          allowMultipleShifts: input.allowMultipleShifts,
          notes: input.notes.trim().slice(0, 300),
        };
        setDemoEarnings((prev) =>
          [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/earnings/${id}`;
      try {
        await setDoc(doc(db, 'users', authUser.uid, 'earnings', id), {
          userId: authUser.uid,
          date: input.date,
          app: input.app,
          baseAmount: Number(input.baseAmount),
          incentive: Number(input.incentive),
          bonus: Number(input.bonus),
          totalAmount,
          shiftLabel: input.shiftLabel.trim().slice(0, 50),
          allowMultipleShifts: Boolean(input.allowMultipleShifts),
          notes: input.notes.trim().slice(0, 300),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [mode, authUser, demoProfile.userId]
  );

  const updateEarning = useCallback(
    async (id: string, input: NewEarningInput) => {
      const totalAmount = Number(input.baseAmount) + Number(input.incentive) + Number(input.bonus);

      if (mode === 'demo') {
        setDemoEarnings((prev) =>
          prev
            .map((e) =>
              e.id === id
                ? {
                    ...e,
                    date: input.date,
                    app: input.app,
                    baseAmount: Number(input.baseAmount),
                    incentive: Number(input.incentive),
                    bonus: Number(input.bonus),
                    totalAmount,
                    shiftLabel: input.shiftLabel.trim().slice(0, 50),
                    allowMultipleShifts: input.allowMultipleShifts,
                    notes: input.notes.trim().slice(0, 300),
                  }
                : e
            )
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/earnings/${id}`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'earnings', id), {
          date: input.date,
          app: input.app,
          baseAmount: Number(input.baseAmount),
          incentive: Number(input.incentive),
          bonus: Number(input.bonus),
          totalAmount,
          shiftLabel: input.shiftLabel.trim().slice(0, 50),
          allowMultipleShifts: Boolean(input.allowMultipleShifts),
          notes: input.notes.trim().slice(0, 300),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [mode, authUser]
  );

  const deleteEarning = useCallback(
    async (id: string) => {
      if (mode === 'demo') {
        setDemoEarnings((prev) => prev.filter((e) => e.id !== id));
        return;
      }
      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/earnings/${id}`;
      try {
        await deleteDoc(doc(db, 'users', authUser.uid, 'earnings', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [mode, authUser]
  );

  // --- CRUD: EMIs & Payments ---
  const addEmi = useCallback(
    async (input: NewEmiInput) => {
      const id = makeDocId('emi');
      if (mode === 'demo') {
        const entry: EmiLoan = {
          id,
          userId: demoProfile.userId,
          title: input.title.trim().slice(0, 100),
          lender: input.lender.trim().slice(0, 100),
          monthCycle: input.monthCycle,
          dueDate: input.dueDate,
          amountDue: Number(input.amountDue),
          amountPaid: 0,
          status: 'pending',
          lastPaidDate: '',
          notes: input.notes.trim().slice(0, 300),
        };
        setDemoEmis((prev) =>
          [...prev, entry].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/emis/${id}`;
      try {
        await setDoc(doc(db, 'users', authUser.uid, 'emis', id), {
          userId: authUser.uid,
          title: input.title.trim().slice(0, 100),
          lender: input.lender.trim().slice(0, 100),
          monthCycle: input.monthCycle,
          dueDate: input.dueDate,
          amountDue: Number(input.amountDue),
          amountPaid: 0,
          status: 'pending',
          lastPaidDate: '',
          notes: input.notes.trim().slice(0, 300),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [mode, authUser, demoProfile.userId]
  );

  const updateEmiDetails = useCallback(
    async (id: string, input: NewEmiInput & { status?: EmiStatus }) => {
      const target = activeEmis.find((e) => e.id === id);
      if (!target) throw new Error('Loan record not found.');
      if (Number(input.amountDue) < target.amountPaid) {
        throw new Error('Loan amount cannot be less than already paid amount.');
      }

      const computedStatus: EmiStatus =
        target.amountPaid >= Number(input.amountDue)
          ? 'paid'
          : target.amountPaid > 0
          ? 'partial'
          : input.status && input.status !== 'paid'
          ? input.status
          : 'pending';

      if (mode === 'demo') {
        setDemoEmis((prev) =>
          prev
            .map((e) =>
              e.id === id
                ? {
                    ...e,
                    title: input.title.trim().slice(0, 100),
                    lender: input.lender.trim().slice(0, 100),
                    monthCycle: input.monthCycle,
                    dueDate: input.dueDate,
                    amountDue: Number(input.amountDue),
                    notes: input.notes.trim().slice(0, 300),
                    status: computedStatus,
                  }
                : e
            )
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/emis/${id}`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'emis', id), {
          title: input.title.trim().slice(0, 100),
          lender: input.lender.trim().slice(0, 100),
          monthCycle: input.monthCycle,
          dueDate: input.dueDate,
          amountDue: Number(input.amountDue),
          notes: input.notes.trim().slice(0, 300),
          status: computedStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [mode, authUser, activeEmis]
  );

  const setEmiStatus = useCallback(
    async (id: string, status: 'pending' | 'overdue') => {
      const target = activeEmis.find((e) => e.id === id);
      if (!target) return;

      if (mode === 'demo') {
        setDemoEmis((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  amountPaid: status === 'pending' ? 0 : e.amountPaid,
                  lastPaidDate: status === 'pending' ? '' : e.lastPaidDate,
                  status,
                }
              : e
          )
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/emis/${id}`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'emis', id), {
          amountPaid: status === 'pending' ? 0 : target.amountPaid,
          lastPaidDate: status === 'pending' ? '' : target.lastPaidDate,
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [mode, authUser, activeEmis]
  );

  const recordEmiPayment = useCallback(
    async (input: EmiPaymentInput) => {
      const target = activeEmis.find((e) => e.id === input.emiId);
      if (!target) throw new Error('Loan record not found.');

      const remaining = Math.max(0, target.amountDue - target.amountPaid);
      const payAmt = Number(input.amount);
      if (!Number.isFinite(payAmt) || payAmt <= 0) {
        throw new Error('Please enter a valid payment amount greater than ₹0.');
      }
      if (payAmt > remaining) {
        throw new Error('Payment amount cannot exceed the remaining EMI balance.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) {
        throw new Error('Please select a valid payment date.');
      }

      const newAmountPaid = target.amountPaid + payAmt;
      const newStatus: EmiStatus = newAmountPaid >= target.amountDue ? 'paid' : 'partial';
      const paymentId = makeDocId('pay');

      if (mode === 'demo') {
        const paymentDoc: EmiPayment = {
          id: paymentId,
          userId: demoProfile.userId,
          emiId: target.id,
          emiTitle: target.title,
          monthCycle: target.monthCycle,
          amount: payAmt,
          paymentDate: input.paymentDate,
          paymentMode: input.paymentMode,
          notes: input.notes.trim().slice(0, 300),
        };
        setDemoPayments((prev) =>
          [paymentDoc, ...prev].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
        );
        setDemoEmis((prev) =>
          prev.map((e) =>
            e.id === target.id
              ? {
                  ...e,
                  amountPaid: newAmountPaid,
                  status: newStatus,
                  lastPaidDate: input.paymentDate,
                }
              : e
          )
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const uid = authUser.uid;
      const batch = writeBatch(db);
      const paymentRef = doc(db, 'users', uid, 'emiPayments', paymentId);
      const emiRef = doc(db, 'users', uid, 'emis', target.id);

      batch.set(paymentRef, {
        userId: uid,
        emiId: target.id,
        emiTitle: target.title.slice(0, 100),
        monthCycle: target.monthCycle.slice(0, 40),
        amount: payAmt,
        paymentDate: input.paymentDate,
        paymentMode: input.paymentMode,
        notes: input.notes.trim().slice(0, 300),
        createdAt: serverTimestamp(),
      });

      batch.update(emiRef, {
        amountPaid: newAmountPaid,
        status: newStatus,
        lastPaidDate: input.paymentDate,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${uid}/emiPayments/${paymentId}`);
      }
    },
    [mode, authUser, activeEmis, demoProfile.userId]
  );

  const deleteEmi = useCallback(
    async (id: string) => {
      if (mode === 'demo') {
        setDemoEmis((prev) => prev.filter((e) => e.id !== id));
        setDemoPayments((prev) => prev.filter((p) => p.emiId !== id));
        return;
      }
      if (!authUser) throw new Error('Authentication required.');
      const uid = authUser.uid;
      try {
        const relatedPayments = activePayments.filter((p) => p.emiId === id);
        const batch = writeBatch(db);
        relatedPayments.forEach((p) => {
          batch.delete(doc(db, 'users', uid, 'emiPayments', p.id));
        });
        batch.delete(doc(db, 'users', uid, 'emis', id));
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${uid}/emis/${id}`);
      }
    },
    [mode, authUser, activePayments]
  );

  // --- CRUD: Expenses ---
  const addExpense = useCallback(
    async (input: NewExpenseInput) => {
      const id = makeDocId('exp');
      if (mode === 'demo') {
        const entry: ExpenseEntry = {
          id,
          userId: demoProfile.userId,
          date: input.date,
          category: input.category,
          amount: Number(input.amount),
          description: input.description.trim().slice(0, 200),
          isRecurring: Boolean(input.isRecurring),
        };
        setDemoExpenses((prev) =>
          [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/expenses/${id}`;
      try {
        await setDoc(doc(db, 'users', authUser.uid, 'expenses', id), {
          userId: authUser.uid,
          date: input.date,
          category: input.category,
          amount: Number(input.amount),
          description: input.description.trim().slice(0, 200),
          isRecurring: Boolean(input.isRecurring),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [mode, authUser, demoProfile.userId]
  );

  const updateExpense = useCallback(
    async (id: string, input: NewExpenseInput) => {
      if (mode === 'demo') {
        setDemoExpenses((prev) =>
          prev
            .map((ex) =>
              ex.id === id
                ? {
                    ...ex,
                    date: input.date,
                    category: input.category,
                    amount: Number(input.amount),
                    description: input.description.trim().slice(0, 200),
                    isRecurring: Boolean(input.isRecurring),
                  }
                : ex
            )
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        return;
      }

      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/expenses/${id}`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid, 'expenses', id), {
          date: input.date,
          category: input.category,
          amount: Number(input.amount),
          description: input.description.trim().slice(0, 200),
          isRecurring: Boolean(input.isRecurring),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [mode, authUser]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (mode === 'demo') {
        setDemoExpenses((prev) => prev.filter((ex) => ex.id !== id));
        return;
      }
      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}/expenses/${id}`;
      try {
        await deleteDoc(doc(db, 'users', authUser.uid, 'expenses', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [mode, authUser]
  );

  // --- Settings ---
  const updateSettings = useCallback(
    async (updates: SettingsUpdateInput) => {
      if (mode === 'demo') {
        setDemoProfile((prev) => ({ ...prev, ...updates }));
        return;
      }
      if (!authUser) throw new Error('Authentication required.');
      const path = `users/${authUser.uid}`;
      try {
        await updateDoc(doc(db, 'users', authUser.uid), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [mode, authUser]
  );

  const reseedInitialEmis = useCallback(async () => {
    if (mode === 'demo') {
      setDemoEmis(
        INITIAL_EMI_SCHEDULE.map((item) => ({
          ...item,
          userId: demoProfile.userId,
          amountPaid: 0,
          status: 'pending',
          lastPaidDate: '',
        }))
      );
      setDemoPayments([]);
      return;
    }

    if (!authUser) throw new Error('Authentication required.');
    const uid = authUser.uid;
    try {
      const batch = writeBatch(db);
      INITIAL_EMI_SCHEDULE.forEach((item) => {
        const emiRef = doc(db, 'users', uid, 'emis', item.id);
        batch.set(emiRef, {
          userId: uid,
          title: item.title,
          lender: item.lender,
          monthCycle: item.monthCycle,
          dueDate: item.dueDate,
          amountDue: item.amountDue,
          amountPaid: 0,
          status: 'pending',
          lastPaidDate: '',
          notes: item.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/emis`);
    }
  }, [mode, authUser, demoProfile.userId]);

  return {
    mode,
    authUser,
    isLoading: !authReady || initializingProfile || dataLoading,
    errorMessage,
    clearError: () => setErrorMessage(null),
    profile: activeProfile,
    earnings: activeEarnings,
    emis: activeEmis,
    payments: activePayments,
    expenses: activeExpenses,
    summary,
    signInWithGoogle,
    logout,
    enterDemoMode,
    exitDemoMode,
    addEarning,
    updateEarning,
    deleteEarning,
    addEmi,
    updateEmiDetails,
    setEmiStatus,
    recordEmiPayment,
    deleteEmi,
    addExpense,
    updateExpense,
    deleteExpense,
    updateSettings,
    reseedInitialEmis,
  };
}
