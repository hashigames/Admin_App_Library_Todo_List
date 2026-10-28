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
    <div className="w-full overflow-x-auto rounded-2xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] shadow-2xs">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="bg-[#FAF6EE] dark:bg-[#171513] border-b border-[#EAE2D2] dark:border-[#38322B] text-[#736859] dark:text-[#A89D8E] uppercase tracking-wider text-[11px]">
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
        <tbody className="divide-y divide-[#EAE2D2] dark:divide-[#38322B]">
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
                className="hover:bg-[#FAF6EE]/60 dark:hover:bg-[#201C19]/60 transition-colors"
              >
                {/* Cover thumbnail */}
                <td className="py-2.5 px-4">
                  <div
                    onClick={() => onViewDetails(book)}
                    className="w-10 h-14 rounded overflow-hidden bg-[#FAF6EE] dark:bg-[#171513] cursor-pointer shadow-2xs shrink-0"
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
                        : 'bg-[#BD3A2B]'
                    }`}
                  >
                    {book.fileType === 'docx' || book.fileName?.endsWith('.docx') ? 'DOCX' : 'PDF'}
                  </span>
                </td>

                {/* Title & Author */}
                <td className="py-2.5 px-4 max-w-xs sm:max-w-md">
                  <div
                    onClick={() => onViewDetails(book)}
                    className="font-bold text-[#2B2520] dark:text-[#FAF6EE] hover:text-[#BD3A2B] cursor-pointer line-clamp-1"
                  >
                    {book.title}
                  </div>
                  <div className="text-xs text-[#736859] dark:text-[#A89D8E] italic">
                    {book.author}
                  </div>
                </td>

                {/* Topic */}
                <td className="py-2.5 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] text-[#5C5348] dark:text-[#DDD3BC]">
                    {book.topic}
                  </span>
                </td>

                {/* Folder Path */}
                <td className="py-2.5 px-4 text-xs font-mono text-[#8E8373] truncate max-w-[140px]" title={book.folderPath}>
                  {book.folderPath || 'Root'}
                </td>

                {/* Status */}
                <td className="py-2.5 px-4">
                  {book.status === 'available' ? (
                    <span className="inline-flex items-center gap-1 text-[#4A6B53] font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.available}</span>
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-[#BD3A2B] font-bold text-xs animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{t.overdueWarning.replace('{days}', String(Math.abs(daysDiff)))}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#BD3A2B] font-semibold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{t.borrowed}</span>
                    </span>
                  )}
                </td>

                {/* Equipment (Reader) */}
                <td className="py-2.5 px-4 font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  {book.borrowedByName || '—'}
                </td>

                {/* Due Date */}
                <td className="py-2.5 px-4 text-xs text-[#736859] dark:text-[#A89D8E]">
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
                            ? 'bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs'
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
                            ? 'bg-[#4A6B53] hover:bg-[#3D5A45] text-white shadow-2xs'
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
