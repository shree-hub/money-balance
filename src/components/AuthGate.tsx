import React, { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => Promise<void>;
  onEnterDemo: () => void;
  errorMessage: string | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onSignIn,
  onEnterDemo,
  errorMessage,
}) => {
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    try {
      await onSignIn();
    } catch {
      // error is displayed via errorMessage state
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D19] text-slate-100 flex flex-col justify-center px-4 py-10 sm:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Brand & Overview */}
        <div className="lg:col-span-7 bg-[#0E1729] border border-slate-800/80 rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IndianRupee className="w-5 h-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                My Earnings &amp; EMI Manager
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white leading-tight [text-wrap:balance] mb-4">
              Every rupee earned, expense deducted, and EMI deadline tracked cleanly.
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-xl">
              Built for Bengaluru delivery partners working across Rapido, Bounce, and Shiprocket.
              Separate your November and December loan pools, protect daily EV and food budgets,
              and sync every record securely in Firebase.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1.5">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Multi-App Earnings</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Log Rapido, Bounce, and Shiprocket shifts separately with incentives and ₹1,500 daily target tracking.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1.5">
                  <CalendarClock className="w-4 h-4 shrink-0" />
                  <span>Nov &amp; Dec EMI Waterfall</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prioritize ₹7,327 November and ₹32,910 December obligations chronologically without double counting.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Net Savings Accuracy</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deducts ₹2,300/week EV rental, ₹200/day food, and money sent home before showing available cash.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0A1120] border border-slate-800/70">
                <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold mb-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Private Firebase Ledger</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Owner-verified Firestore security rules protect your personal income and loan repayment history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Card */}
        <div className="lg:col-span-5 bg-[#0E1729] border border-slate-800/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-400 mb-2">
              Live Cloud Ledger · Bengaluru (INR)
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Sign in with Google to persist your real financial records, November &amp; December EMI schedule, and ₹1,800 starting balance in Firebase.
            </p>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <span>{signingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-500">or preview safely</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <button
              type="button"
              onClick={onEnterDemo}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#152238] hover:bg-[#1C2D49] border border-slate-700/80 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Open Demo Sandbox</span>
            </button>
            <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
              Demo Mode uses isolated in-memory sample entries so your live Firebase ledger stays completely clean without fake transactions.
            </p>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
            <span>Initial Nov EMIs: ₹7,327</span>
            <span>·</span>
            <span>Dec EMIs: ₹32,910</span>
          </div>
        </div>
      </div>
    </div>
  );
};
