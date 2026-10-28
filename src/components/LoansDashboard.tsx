import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  BookOpen,
  Laptop,
  Calendar,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Book, EquipmentUser, Loan, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';

interface LoansDashboardProps {
  loans: Loan[];
  books: Book[];
  equipmentList: EquipmentUser[];
  currentLang: Language;
  currentRole: UserRole;
  activeEquipmentId: string;
  onLendClick: (book?: Book) => void;
  onReturnClick: (book: Book, loan?: Loan) => void;
  onRenewLoan: (loanId: string) => Promise<void>;
  onViewBook: (book: Book) => void;
}

export const LoansDashboard: React.FC<LoansDashboardProps> = ({
  loans,
  books,
  equipmentList,
  currentLang,
  currentRole,
  activeEquipmentId,
  onLendClick,
  onReturnClick,
  onRenewLoan,
  onViewBook,
}) => {
  const t = translations[currentLang];
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'overdue' | 'returned'>('active');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [isRenewingId, setIsRenewingId] = useState<string | null>(null);

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');

  // Compute overdue count accurately
  const nowMs = new Date().getTime();
  const overdueLoans = activeLoans.filter(l => {
    const dueMs = new Date(l.dueDate).getTime();
    return dueMs < nowMs;
  });

  const availableBooks = books.filter(b => b.status === 'available');

  // Filtered loans list
  const filteredLoans = loans.filter(l => {
    const isDuePast = new Date(l.dueDate).getTime() < nowMs && l.status !== 'returned';

    if (filterTab === 'active' && l.status === 'returned') return false;
    if (filterTab === 'overdue' && !isDuePast) return false;
    if (filterTab === 'returned' && l.status !== 'returned') return false;

    if (equipmentFilter !== 'all' && l.userId !== equipmentFilter) return false;

    return true;
  });

  // Handle renew
  const handleRenew = async (loanId: string) => {
    try {
      setIsRenewingId(loanId);
      await onRenewLoan(loanId);
    } catch (e) {
      console.error('Renew error:', e);
    } finally {
      setIsRenewingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Header & KPI Summary Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#2B2520] text-white">
              <Activity className="w-4 h-4 text-[#C88A35]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
              {t.statusBoardTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#736859] dark:text-[#A89D8E]">
            {t.statusBoardSubtitle}
          </p>
        </div>

        {currentRole === 'admin' && (
          <button
            onClick={() => onLendClick()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white text-xs font-bold shadow-2xs transition active:scale-95 self-start md:self-auto"
          >
            <ArrowRight className="w-4 h-4 text-white" />
            <span>{t.quickLend}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8E8373] uppercase tracking-wider">
              {t.activeLoansCount}
            </span>
            <span className="p-2 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] text-[#C88A35] border border-[#EAE2D2] dark:border-[#38322B]">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2B2520] dark:text-[#FAF6EE]">
            {activeLoans.length}
          </div>
          <span className="text-[11px] text-[#8E8373] mt-1 block">Books in circulation</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8E8373] uppercase tracking-wider">
              {t.overdueCount}
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-[#BD3A2B]">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${overdueLoans.length > 0 ? 'text-[#BD3A2B] animate-pulse' : 'text-[#2B2520] dark:text-[#FAF6EE]'}`}>
            {overdueLoans.length}
          </div>
          <span className="text-[11px] text-[#8E8373] mt-1 block">Immediate action required</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8E8373] uppercase tracking-wider">
              {t.availableBooksCount}
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-[#4A6B53]">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#4A6B53]">
            {availableBooks.length}
          </div>
          <span className="text-[11px] text-[#8E8373] mt-1 block">Ready on shelves</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8E8373] uppercase tracking-wider">
              {t.totalBooksCount}
            </span>
            <span className="p-2 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] text-[#C88A35] border border-[#EAE2D2] dark:border-[#38322B]">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2B2520] dark:text-[#FAF6EE]">
            {books.length}
          </div>
          <span className="text-[11px] text-[#8E8373] mt-1 block">Catalog collection</span>
        </div>
      </div>

      {/* Real-Time Reading Status Board: Who has what RIGHT NOW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#C88A35]" />
            <span>Equipment Status Board (機材読書現況盤)</span>
          </h2>
          <span className="text-xs text-[#8E8373]">
            {equipmentList.length} Units Monitored
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {equipmentList.map(eq => {
            // Find active book loan for this equipment
            const currentBook = books.find(b => b.borrowedBy === eq.id && b.status === 'borrowed');
            const activeLoan = activeLoans.find(l => l.userId === eq.id && l.status !== 'returned');

            let isOverdue = false;
            let daysLeft = 0;
            if (currentBook?.dueDate) {
              const diffTime = new Date(currentBook.dueDate).getTime() - nowMs;
              daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              isOverdue = daysLeft < 0;
            }

            return (
              <div
                key={eq.id}
                className={`p-4 rounded-2xl border transition-all ${
                  currentBook
                    ? isOverdue
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs'
                      : 'border-[#DECFA9] dark:border-[#5C5348] bg-[#FFFFFF] dark:bg-[#201C19] shadow-2xs'
                    : 'border-[#EAE2D2] dark:border-[#38322B] bg-[#FAF6EE]/50 dark:bg-[#171513]/40 opacity-80'
                }`}
              >
                {/* Equipment Top */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentBook ? (isOverdue ? 'bg-[#BD3A2B] animate-ping' : 'bg-[#4A6B53] animate-pulse') : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className="font-bold text-xs sm:text-sm text-[#2B2520] dark:text-[#FAF6EE]">
                      {eq.name}
                    </span>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-[#8E8373]">
                    {currentBook ? (isOverdue ? 'OVERDUE' : 'READING') : 'IDLE'}
                  </span>
                </div>

                {/* Reading Content */}
                {currentBook ? (
                  <div className="space-y-2 pt-1 border-t border-[#EAE2D2] dark:border-[#38322B]">
                    <div>
                      <div
                        onClick={() => onViewBook(currentBook)}
                        className="font-bold text-xs text-[#2B2520] dark:text-[#FAF6EE] line-clamp-1 hover:text-[#BD3A2B] hover:underline cursor-pointer"
                      >
                        {currentBook.title}
                      </div>
                      <div className="text-[11px] text-[#8E8373] italic">
                        {currentBook.author}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8E8373]">
                        Topic: <span className="font-semibold text-[#5C5348] dark:text-[#DDD3BC]">{currentBook.topic}</span>
                      </span>
                      <span
                        className={`font-bold ${
                          isOverdue ? 'text-[#BD3A2B]' : 'text-[#5C5348] dark:text-[#DDD3BC]'
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysLeft)}d overdue!`
                          : daysLeft === 0
                          ? 'Due today'
                          : `${daysLeft}d left`}
                      </span>
                    </div>

                    {/* Actions on this loan */}
                    {currentRole === 'admin' && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => onReturnClick(currentBook, activeLoan)}
                          className="flex-1 py-1 px-2 rounded-lg bg-[#4A6B53] hover:bg-[#3D5A45] text-white text-[10px] font-bold shadow-2xs transition"
                        >
                          {t.quickReturn}
                        </button>
                        {activeLoan && (
                          <button
                            onClick={() => handleRenew(activeLoan.id)}
                            disabled={isRenewingId === activeLoan.id}
                            className="py-1 px-2 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] text-[#5C5348] dark:text-[#DDD3BC] text-[10px] font-semibold hover:bg-[#FAF6EE] dark:hover:bg-[#201C19]"
                          >
                            +14d
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-[#8E8373]">
                    <p className="mb-2 italic">No book currently assigned.</p>
                    {currentRole === 'admin' && (
                      <button
                        onClick={() => onLendClick()}
                        className="text-[11px] text-[#BD3A2B] hover:underline font-bold"
                      >
                        + Assign a book
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loans Table & History */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#201C19] p-1 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] text-xs">
            {(['active', 'overdue', 'returned', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                  filterTab === tab
                    ? 'bg-[#2B2520] text-[#FAF6EE] shadow-2xs'
                    : 'text-[#5C5348] dark:text-[#DDD3BC] hover:text-[#2B2520] dark:hover:text-white'
                }`}
              >
                {tab}
                {tab === 'overdue' && overdueLoans.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#BD3A2B] text-white text-[9px]">
                    {overdueLoans.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Equipment Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={equipmentFilter}
              onChange={e => setEquipmentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold outline-none"
            >
              <option value="all">All Equipments</option>
              {equipmentList.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loans Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#FAF7F0] dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">{t.bookTitle}</th>
                <th className="py-3 px-4">{t.activeEquipment}</th>
                <th className="py-3 px-4">{t.borrowedSince}</th>
                <th className="py-3 px-4">{t.dueDateLabel}</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    {t.noActiveLoans}
                  </td>
                </tr>
              ) : (
                filteredLoans.map(loan => {
                  const associatedBook = books.find(b => b.id === loan.bookId);
                  const isDuePast =
                    new Date(loan.dueDate).getTime() < nowMs && loan.status !== 'returned';

                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-[#FAF6EE]/50 dark:hover:bg-[#201C19]/50 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div
                          onClick={() => associatedBook && onViewBook(associatedBook)}
                          className="font-bold text-[#2B2520] dark:text-[#FAF6EE] hover:text-[#BD3A2B] cursor-pointer line-clamp-1"
                        >
                          {loan.bookTitle}
                        </div>
                        {loan.notes && (
                          <div className="text-[11px] text-[#8E8373] italic truncate">
                            Note: {loan.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
                        {loan.userName}
                      </td>

                      <td className="py-3 px-4 text-[#736859] dark:text-[#A89D8E]">
                        {new Date(loan.borrowedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isDuePast
                              ? 'text-[#BD3A2B] font-bold'
                              : 'text-[#5C5348] dark:text-[#DDD3BC]'
                          }`}
                        >
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </span>
                        {loan.renewalCount > 0 && (
                          <span className="text-[10px] text-[#8E8373] ml-1.5">
                            (Renewed {loan.renewalCount}x)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1 text-[#4A6B53] font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Returned</span>
                          </span>
                        ) : isDuePast ? (
                          <span className="inline-flex items-center gap-1 text-[#BD3A2B] font-bold text-xs animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>OVERDUE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#C88A35] font-semibold text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {loan.status !== 'returned' && currentRole === 'admin' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRenew(loan.id)}
                              disabled={isRenewingId === loan.id}
                              className="px-2.5 py-1 rounded text-xs font-semibold border border-[#EAE2D2] dark:border-[#38322B] hover:bg-[#FAF6EE] dark:hover:bg-[#201C19] text-[#5C5348] dark:text-[#DDD3BC]"
                            >
                              {isRenewingId === loan.id ? '...' : '+14d'}
                            </button>
                            {associatedBook && (
                              <button
                                onClick={() => onReturnClick(associatedBook, loan)}
                                className="px-3 py-1 rounded text-xs font-bold bg-[#4A6B53] hover:bg-[#3D5A45] text-white shadow-2xs transition"
                              >
                                {t.quickReturn}
                              </button>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
