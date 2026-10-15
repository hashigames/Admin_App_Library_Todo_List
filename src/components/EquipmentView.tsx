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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#1E2A5E]/10 dark:border-slate-700/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#1E2A5E] text-white">
              <Laptop className="w-4 h-4 text-[#0097B2]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E2A5E] dark:text-white font-serif-jp">
              {t.equipmentTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t.equipmentSubtitle}
          </p>
        </div>

        {currentRole === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? t.loading : t.seedGundamBtn}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white shadow-md transition active:scale-98"
            >
              <Plus className="w-4 h-4 text-[#F5A623]" />
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
              className={`p-5 rounded-3xl bg-white dark:bg-slate-800 border transition-all duration-300 flex flex-col justify-between hover:shadow-lg ${
                isCurrentActive
                  ? 'border-[#0097B2] ring-2 ring-[#0097B2]/20'
                  : 'border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E2A5E] to-[#0F4C81] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {eq.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-[#1E2A5E] dark:text-white">
                          {eq.name}
                        </h3>
                        {eq.role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {eq.email || `${eq.name.toLowerCase()}@internal`}
                      </p>
                    </div>
                  </div>

                  {isCurrentActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0097B2]/10 text-[#0097B2]">
                      Active
                    </span>
                  )}
                </div>

                {/* Notes badge */}
                {eq.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4 line-clamp-1">
                    {eq.notes}
                  </p>
                )}

                {/* Currently Borrowed Box */}
                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {t.currentlyBorrowedLabel}
                  </span>
                  {currentBook ? (
                    <div>
                      <div
                        onClick={() => onViewBook(currentBook)}
                        className="font-bold text-xs text-[#1E2A5E] dark:text-amber-300 hover:underline cursor-pointer line-clamp-1"
                      >
                        {currentBook.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
                        <span>Due: {new Date(currentBook.dueDate!).toLocaleDateString()}</span>
                        <span
                          className={`font-bold ${
                            isOverdue ? 'text-[#DC2626]' : 'text-[#0097B2]'
                          }`}
                        >
                          {isOverdue ? 'Overdue!' : `${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No book borrowed right now</span>
                  )}
                </div>

                {/* Statistics Row */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 text-[11px] block">{t.totalBooksReadLabel}</span>
                    <span className="font-bold text-sm text-[#1E2A5E] dark:text-white">
                      {completedLoans + (currentBook ? 1 : 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">History Count</span>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {eqLoans.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2 mt-2">
                <button
                  onClick={() => setSelectedEquipmentForProfile(eq)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  View History
                </button>

                {!isCurrentActive && (
                  <button
                    onClick={() => onSelectEquipment(eq.id)}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-[#1E2A5E] dark:text-white"
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
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-[#FAF7F0] dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E2A5E] text-white flex items-center justify-center font-bold">
                  {selectedEquipmentForProfile.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1E2A5E] dark:text-white">
                    {selectedEquipmentForProfile.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedEquipmentForProfile.notes || 'Hardware Station'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEquipmentForProfile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Borrowing History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {t.borrowingHistoryLabel}
                </h3>

                {loans.filter(l => l.userId === selectedEquipmentForProfile.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
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
                            className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between"
                          >
                            <div>
                              <div
                                onClick={() => associatedBook && onViewBook(associatedBook)}
                                className="font-bold text-xs text-[#1E2A5E] dark:text-white hover:underline cursor-pointer"
                              >
                                {loan.bookTitle}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Borrowed on: {new Date(loan.borrowedAt).toLocaleDateString()}
                              </div>
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                loan.status === 'returned'
                                  ? 'text-emerald-600'
                                  : loan.status === 'overdue'
                                  ? 'text-[#DC2626]'
                                  : 'text-[#0097B2]'
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
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1E2A5E] dark:text-white">
                {t.addEquipmentBtn}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                  {t.equipmentName} *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. GundamAegis, Workstation-Alpha"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                  {t.equipmentEmail}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="optional email"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase block mb-1">
                  Hardware Notes
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. RTX 4090 Workstation • RAG Pipeline Node"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white"
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
