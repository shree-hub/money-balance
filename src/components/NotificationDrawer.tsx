import React from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Target,
  X,
} from 'lucide-react';
import { AppNotification, PageKey } from '../types/finance';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate: (page: PageKey) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  onNavigate,
}) => {
  if (!open) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'warning':
      case 'upcoming':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Target className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  const getToneClass = (type: AppNotification['type']) => {
    switch (type) {
      case 'overdue':
        return 'bg-red-500/10 border-red-500/25';
      case 'warning':
      case 'upcoming':
        return 'bg-amber-500/10 border-amber-500/25';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/25';
      default:
        return 'bg-slate-800/60 border-slate-700/70';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-[#0B1324] border-l border-slate-800 h-full flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h2 className="font-display text-base font-bold text-white">
              Reminders &amp; Alerts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">All clear</p>
              <p className="text-xs text-slate-400">
                No overdue EMIs or urgent target warnings right now.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.actionPage);
                  onClose();
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors hover:brightness-110 cursor-pointer ${getToneClass(
                  item.type
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </p>
                      {item.dateLabel && (
                        <span className="text-[11px] font-mono-num text-slate-400 shrink-0">
                          {item.dateLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
