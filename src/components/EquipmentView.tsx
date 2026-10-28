import React, { useState } from 'react';
import {
  Users,
  Plus,
  RotateCcw,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Laptop,
  X,
  Shield,
} from 'lucide-react';
import { EquipmentUser, Book, Loan, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';

interface EquipmentViewProps {
  equipmentList: EquipmentUser[];
  books: Book[];
  loans: Loan[];
  currentLang: Language;
  currentRole: UserRole;
  activeEquipmentId: string;
  onSelectEquipment: (id: string) => void;
  onAddEquipment: (name: string, email?: string, notes?: string) => Promise<void>;
  onSeedGundams: () => Promise<void>;
  onLendBook: (book?: Book) => void;
  onReturnBook: (book: Book, loan?: Loan) => void;
  onViewBook: (book: Book) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipmentList,
  books,
  loans,
  currentLang,
  currentRole,
  activeEquipmentId,
  onSelectEquipment,
  onAddEquipment,
  onSeedGundams,
  onLendBook,
  onReturnBook,
  onViewBook,
}) => {
  const t = translations[currentLang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEquipmentForProfile, setSelectedEquipmentForProfile] = useState<EquipmentUser | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddEquipment(newName.trim(), newEmail.trim() || undefined, newNotes.trim() || undefined);
      setNewName('');
      setNewEmail('');
      setNewNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create equipment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await onSeedGundams();
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#2B2520] text-white">
              <Laptop className="w-4 h-4 text-[#C88A35]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
              {t.equipmentTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#736859] dark:text-[#A89D8E]">
            {t.equipmentSubtitle}
          </p>
        </div>

        {currentRole === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#EAE2D2] dark:border-[#38322B] text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#FAF6EE] dark:hover:bg-[#201C19] transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? t.loading : t.seedGundamBtn}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>{t.addEquipmentBtn}</span>
            </button>
          </div>
        )}
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {equipmentList.map(eq => {
          const isCurrentActive = eq.id === activeEquipmentId;
          const currentBook = books.find(b => b.borrowedBy === eq.id && b.status === 'borrowed');
          const eqLoans = loans.filter(l => l.userId === eq.id);
          const completedLoans = eqLoans.filter(l => l.status === 'returned').length;

          let isOverdue = false;
          let daysLeft = 0;
          if (currentBook?.dueDate) {
            const diffTime = new Date(currentBook.dueDate).getTime() - new Date().getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isOverdue = daysLeft < 0;
          }

          return (
            <div
              key={eq.id}
              className={`p-5 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border transition-all duration-300 flex flex-col justify-between hover:shadow-md ${
                isCurrentActive
                  ? 'border-[#C88A35] ring-2 ring-[#C88A35]/20 shadow-xs'
                  : 'border-[#EAE2D2] dark:border-[#38322B]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#2B2520] text-[#FAF6EE] border border-[#38322B] flex items-center justify-center font-bold text-lg shadow-2xs">
                      {eq.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-[#2B2520] dark:text-[#FAF6EE]">
                          {eq.name}
                        </h3>
                        {eq.role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DECFA9] text-[#2B2520]">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8E8373] font-mono">
                        {eq.email || `${eq.name.toLowerCase()}@internal`}
                      </p>
                    </div>
                  </div>

                  {isCurrentActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#BD3A2B] text-white">
                      Active
                    </span>
                  )}
                </div>

                {/* Notes badge */}
                {eq.notes && (
                  <p className="text-xs text-[#736859] dark:text-[#A89D8E] italic mb-4 line-clamp-1">
                    {eq.notes}
                  </p>
                )}

                {/* Currently Borrowed Box */}
                <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] mb-4">
                  <span className="text-[10px] font-bold text-[#8E8373] uppercase tracking-wider block mb-1">
                    {t.currentlyBorrowedLabel}
                  </span>
                  {currentBook ? (
                    <div>
                      <div
                        onClick={() => onViewBook(currentBook)}
                        className="font-bold text-xs text-[#2B2520] dark:text-[#FAF6EE] hover:text-[#BD3A2B] hover:underline cursor-pointer line-clamp-1"
                      >
                        {currentBook.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 text-[#736859]">
                        <span>Due: {new Date(currentBook.dueDate!).toLocaleDateString()}</span>
                        <span
                          className={`font-bold ${
                            isOverdue ? 'text-[#BD3A2B]' : 'text-[#4A6B53]'
                          }`}
                        >
                          {isOverdue ? 'Overdue!' : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8E8373] italic">No book borrowed right now</span>
                  )}
                </div>

                {/* Statistics Row */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
                  <div>
                    <span className="text-[#8E8373] text-[11px] block">{t.totalBooksReadLabel}</span>
                    <span className="font-bold text-sm text-[#2B2520] dark:text-[#FAF6EE]">
                      {completedLoans + (currentBook ? 1 : 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8E8373] text-[11px] block">History Count</span>
                    <span className="font-bold text-sm text-[#5C5348] dark:text-[#DDD3BC]">
                      {eqLoans.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#EAE2D2] dark:border-[#38322B] flex items-center gap-2 mt-2">
                <button
                  onClick={() => setSelectedEquipmentForProfile(eq)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] text-xs font-semibold text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#FAF6EE] dark:hover:bg-[#201C19]"
                >
                  View History
                </button>

                {!isCurrentActive && (
                  <button
                    onClick={() => onSelectEquipment(eq.id)}
                    className="py-2 px-3 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] hover:bg-[#EAE2D2] border border-[#EAE2D2] dark:border-[#38322B] text-xs font-semibold text-[#2B2520] dark:text-[#FAF6EE]"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment Profile & Loan History Modal */}
      {selectedEquipmentForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#201C19]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2B2520] text-[#FAF6EE] flex items-center justify-center font-bold">
                  {selectedEquipmentForProfile.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2B2520] dark:text-[#FAF6EE]">
                    {selectedEquipmentForProfile.name}
                  </h2>
                  <p className="text-xs text-[#8E8373]">
                    {selectedEquipmentForProfile.notes || 'Hardware Station'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEquipmentForProfile(null)}
                className="p-1.5 rounded-lg text-[#8E8373] hover:text-[#2B2520] dark:hover:text-[#FAF6EE]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Borrowing History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8373] mb-3">
                  {t.borrowingHistoryLabel}
                </h3>

                {loans.filter(l => l.userId === selectedEquipmentForProfile.id).length === 0 ? (
                  <p className="text-xs text-[#8E8373] italic py-4 text-center">
                    {t.noLoansHistory}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {loans
                      .filter(l => l.userId === selectedEquipmentForProfile.id)
                      .map(loan => {
                        const associatedBook = books.find(b => b.id === loan.bookId);

                        return (
                          <div
                            key={loan.id}
                            className="p-3.5 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] flex items-center justify-between"
                          >
                            <div>
                              <div
                                onClick={() => associatedBook && onViewBook(associatedBook)}
                                className="font-bold text-xs text-[#2B2520] dark:text-[#FAF6EE] hover:text-[#BD3A2B] hover:underline cursor-pointer"
                              >
                                {loan.bookTitle}
                              </div>
                              <div className="text-[11px] text-[#8E8373]">
                                Borrowed on: {new Date(loan.borrowedAt).toLocaleDateString()}
                              </div>
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                loan.status === 'returned'
                                  ? 'text-[#4A6B53]'
                                  : loan.status === 'overdue'
                                  ? 'text-[#BD3A2B]'
                                  : 'text-[#C88A35]'
                              }`}
                            >
                              {loan.status.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2B2520] dark:text-[#FAF6EE]">
                {t.addEquipmentBtn}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8E8373] hover:text-[#2B2520]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#5C5348] dark:text-[#DDD3BC] uppercase block mb-1">
                  {t.equipmentName} *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. GundamAegis, Workstation-Alpha"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-1 focus:ring-[#C88A35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5C5348] dark:text-[#DDD3BC] uppercase block mb-1">
                  {t.equipmentEmail}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="optional email"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-1 focus:ring-[#C88A35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5C5348] dark:text-[#DDD3BC] uppercase block mb-1">
                  Hardware Notes
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. RTX 4090 Workstation • RAG Pipeline Node"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-1 focus:ring-[#C88A35]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-[#8E8373] font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs transition active:scale-95"
                >
                  {isSubmitting ? t.loading : t.createEquipment}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
