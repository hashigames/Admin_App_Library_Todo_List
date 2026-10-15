import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, BookOpen, Laptop } from 'lucide-react';
import { Book, Language, Loan } from '../types';
import { translations } from '../i18n/translations';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  activeLoan?: Loan;
  currentLang: Language;
  onConfirmReturn: (loanId: string) => Promise<void>;
  onRenewLoan: (loanId: string) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  book,
  activeLoan,
  currentLang,
  onConfirmReturn,
  onRenewLoan,
}) => {
  const t = translations[currentLang];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  if (!isOpen || !book) return null;

  let isOverdue = false;
  let daysDiff = 0;
  if (book.dueDate) {
    const diff = new Date(book.dueDate).getTime() - new Date().getTime();
    daysDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));
    isOverdue = daysDiff < 0;
  }

  const handleReturn = async () => {
    if (!activeLoan) return;
    try {
      setIsSubmitting(true);
      await onConfirmReturn(activeLoan.id);
      onClose();
    } catch (e) {
      console.error('Return failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = async () => {
    if (!activeLoan) return;
    try {
      setIsRenewing(true);
      await onRenewLoan(activeLoan.id);
      onClose();
    } catch (e) {
      console.error('Renew failed:', e);
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-[#FAF7F0] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E2A5E] dark:text-white">
                {t.returnModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                LightHouse 橋i • 返却処理 (Entregar)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Book Info Card */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <BookOpen className="w-6 h-6 text-[#1E2A5E] dark:text-amber-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-[#1E2A5E] dark:text-white leading-snug">
                {book.title}
              </h3>
              <p className="text-xs text-slate-500 italic mt-0.5">
                {book.author}
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E2A5E]/10 dark:bg-slate-700 text-[#1E2A5E] dark:text-amber-300">
                {book.topic}
              </span>
            </div>
          </div>

          {/* Borrower & Due Date Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block mb-1 font-medium flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-[#0097B2]" />
                {t.activeEquipment}
              </span>
              <span className="font-bold text-sm text-[#1E2A5E] dark:text-white">
                {book.borrowedByName || 'Unknown'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block mb-1 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                {t.dueDateLabel}
              </span>
              <span
                className={`font-bold text-sm ${
                  isOverdue ? 'text-[#DC2626]' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {book.dueDate ? new Date(book.dueDate).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          {/* Overdue alert if applicable */}
          {isOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>{t.overdueWarning.replace('{days}', String(Math.abs(daysDiff)))}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            {activeLoan && (
              <button
                type="button"
                onClick={handleRenew}
                disabled={isRenewing || isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isRenewing ? t.loading : t.renewLoan}
              </button>
            )}

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={handleReturn}
                disabled={isSubmitting || isRenewing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? t.loading : t.confirmReturn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
