import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { EmiPaymentModal } from './components/EmiPaymentModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { QuickActionSheet } from './components/QuickActionSheet';
import { useFinanceStore } from './hooks/useFinanceStore';
import { DailyEarningsPage } from './pages/DailyEarningsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmiManagerPage } from './pages/EmiManagerPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FinancialPlannerPage } from './pages/FinancialPlannerPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EmiLoan, PageKey } from './types/finance';

export default function App() {
  const store = useFinanceStore();
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [paymentModalEmi, setPaymentModalEmi] = useState<EmiLoan | null>(null);

  if (store.mode === 'loading') {
    return (
      <div className="min-h-screen bg-[#111317] text-zinc-200 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Connecting to your financial ledger...</p>
      </div>
    );
  }

  if (store.mode === 'unauthenticated') {
    return (
      <AuthGate
        onSignIn={store.signInWithGoogle}
        onEnterDemo={store.enterDemoMode}
        errorMessage={store.errorMessage}
      />
    );
  }

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      mode={store.mode}
      profile={store.profile}
      availableBalance={store.summary.availableBalance}
      notifications={store.summary.notifications}
      onOpenNotifications={() => setNotificationsOpen(true)}
      onOpenQuickAction={() => setQuickActionOpen(true)}
      onLogout={store.logout}
      onExitDemo={store.exitDemoMode}
    >
      {store.isLoading && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-[#1B1E24] border border-white/[0.08] text-xs text-zinc-400">
          Syncing latest records from Firebase...
        </div>
      )}

      {store.errorMessage && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-300">
          <span>{store.errorMessage}</span>
          <button
            type="button"
            onClick={store.clearError}
            className="text-red-200 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activePage === 'dashboard' && (
        <DashboardPage
          profile={store.profile}
          earnings={store.earnings}
          expenses={store.expenses}
          payments={store.payments}
          summary={store.summary}
          onNavigate={setActivePage}
          onOpenPaymentModal={setPaymentModalEmi}
        />
      )}

      {activePage === 'earnings' && (
        <DailyEarningsPage
          earnings={store.earnings}
          dailyTarget={store.profile.dailyTarget}
          onAdd={store.addEarning}
          onUpdate={store.updateEarning}
          onDelete={store.deleteEarning}
        />
      )}

      {activePage === 'emis' && (
        <EmiManagerPage
          emis={store.emis}
          payments={store.payments}
          summary={store.summary}
          onAddEmi={store.addEmi}
          onUpdateEmi={store.updateEmiDetails}
          onSetStatus={store.setEmiStatus}
          onDeleteEmi={store.deleteEmi}
          onOpenPaymentModal={setPaymentModalEmi}
        />
      )}

      {activePage === 'expenses' && (
        <ExpensesPage
          expenses={store.expenses}
          profile={store.profile}
          summary={store.summary}
          onAdd={store.addExpense}
          onUpdate={store.updateExpense}
          onDelete={store.deleteExpense}
        />
      )}

      {activePage === 'planner' && (
        <FinancialPlannerPage
          profile={store.profile}
          summary={store.summary}
          onUpdateSettings={store.updateSettings}
          onOpenPaymentModal={setPaymentModalEmi}
        />
      )}

      {activePage === 'reports' && (
        <ReportsPage
          earnings={store.earnings}
          emis={store.emis}
          payments={store.payments}
          expenses={store.expenses}
          summary={store.summary}
        />
      )}

      {activePage === 'settings' && (
        <SettingsPage
          mode={store.mode}
          profile={store.profile}
          onUpdateSettings={store.updateSettings}
          onReseedEmis={store.reseedInitialEmis}
          onLogout={store.logout}
          onExitDemo={store.exitDemoMode}
        />
      )}

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={store.summary.notifications}
        onNavigate={setActivePage}
      />

      <QuickActionSheet
        open={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onSelectPage={setActivePage}
      />

      <EmiPaymentModal
        emi={paymentModalEmi}
        onClose={() => setPaymentModalEmi(null)}
        onSubmit={store.recordEmiPayment}
      />
    </AppShell>
  );
}
