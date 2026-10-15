import React from 'react';
import {
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Book, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { generateCoverThumbnail } from '../services/pdfClassifier';

interface BookCardProps {
  book: Book;
  currentLang: Language;
  currentRole: UserRole;
  onLend: (book: Book) => void;
  onReturn: (book: Book) => void;
  onViewDetails: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  currentLang,
  currentRole,
  onLend,
  onReturn,
  onViewDetails,
}) => {
  const t = translations[currentLang];

  // Calculate overdue status
  let isOverdue = false;
  let daysDiff = 0;
  if (book.status === 'borrowed' && book.dueDate) {
    const due = new Date(book.dueDate).getTime();
    const now = new Date().getTime();
    const diffTime = due - now;
    daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) {
      isOverdue = true;
    }
  }

  // Fallback cover if coverUrl is missing
  const coverSrc =
    book.coverUrl ||
    generateCoverThumbnail(book.title, book.author, book.topic, book.subTags);

  return (
    <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-[#1E2A5E]/10 dark:border-slate-700/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Book Cover Frame */}
      <div
        onClick={() => onViewDetails(book)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer"
      >
        <img
          src={coverSrc}
          alt={book.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Spine 3D Shadow Overlay */}
        <div className="absolute inset-y-0 left-0 w-6 book-spine-shadow pointer-events-none" />

        {/* Needs Review Badge */}
        {book.needsReview && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/95 text-white text-[11px] font-bold shadow-md backdrop-blur-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{t.needsReviewBadge}</span>
          </div>
        )}

        {/* Format Badge (DOCX vs PDF) */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs ${
              book.fileType === 'docx' || book.fileName?.endsWith('.docx')
                ? 'bg-[#185ABD]'
                : 'bg-[#DC2626]'
            }`}
          >
            {book.fileType === 'docx' || book.fileName?.endsWith('.docx') ? 'DOCX' : 'PDF'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-3 right-3">
          {book.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600/90 text-white shadow-md backdrop-blur-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t.available}</span>
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DC2626] text-white shadow-md animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>{t.overdueWarning.replace('{days}', String(Math.abs(daysDiff)))}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1E2A5E]/90 dark:bg-amber-500/90 text-white dark:text-[#1E2A5E] shadow-md backdrop-blur-xs">
              <Clock className="w-3 h-3" />
              <span>{t.borrowed}</span>
            </span>
          )}
        </div>

        {/* Quick view hover icon */}
        <div className="absolute inset-0 bg-[#1E2A5E]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-2 rounded-lg bg-white/95 text-[#1E2A5E] font-bold text-xs shadow-lg flex items-center gap-1.5 transform scale-90 group-hover:scale-100 transition-transform">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.viewDetails}</span>
          </span>
        </div>
      </div>

      {/* Book Information */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Topic & SubTags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-slate-100 dark:bg-slate-700 text-[#1E2A5E] dark:text-amber-300">
              {book.topic}
            </span>
            {book.subTags?.slice(0, 2).map((st, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
              >
                #{st}
              </span>
            ))}
          </div>

          {/* Book Title */}
          <h3
            onClick={() => onViewDetails(book)}
            className="font-bold text-[#1E2A5E] dark:text-slate-100 text-sm line-clamp-2 hover:text-[#0097B2] cursor-pointer mb-1 leading-snug"
          >
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2 line-clamp-1">
            {book.author}
          </p>
        </div>

        {/* Borrowing Context & Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-2">
          {book.status === 'borrowed' ? (
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {book.borrowedByName}
                </span>
                <span
                  className={`font-bold ${
                    isOverdue
                      ? 'text-[#DC2626]'
                      : daysDiff <= 3
                      ? 'text-amber-600'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isOverdue
                    ? `Overdue (${Math.abs(daysDiff)}d)`
                    : daysDiff === 0
                    ? t.dueToday
                    : t.dueInDays.replace('{days}', String(daysDiff))}
                </span>
              </div>
            </div>
          ) : null}

          {/* Action Button: Lend or Return */}
          <div className="flex items-center gap-2">
            {book.status === 'available' ? (
              <button
                onClick={() => onLend(book)}
                disabled={currentRole !== 'admin'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition active:scale-98 ${
                  currentRole === 'admin'
                    ? 'bg-[#1E2A5E] hover:bg-[#2A3B82] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>{t.quickLend}</span>
              </button>
            ) : (
              <button
                onClick={() => onReturn(book)}
                disabled={currentRole !== 'admin'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition active:scale-98 ${
                  currentRole === 'admin'
                    ? 'bg-[#0097B2] hover:bg-[#008299] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.quickReturn}</span>
              </button>
            )}

            <button
              onClick={() => onViewDetails(book)}
              title={t.viewDetails}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
