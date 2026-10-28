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
    <div className="group relative flex flex-col bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl overflow-hidden border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2B2520]/90 dark:bg-[#C88A35]/90 text-[#FAF6EE] dark:text-[#2B2520] shadow-md backdrop-blur-xs">
              <Clock className="w-3 h-3" />
              <span>{t.borrowed}</span>
            </span>
          )}
        </div>

        {/* Quick view hover icon */}
        <div className="absolute inset-0 bg-[#2B2520]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-2 rounded-lg bg-[#FAF6EE] text-[#2B2520] font-bold text-xs shadow-lg flex items-center gap-1.5 transform scale-90 group-hover:scale-100 transition-transform">
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
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-[#F5EFE3] dark:bg-[#2B2520] text-[#736859] dark:text-[#EAE2D2] border border-[#EAE2D2] dark:border-[#38322B]">
              {book.topic}
            </span>
            {book.subTags?.slice(0, 2).map((st, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAF6EE] dark:bg-[#171513] text-[#736859] dark:text-[#A89D8E]"
              >
                #{st}
              </span>
            ))}
          </div>

          {/* Book Title */}
          <h3
            onClick={() => onViewDetails(book)}
            className="font-bold text-[#2B2520] dark:text-[#FAF6EE] text-sm line-clamp-2 hover:text-[#BD3A2B] cursor-pointer mb-1 leading-snug"
          >
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-[#736859] dark:text-[#A89D8E] italic mb-2 line-clamp-1">
            {book.author}
          </p>
        </div>

        {/* Borrowing Context & Actions */}
        <div className="pt-3 border-t border-[#EAE2D2] dark:border-[#38322B] mt-2">
          {book.status === 'borrowed' ? (
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#736859] dark:text-[#A89D8E] font-medium">
                  {book.borrowedByName}
                </span>
                <span
                  className={`font-bold ${
                    isOverdue
                      ? 'text-[#BD3A2B]'
                      : daysDiff <= 3
                      ? 'text-[#C88A35]'
                      : 'text-[#2B2520] dark:text-[#FAF6EE]'
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
                    ? 'bg-[#2B2520] hover:bg-[#3D352E] text-[#FAF6EE] shadow-2xs'
                    : 'bg-[#F5EFE3] text-[#A89D8E] cursor-not-allowed'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#C88A35]" />
                <span>{t.quickLend}</span>
              </button>
            ) : (
              <button
                onClick={() => onReturn(book)}
                disabled={currentRole !== 'admin'}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition active:scale-98 ${
                  currentRole === 'admin'
                    ? 'bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs'
                    : 'bg-[#F5EFE3] text-[#A89D8E] cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.quickReturn}</span>
              </button>
            )}

            <button
              onClick={() => onViewDetails(book)}
              title={t.viewDetails}
              className="p-2 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] text-[#736859] dark:text-[#FAF6EE] hover:bg-[#F5EFE3] dark:hover:bg-[#2B2520] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
