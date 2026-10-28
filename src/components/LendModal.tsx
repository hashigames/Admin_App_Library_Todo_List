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
      <div className="relative w-full max-w-lg bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#201C19]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2B2520] dark:bg-[#C88A35] text-[#FAF6EE] dark:text-[#2B2520]">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
                {t.lendModalTitle}
              </h2>
              <p className="text-xs text-[#736859] dark:text-[#A89D8E]">
                LightHouse 橋i • 貸出処理 (Prestar)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#736859] hover:text-[#2B2520] dark:text-[#A89D8E] dark:hover:text-[#FAF6EE] hover:bg-[#EAE2D2] dark:hover:bg-[#2D2823] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLend} className="p-6 space-y-5">
          {/* Book Selection */}
          <div>
            <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase tracking-wider mb-2">
              {t.bookTitle}
            </label>
            {initialBook ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B]">
                <BookOpen className="w-5 h-5 text-[#C88A35] shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#2B2520] dark:text-[#FAF6EE] truncate">
                    {initialBook.title}
                  </div>
                  <div className="text-xs text-[#736859] italic truncate">
                    {initialBook.author} • {initialBook.topic}
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedBookId}
                onChange={e => setSelectedBookId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-sm font-semibold text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
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
            <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase tracking-wider mb-2">
              {t.selectEquipment}
            </label>
            <div className="relative">
              <select
                value={selectedEquipmentId}
                onChange={e => setSelectedEquipmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-sm font-bold text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
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
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase tracking-wider">
                {t.loanDuration}
              </label>
              <span className="text-xs font-semibold text-[#BD3A2B]">
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
                      ? 'bg-[#2B2520] dark:bg-[#C88A35] text-[#FAF6EE] dark:text-[#2B2520] border-[#2B2520] dark:border-[#C88A35]'
                      : 'bg-[#FFFFFF] dark:bg-[#201C19] text-[#736859] dark:text-[#A89D8E] border-[#EAE2D2] dark:border-[#38322B] hover:bg-[#F5EFE3]'
                  }`}
                >
                  {t.daysCount.replace('{days}', String(days))}
                  {days === 14 ? ' (Default)' : ''}
                </button>
              ))}
            </div>

            {/* Custom Due Date optional input */}
            <div className="mt-2.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#736859]" />
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                placeholder={t.customDueDate}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] outline-none"
              />
              <span className="text-[11px] text-[#736859]">or custom date</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase tracking-wider mb-2">
              {t.loanNotes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Model fine-tuning, prototype pipeline verification"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-xs text-[#2B2520] dark:text-[#FAF6EE] outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EAE2D2] dark:border-[#38322B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-[#736859] dark:text-[#A89D8E] hover:bg-[#EAE2D2] dark:hover:bg-[#2D2823] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentBook}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-xs transition active:scale-98 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{isSubmitting ? t.loading : t.confirmLend}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
