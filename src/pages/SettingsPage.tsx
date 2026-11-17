import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { AppMode, SettingsUpdateInput } from '../hooks/useFinanceStore';
import { UserProfile } from '../types/finance';
import { formatDateDisplay } from '../utils/formatters';

interface SettingsPageProps {
  mode: AppMode;
  profile: UserProfile;
  onUpdateSettings: (updates: SettingsUpdateInput) => Promise<void>;
  onReseedEmis: () => Promise<void>;
  onLogout: () => Promise<void>;
  onExitDemo: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  mode,
  profile,
  onUpdateSettings,
  onReseedEmis,
  onLogout,
  onExitDemo,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [dailyTarget, setDailyTarget] = useState(String(profile.dailyTarget));
  const [startingBalance, setStartingBalance] = useState(String(profile.startingBalance));
  const [startingBalanceDate, setStartingBalanceDate] = useState(
    profile.startingBalanceDate
  );
  const [evWeeklyRent, setEvWeeklyRent] = useState(String(profile.evWeeklyRent));
  const [dailyFoodBudget, setDailyFoodBudget] = useState(
    String(profile.dailyFoodBudget)
  );
  const [saving, setSaving] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setDailyTarget(String(profile.dailyTarget));
    setStartingBalance(String(profile.startingBalance));
    setStartingBalanceDate(profile.startingBalanceDate);
    setEvWeeklyRent(String(profile.evWeeklyRent));
    setDailyFoodBudget(String(profile.dailyFoodBudget));
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedNotice(null);

    const targetNum = Number(dailyTarget);
    const startNum = Number(startingBalance);
    const evNum = Number(evWeeklyRent);
    const foodNum = Number(dailyFoodBudget);

    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum < 100) {
      setErrorMsg('Daily target must be at least ₹100.');
      return;
    }
    if (!Number.isFinite(startNum) || startNum < 0) {
      setErrorMsg('Starting balance cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      await onUpdateSettings({
        displayName: displayName.trim().slice(0, 100),
        dailyTarget: targetNum,
        startingBalance: startNum,
        startingBalanceDate,
        evWeeklyRent: Math.max(0, evNum),
        dailyFoodBudget: Math.max(0, foodNum),
      });
      setSavedNotice('Settings saved and synced.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreSchedule = async () => {
    setReseeding(true);
    setSavedNotice(null);
    try {
      await onReseedEmis();
      setSavedNotice('November (₹7,327) & December (₹32,910) EMI schedule restored.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to restore EMI schedule.');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-base font-bold text-white mb-1">
          Financial Targets &amp; Opening Balance
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Customize your daily earning target, opening balance, and fixed delivery expenses.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Partner Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Daily Earning Target (₹)
              </label>
              <input
                type="number"
                required
                min="100"
                step="50"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Starting Earnings / Balance (₹)
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Starting Balance Date
              </label>
              <input
                type="date"
                required
                value={startingBalanceDate}
                onChange={(e) => setStartingBalanceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono-num">
                {formatDateDisplay(startingBalanceDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Weekly EV Rental Preset (₹)
              </label>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={evWeeklyRent}
                onChange={(e) => setEvWeeklyRent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Daily Food Budget Preset (₹)
              </label>
              <input
                type="number"
                required
                min="0"
                step="10"
                value={dailyFoodBudget}
                onChange={(e) => setDailyFoodBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          {savedNotice && (
            <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      </section>

      {/* Account & Schedule Maintenance */}
      <section className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Account &amp; Storage Mode</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'demo'
                ? 'Running in isolated Demo Sandbox (in-memory only).'
                : `Synced with Firebase Firestore as ${profile.email}`}
            </p>
          </div>
          {mode === 'demo' ? (
            <button
              type="button"
              onClick={onExitDemo}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Switch to Live Firebase
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#152238] hover:bg-red-500/20 border border-slate-700 text-slate-200 hover:text-red-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Sign Out
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Restore Default Nov &amp; Dec 2026 EMI Schedule
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Restores the 3 November EMIs (₹7,327) and 8 December EMIs (₹32,910) to pending status.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestoreSchedule}
            disabled={reseeding}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#152238] hover:bg-[#1C2D49] border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
            <span>{reseeding ? 'Restoring...' : 'Restore EMI Schedule'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
