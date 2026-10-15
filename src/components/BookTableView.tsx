import React from 'react';
import { CheckCircle2, AlertCircle, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { Book, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { generateCoverThumbnail } from '../services/pdfClassifier';

interface BookTableViewProps {
  books: Book[];
  currentLang: Language;
  currentRole: UserRole;
  onLend: (book: Book) => void;
  onReturn: (book: Book) => void;
  onViewDetails: (book: Book) => void;
}

export const BookTableView: React.FC<BookTableViewProps> = ({
  books,
  currentLang,
  currentRole,
  onLend,
  onReturn,
  onViewDetails,
}) => {
  const t = translations[currentLang];

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#1E2A5E]/10 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="bg-[#FAF7F0] dark:bg-slate-900 border-b border-[#1E2A5E]/10 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="py-3 px-4 w-14">Cover</th>
            <th className="py-3 px-4">Format</th>
            <th className="py-3 px-4">{t.bookTitle} & {t.author}</th>
            <th className="py-3 px-4">{t.primaryTopic}</th>
            <th className="py-3 px-4">Folder Path</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">{t.activeEquipment}</th>
            <th className="py-3 px-4">{t.dueDateLabel}</th>
            <th className="py-3 px-4 text-right">{t.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {books.map(book => {
            const isBorrowed = book.status === 'borrowed';
            let isOverdue = false;
            let daysDiff = 0;
            if (isBorrowed && book.dueDate) {
              const diffTime = new Date(book.dueDate).getTime() - new Date().getTime();
              daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              isOverdue = daysDiff < 0;
            }

            const coverSrc =
              book.coverUrl ||
              generateCoverThumbnail(book.title, book.author, book.topic, book.subTags);

            return (
              <tr
                key={book.id}
                className="hover:bg-amber-50/40 dark:hover:bg-slate-700/40 transition-colors"
              >
                {/* Cover thumbnail */}
                <td className="py-2.5 px-4">
                  <div
                    onClick={() => onViewDetails(book)}
                    className="w-10 h-14 rounded overflow-hidden bg-slate-100 cursor-pointer shadow-xs shrink-0"
                  >
                    <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                  </div>
                </td>

                {/* Format */}
                <td className="py-2.5 px-4">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase ${
                      book.fileType === 'docx' || book.fileName?.endsWith('.docx')
                        ? 'bg-[#185ABD]'
                        : 'bg-[#DC2626]'
                    }`}
                  >
                    {book.fileType === 'docx' || book.fileName?.endsWith('.docx') ? 'DOCX' : 'PDF'}
                  </span>
                </td>

                {/* Title & Author */}
                <td className="py-2.5 px-4 max-w-xs sm:max-w-md">
                  <div
                    onClick={() => onViewDetails(book)}
                    className="font-bold text-[#1E2A5E] dark:text-slate-100 hover:text-[#0097B2] cursor-pointer line-clamp-1"
                  >
                    {book.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {book.author}
                  </div>
                </td>

                {/* Topic */}
                <td className="py-2.5 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-[#1E2A5E] dark:text-amber-300">
                    {book.topic}
                  </span>
                </td>

                {/* Folder Path */}
                <td className="py-2.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={book.folderPath}>
                  {book.folderPath || 'Root'}
                </td>

                {/* Status */}
                <td className="py-2.5 px-4">
                  {book.status === 'available' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.available}</span>
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold text-xs animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{t.overdueWarning.replace('{days}', String(Math.abs(daysDiff)))}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#0097B2] font-semibold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t.borrowed}</span>
                    </span>
                  )}
                </td>

                {/* Equipment (Reader) */}
                <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                  {book.borrowedByName || '—'}
                </td>

                {/* Due Date */}
                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                  {book.dueDate ? new Date(book.dueDate).toLocaleDateString() : '—'}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {book.status === 'available' ? (
                      <button
                        onClick={() => onLend(book)}
                        disabled={currentRole !== 'admin'}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                          currentRole === 'admin'
                            ? 'bg-[#1E2A5E] hover:bg-[#2A3B82] text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {t.quickLend}
                      </button>
                    ) : (
                      <button
                        onClick={() => onReturn(book)}
                        disabled={currentRole !== 'admin'}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                          currentRole === 'admin'
                            ? 'bg-[#0097B2] hover:bg-[#008299] text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {t.quickReturn}
                      </button>
                    )}
                    <button
                      onClick={() => onViewDetails(book)}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
