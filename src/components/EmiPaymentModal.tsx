import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { EmiLoan, PaymentMode } from '../types/finance';
import { EmiPaymentInput } from '../hooks/useFinanceStore';
import { formatDateDisplay, formatINR, getTodayISO } from '../utils/formatters';

interface EmiPaymentModalProps {
  emi: EmiLoan | null;
  onClose: () => void;
  onSubmit: (input: EmiPaymentInput) => Promise<void>;
}

export const EmiPaymentModal: React.FC<EmiPaymentModalProps> = ({
  emi,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (emi) {
      const remaining = Math.max(0, emi.amountDue - emi.amountPaid);
      setAmount(String(remaining));
      setPaymentDate(getTodayISO());
      setPaymentMode('UPI');
      setNotes('');
      setFormError(null);
    }
  }, [emi]);

  if (!emi) return null;

  const remainingDue = Math.max(0, emi.amountDue - emi.amountPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter an actual payment amount greater than ₹0.');
      return;
    }
    if (parsedAmount > remainingDue) {
      setFormError(`Amount cannot exceed remaining balance of ${formatINR(remainingDue)}.`);
      return;
    }
    if (!paymentDate) {
      setFormError('Select the actual payment date before marking paid.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        emiId: emi.id,
        amount: parsedAmount,
        paymentDate,
        paymentMode,
        notes,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0E1729] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium text-emerald-400 mb-1">
              Record EMI Payment · {emi.monthCycle}
            </p>
            <h3 className="font-display text-lg font-bold text-white">
              {emi.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Due {formatDateDisplay(emi.dueDate)} · Remaining {formatINR(remainingDue)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Actual Payment Amount (₹)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.ceil(remainingDue / 2)))}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  50% ({formatINR(Math.ceil(remainingDue / 2))})
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setAmount(String(remainingDue))}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                >
                  Full ({formatINR(remainingDue)})
                </button>
              </div>
            </div>
            <input
              type="number"
              min="1"
              max={remainingDue}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Enter paid amount"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono-num">
                {formatDateDisplay(paymentDate)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Auto Debit">Auto Debit</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Transaction Reference / Notes (optional)
            </label>
            <input
              type="text"
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="e.g. GPay UTR or partial instalment"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Saving...'
                  : Number(amount) >= remainingDue
                  ? 'Confirm Full Payment'
                  : 'Record Partial Payment'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
