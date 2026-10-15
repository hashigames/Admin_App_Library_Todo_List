import React, { useState } from 'react';
import { X, Calendar, ArrowRight, Laptop, BookOpen } from 'lucide-react';
import { Book, EquipmentUser, Language } from '../types';
import { translations } from '../i18n/translations';

interface LendModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  availableBooks: Book[];
  equipmentList: EquipmentUser[];
  currentLang: Language;
  onConfirmLend: (bookId: string, equipmentId: string, days: number, notes?: string) => Promise<void>;
}

export const LendModal: React.FC<LendModalProps> = ({
  isOpen,
  onClose,
  book: initialBook,
  availableBooks,
  equipmentList,
  currentLang,
  onConfirmLend,
}) => {
  const t = translations[currentLang];
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBook?.id || availableBooks[0]?.id || '');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(equipmentList[0]?.id || '');
  const [loanDays, setLoanDays] = useState<number>(14);
  const [customDate, setCustomDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if initialBook changes
  React.useEffect(() => {
    if (initialBook) {
      setSelectedBookId(initialBook.id);
    } else if (availableBooks.length > 0 && !selectedBookId) {
      setSelectedBookId(availableBooks[0].id);
    }
  }, [initialBook, availableBooks]);

  if (!isOpen) return null;

  const currentBook = initialBook || availableBooks.find(b => b.id === selectedBookId);

  const calculateDueDate = () => {
    if (customDate) return new Date(customDate);
    const d = new Date();
    d.setDate(d.getDate() + loanDays);
    return d;
  };

  const handleLend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedEquipmentId) return;

    let finalDays = loanDays;
    if (customDate) {
      const diff = new Date(customDate).getTime() - new Date().getTime();
      finalDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    try {
      setIsSubmitting(true);
      await onConfirmLend(selectedBookId, selectedEquipmentId, finalDays, notes);
      onClose();
    } catch (err) {
      console.error('Lend failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-[#FAF7F0] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1E2A5E] text-white">
              <ArrowRight className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E2A5E] dark:text-white">
                {t.lendModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                LightHouse 橋i • 貸出処理 (Prestar)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLend} className="p-6 space-y-5">
          {/* Book Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.bookTitle}
            </label>
            {initialBook ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <BookOpen className="w-5 h-5 text-[#1E2A5E] dark:text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#1E2A5E] dark:text-white truncate">
                    {initialBook.title}
                  </div>
                  <div className="text-xs text-slate-500 italic truncate">
                    {initialBook.author} • {initialBook.topic}
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedBookId}
                onChange={e => setSelectedBookId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-[#1E2A5E] dark:text-white outline-none focus:ring-2 focus:ring-[#1E2A5E]"
              >
                {availableBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.topic})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Equipment Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.selectEquipment}
            </label>
            <div className="relative">
              <select
                value={selectedEquipmentId}
                onChange={e => setSelectedEquipmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-[#1E2A5E] dark:text-white outline-none focus:ring-2 focus:ring-[#1E2A5E]"
              >
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} — {eq.notes || 'Hardware Station'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loan Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t.loanDuration}
              </label>
              <span className="text-xs font-semibold text-[#0097B2]">
                Due: {calculateDueDate().toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30].map(days => (
                <button
                  type="button"
                  key={days}
                  onClick={() => {
                    setLoanDays(days);
                    setCustomDate('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    loanDays === days && !customDate
                      ? 'bg-[#1E2A5E] text-white border-[#1E2A5E]'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {t.daysCount.replace('{days}', String(days))}
                  {days === 14 ? ' (Default)' : ''}
                </button>
              ))}
            </div>

            {/* Custom Due Date optional input */}
            <div className="mt-2.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                placeholder={t.customDueDate}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
              />
              <span className="text-[11px] text-slate-400">or custom date</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t.loanNotes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Model fine-tuning, prototype pipeline verification"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentBook}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white shadow-md transition active:scale-98 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4 text-[#F5A623]" />
              <span>{isSubmitting ? t.loading : t.confirmLend}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
