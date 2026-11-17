import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { NewEmiInput } from '../hooks/useFinanceStore';
import { EmiLoan, EmiMonthCycle, EmiPayment } from '../types/finance';
import { FinanceSummary, getEffectiveEmiStatus } from '../utils/financeCalculations';
import { formatDateDisplay, formatINR, getTodayISO } from '../utils/formatters';

interface EmiManagerPageProps {
  emis: EmiLoan[];
  payments: EmiPayment[];
  summary: FinanceSummary;
  onAddEmi: (input: NewEmiInput) => Promise<void>;
  onUpdateEmi: (id: string, input: NewEmiInput) => Promise<void>;
  onSetStatus: (id: string, status: 'pending' | 'overdue') => Promise<void>;
  onDeleteEmi: (id: string) => Promise<void>;
  onOpenPaymentModal: (emi: EmiLoan) => void;
}

type TabKey = 'all' | 'November 2026' | 'December 2026' | 'history';

export const EmiManagerPage: React.FC<EmiManagerPageProps> = ({
  emis,
  payments,
  summary,
  onAddEmi,
  onUpdateEmi,
  onSetStatus,
  onDeleteEmi,
  onOpenPaymentModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<EmiLoan | null>(null);

  const [title, setTitle] = useState('');
  const [lender, setLender] = useState('');
  const [monthCycle, setMonthCycle] = useState<EmiMonthCycle>('December 2026');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [amountDue, setAmountDue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingLoan(null);
    setTitle('');
    setLender('');
    setMonthCycle(
      activeTab === 'November 2026' ? 'November 2026' : 'December 2026'
    );
    setDueDate(activeTab === 'November 2026' ? '2026-11-28' : '2026-12-10');
    setAmountDue('');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (loan: EmiLoan) => {
    setEditingLoan(loan);
    setTitle(loan.title);
    setLender(loan.lender);
    setMonthCycle(loan.monthCycle);
    setDueDate(loan.dueDate);
    setAmountDue(String(loan.amountDue));
    setNotes(loan.notes);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsedAmt = Number(amountDue);

    if (!title.trim()) {
      setFormError('Loan title is required.');
      return;
    }
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      setFormError('Enter a valid loan EMI amount greater than ₹0.');
      return;
    }
    if (!dueDate) {
      setFormError('Due date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: NewEmiInput = {
        title: title.trim(),
        lender: lender.trim() || title.trim(),
        monthCycle,
        dueDate,
        amountDue: parsedAmt,
        notes: notes.trim(),
      };
      if (editingLoan) {
        await onUpdateEmi(editingLoan.id, payload);
      } else {
        await onAddEmi(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save loan.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmis = useMemo(() => {
    return emis
      .filter((e) => {
        if (activeTab === 'November 2026') return e.monthCycle === 'November 2026';
        if (activeTab === 'December 2026') return e.monthCycle === 'December 2026';
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [emis, activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Cycle Summaries */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-1">November 2026 EMIs</p>
          <p className="font-mono-num text-2xl font-bold text-white">
            {formatINR(summary.novemberTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Paid: <span className="font-mono-num text-emerald-400">{formatINR(summary.novemberPaid)}</span> · Remaining:{' '}
            <span className="font-mono-num text-amber-400">{formatINR(summary.novemberRemaining)}</span>
          </p>
        </div>

        <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-1">December 2026 EMIs</p>
          <p className="font-mono-num text-2xl font-bold text-white">
            {formatINR(summary.decemberTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Paid: <span className="font-mono-num text-emerald-400">{formatINR(summary.decemberPaid)}</span> · Remaining:{' '}
            <span className="font-mono-num text-amber-400">{formatINR(summary.decemberRemaining)}</span>
          </p>
        </div>

        <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Available Earnings Balance</p>
            <p
              className={`font-mono-num text-2xl font-bold ${
                summary.availableBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatINR(summary.availableBalance)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Marking an EMI paid always requires actual payment amount and date.
          </p>
        </div>
      </section>

      {/* Tabs + Add Loan Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0E1729] border border-slate-800 rounded-xl">
          {(
            [
              { key: 'all', label: 'All Loans' },
              { key: 'November 2026', label: 'November 2026' },
              { key: 'December 2026', label: 'December 2026' },
              { key: 'history', label: `Payment History (${payments.length})` },
            ] as { key: TabKey; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Loan</span>
        </button>
      </div>

      {/* Main Content */}
      {activeTab === 'history' ? (
        <section className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-5">
          <h2 className="font-display text-base font-bold text-white mb-4">
            EMI Payment History
          </h2>
          {payments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-white mb-1">
                No EMI payments recorded yet
              </p>
              <p className="text-xs text-slate-400">
                Use &quot;Record Payment&quot; on any loan to log full or partial payments with exact dates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Payment Date</th>
                    <th className="py-2.5 pr-4 font-medium">Loan</th>
                    <th className="py-2.5 pr-4 font-medium">Cycle</th>
                    <th className="py-2.5 pr-4 font-medium">Mode</th>
                    <th className="py-2.5 pr-4 font-medium">Notes</th>
                    <th className="py-2.5 text-right font-medium">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-sm">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 font-mono-num text-xs text-slate-300 whitespace-nowrap">
                        {formatDateDisplay(p.paymentDate)}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-white">{p.emiTitle}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{p.monthCycle}</td>
                      <td className="py-3 pr-4 text-xs text-slate-300">{p.paymentMode}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{p.notes || '—'}</td>
                      <td className="py-3 text-right font-mono-num font-semibold text-emerald-400">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {filteredEmis.length === 0 ? (
            <div className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-white mb-1">
                No loans in this view
              </p>
              <p className="text-xs text-slate-400">
                Click &quot;Add New Loan&quot; to add an EMI obligation.
              </p>
            </div>
          ) : (
            filteredEmis.map((loan) => {
              const effectiveStatus = getEffectiveEmiStatus(loan, summary.todayISO);
              const remaining = Math.max(0, loan.amountDue - loan.amountPaid);
              const pct =
                loan.amountDue > 0
                  ? Math.min(100, Math.round((loan.amountPaid / loan.amountDue) * 100))
                  : 0;

              const statusIcon =
                effectiveStatus === 'paid' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : effectiveStatus === 'overdue' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                );

              const statusLabel =
                effectiveStatus === 'paid'
                  ? 'Paid'
                  : effectiveStatus === 'overdue'
                  ? 'Overdue'
                  : effectiveStatus === 'partial'
                  ? 'Partial'
                  : 'Pending';

              const statusTextClass =
                effectiveStatus === 'paid'
                  ? 'text-emerald-400'
                  : effectiveStatus === 'overdue'
                  ? 'text-red-400'
                  : 'text-amber-400';

              return (
                <div
                  key={loan.id}
                  className="bg-[#0E1729] border border-slate-800/80 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusIcon}
                        <h3 className="font-display text-base font-bold text-white">
                          {loan.title}
                        </h3>
                        <span className="text-slate-600">·</span>
                        <span className={`text-xs font-semibold ${statusTextClass}`}>
                          {statusLabel}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">{loan.monthCycle}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                        <span>
                          Due:{' '}
                          <strong className="font-mono-num text-slate-200">
                            {formatDateDisplay(loan.dueDate)}
                          </strong>
                        </span>
                        <span>
                          Total:{' '}
                          <strong className="font-mono-num text-white">
                            {formatINR(loan.amountDue)}
                          </strong>
                        </span>
                        <span>
                          Paid:{' '}
                          <strong className="font-mono-num text-emerald-400">
                            {formatINR(loan.amountPaid)}
                          </strong>
                        </span>
                        <span>
                          Remaining:{' '}
                          <strong className="font-mono-num text-amber-400">
                            {formatINR(remaining)}
                          </strong>
                        </span>
                        {loan.lastPaidDate && (
                          <span>
                            Last Paid:{' '}
                            <strong className="font-mono-num text-slate-300">
                              {formatDateDisplay(loan.lastPaidDate)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {loan.amountPaid > 0 && (
                        <div className="mt-2.5 max-w-sm h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(loan)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Record Payment
                        </button>
                      )}

                      {effectiveStatus !== 'paid' && (
                        <button
                          type="button"
                          onClick={() =>
                            onSetStatus(
                              loan.id,
                              effectiveStatus === 'overdue' ? 'pending' : 'overdue'
                            )
                          }
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-[#152238] hover:bg-[#1C2D49] border border-slate-700/80 text-xs text-slate-300 cursor-pointer whitespace-nowrap"
                        >
                          {effectiveStatus === 'overdue' ? 'Mark Pending' : 'Mark Overdue'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(loan)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#152238] hover:bg-[#1C2D49] border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer"
                        title="Edit loan"
                        aria-label="Edit loan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteEmi(loan.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#152238] hover:bg-red-500/20 border border-slate-700/80 text-slate-300 hover:text-red-400 cursor-pointer"
                        title="Delete loan"
                        aria-label="Delete loan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Add/Edit Loan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0E1729] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white">
                {editingLoan ? 'Edit Loan Details' : 'Add New Loan EMI'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Loan Name / Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pocketly, CreditSea, Laptop EMI"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Lender
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder="Same as title"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Month Pool
                  </label>
                  <select
                    value={monthCycle}
                    onChange={(e) => setMonthCycle(e.target.value as EmiMonthCycle)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="November 2026">November 2026</option>
                    <option value="December 2026">December 2026</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    EMI Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white font-mono-num text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D19] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-emerald-500"
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
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingLoan ? 'Save Changes' : 'Add Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
