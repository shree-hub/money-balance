import React from 'react';
import { CalendarPlus, IndianRupee, ReceiptIndianRupee, X } from 'lucide-react';
import { PageKey } from '../types/finance';

interface QuickActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectPage: (page: PageKey) => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  open,
  onClose,
  onSelectPage,
}) => {
  if (!open) return null;

  const actions: {
    page: PageKey;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
  }[] = [
    {
      page: 'earnings',
      title: 'Log Daily Earnings',
      subtitle: 'Rapido, Bounce, or Shiprocket shift & incentives',
      icon: IndianRupee,
      accentClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      page: 'expenses',
      title: 'Record Expense',
      subtitle: 'EV rental (₹2,300/wk), food (₹200/day), or money sent home',
      icon: ReceiptIndianRupee,
      accentClass: 'text-red-400 bg-red-500/15 border-red-500/30',
    },
    {
      page: 'emis',
      title: 'Manage / Pay EMI',
      subtitle: 'Record actual payment amount & date or add a loan',
      icon: CalendarPlus,
      accentClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-md bg-[#16181D] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-base font-bold text-white">
            Quick Action
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            aria-label="Close quick action sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => {
                onSelectPage(item.page);
                onClose();
              }}
              className="w-full p-3.5 rounded-xl bg-[#1E2128] hover:bg-[#252932] border border-white/[0.07] flex items-center gap-3.5 text-left transition-colors cursor-pointer"
            >
              <div
                className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${item.accentClass}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
