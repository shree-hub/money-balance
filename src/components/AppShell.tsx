import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarCheck2,
  Compass,
  FlaskConical,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptIndianRupee,
  Settings,
  X,
} from 'lucide-react';
import { AppMode } from '../hooks/useFinanceStore';
import { AppNotification, PageKey, UserProfile } from '../types/finance';
import { formatINR } from '../utils/formatters';

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  mode: AppMode;
  profile: UserProfile;
  availableBalance: number;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onOpenQuickAction: () => void;
  onLogout: () => Promise<void>;
  onExitDemo: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  key: PageKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { key: 'earnings', label: 'Daily Earnings', shortLabel: 'Earnings', icon: IndianRupee },
  { key: 'emis', label: 'EMI Manager', shortLabel: 'EMIs', icon: CalendarCheck2 },
  { key: 'reports', label: 'Reports & Stats', shortLabel: 'Stats', icon: BarChart3 },
  { key: 'expenses', label: 'Expenses', shortLabel: 'Expenses', icon: ReceiptIndianRupee },
  { key: 'planner', label: 'Financial Planner', shortLabel: 'Planner', icon: Compass },
  { key: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  mode,
  profile,
  availableBalance,
  notifications,
  onOpenNotifications,
  onOpenQuickAction,
  onLogout,
  onExitDemo,
  children,
}) => {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const urgentCount = notifications.filter(
    (n) => n.type === 'overdue' || n.type === 'warning' || n.type === 'upcoming'
  ).length;

  const activeNav = NAV_ITEMS.find((n) => n.key === activePage) || NAV_ITEMS[0];
  const mobilePrimaryTabs = NAV_ITEMS.slice(0, 4);
  const mobileMoreTabs = NAV_ITEMS.slice(4);

  const initials = (profile.displayName || 'DP')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#111317] text-zinc-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#15181E] border-r border-white/[0.07] z-30">
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-white truncate">
                My Earnings &amp; EMI
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                Bengaluru Finance Ledger
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#232730] text-white border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.07] space-y-3">
          <div className="p-3.5 rounded-xl bg-[#1B1E24] border border-white/[0.07]">
            <p className="text-[11px] text-zinc-400 mb-0.5">Available Balance</p>
            <p
              className={`font-mono-num text-lg font-bold ${
                availableBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatINR(availableBalance)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[#232730] border border-white/[0.1] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {profile.displayName}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {mode === 'demo' ? 'Demo Sandbox' : profile.email}
                </p>
              </div>
            </div>
            {mode === 'demo' ? (
              <button
                type="button"
                onClick={onExitDemo}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-xs font-medium shrink-0 cursor-pointer"
              >
                Exit
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-24 lg:pb-10">
        {/* Top Bar */}
        <header className="no-print sticky top-0 z-20 h-14 sm:h-16 bg-[#111317]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display text-base sm:text-lg font-bold text-white truncate">
              {activeNav.label}
            </h1>
            {mode === 'demo' && (
              <span className="text-xs text-amber-300 font-medium hidden sm:inline whitespace-nowrap shrink-0">
                · Demo Sandbox
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {mode === 'demo' && (
              <button
                type="button"
                onClick={onExitDemo}
                className="sm:hidden min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Exit Demo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#1B1E24] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-zinc-950 font-mono-num text-[10px] font-bold flex items-center justify-center">
                  {urgentCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="h-10 w-10 rounded-full bg-[#1B1E24] border border-white/[0.12] text-xs font-bold text-white flex items-center justify-center hover:border-emerald-500/50 transition-colors cursor-pointer"
              title={profile.displayName}
              aria-label="Open account settings"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Demo Sandbox Banner */}
        {mode === 'demo' && (
          <div className="no-print bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Exploring <strong>Demo Sandbox</strong> (in-memory only, isolated from live Firebase records).
              </span>
            </div>
            <button
              type="button"
              onClick={onExitDemo}
              className="font-semibold text-amber-300 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              Sign in for Live Ledger
            </button>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating '+' Action Button (Matches Reference Screen Rhythm) */}
      <button
        type="button"
        onClick={onOpenQuickAction}
        className="no-print fixed right-4 bottom-20 lg:right-8 lg:bottom-8 z-30 h-13 w-13 rounded-full bg-[#262A34] hover:bg-[#313643] border border-white/[0.14] text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
        aria-label="Quick add entry"
        title="Quick add earning, expense, or EMI"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#15181E]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5 items-center px-1"
      >
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                onNavigate(item.key);
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
              <span className="text-[10px] font-medium leading-none">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMoreOpen((prev) => !prev)}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer ${
            mobileMoreTabs.some((t) => t.key === activePage) || mobileMoreOpen
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet */}
      {mobileMoreOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-40 flex items-end bg-black/65 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setMobileMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full bg-[#1B1E24] border-t border-white/[0.08] rounded-t-3xl p-5 pb-20 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-sm font-bold text-white">
                Expenses, Planner &amp; Settings
              </p>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {mobileMoreTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    onNavigate(item.key);
                  }}
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer ${
                    isActive
                      ? 'bg-[#262A34] text-white border border-white/[0.1]'
                      : 'bg-[#15181E] text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
              <span className="truncate">{profile.email}</span>
              {mode === 'live' && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-red-400 font-medium px-2 py-1 cursor-pointer"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
