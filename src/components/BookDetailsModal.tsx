import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  User,
  Tag,
  FileText,
  Clock,
  Trash2,
  Edit,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Book, Language, UserRole, Loan } from '../types';
import { translations } from '../i18n/translations';
import { generateCoverThumbnail } from '../services/pdfClassifier';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  currentLang: Language;
  currentRole: UserRole;
  loansHistory: Loan[];
  onLend: (book: Book) => void;
  onReturn: (book: Book) => void;
  onDeleteBook: (bookId: string) => Promise<void>;
  onUpdateBook: (updated: Book) => Promise<void>;
  onAskAI?: (book: Book) => void;
  onSearchGrounding?: (book: Book) => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  currentLang,
  currentRole,
  loansHistory,
  onLend,
  onReturn,
  onDeleteBook,
  onUpdateBook,
  onAskAI,
  onSearchGrounding,
}) => {
  const t = translations[currentLang];
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [showReader, setShowReader] = useState(false);

  React.useEffect(() => {
    if (book) {
      setEditTitle(book.title);
      setEditAuthor(book.author);
      setEditTopic(book.topic);
      setEditSummary(book.summary || '');
      setIsEditing(false);
      setShowReader(false);
    }
  }, [book]);

  if (!isOpen || !book) return null;

  const coverSrc =
    book.coverUrl ||
    generateCoverThumbnail(book.title, book.author, book.topic, book.subTags);

  const bookLoans = loansHistory.filter(l => l.bookId === book.id);

  const handleSaveEdit = async () => {
    const updated: Book = {
      ...book,
      title: editTitle.trim(),
      author: editAuthor.trim(),
      topic: editTopic.trim(),
      summary: editSummary.trim(),
      needsReview: false, // Clearing needs review on manual save
    };
    await onUpdateBook(updated);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#FAF7F0] dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E2A5E] dark:text-amber-300">
              LIGHTHOUSE 橋i • 蔵書詳細
            </span>
            {book.needsReview && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                {t.needsReviewBadge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {showReader ? (
            /* Embedded PDF / Preview Reader */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1E2A5E] dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#0097B2]" />
                  <span>Reader: {book.title}</span>
                </h3>
                <button
                  onClick={() => setShowReader(false)}
                  className="text-xs font-bold text-slate-500 hover:text-[#1E2A5E] dark:hover:text-white"
                >
                  ← Back to Details
                </button>
              </div>

              <div className="w-full h-96 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center p-6 border border-slate-700 text-center">
                <BookOpen className="w-12 h-12 text-[#F5A623] mb-3 animate-bounce" />
                <p className="font-bold text-base mb-1">{book.title}</p>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  {book.pdfUrl
                    ? 'Interactive PDF document is ready for offline / online reading.'
                    : 'Generated technical summary and extracted opening chapters available.'}
                </p>
                {book.pdfUrl ? (
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0097B2] hover:bg-[#008299] text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Full PDF in New Tab</span>
                  </a>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-800 max-w-lg text-left text-xs text-slate-300 font-mono">
                    <p className="text-amber-400 font-bold mb-1">Chapter 1: Architecture Overview</p>
                    <p>{book.summary}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Main Book Header Card */}
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Book Cover Frame */}
                <div className="w-44 aspect-[3/4] shrink-0 mx-auto sm:mx-0 rounded-2xl overflow-hidden shadow-xl relative bg-slate-100 dark:bg-slate-800">
                  <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-y-0 left-0 w-5 book-spine-shadow" />
                </div>

                {/* Book Metadata details */}
                <div className="flex-1 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          {t.bookTitle}
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-[#1E2A5E] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          {t.author}
                        </label>
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={e => setEditAuthor(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-[#1E2A5E] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          {t.primaryTopic}
                        </label>
                        <input
                          type="text"
                          value={editTopic}
                          onChange={e => setEditTopic(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-[#1E2A5E] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase">
                          {t.summaryLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1E2A5E] dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-500"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-[#1E2A5E] dark:text-amber-300">
                          {book.topic}
                        </span>

                        {currentRole === 'admin' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#1E2A5E] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1"
                              title={t.editBook}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-semibold">{t.editBook}</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this book?')) {
                                  await onDeleteBook(book.id);
                                  onClose();
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#DC2626] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1"
                              title={t.deleteBook}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-[#1E2A5E] dark:text-white leading-tight font-serif-jp">
                        {book.title}
                      </h2>

                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                        {book.author}
                      </p>

                      {/* Sub-tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {book.subTags?.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* AI Classification Confidence */}
                      {book.confidence !== undefined && (
                        <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
                          <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                          <span>
                            {t.confidenceScore}: {Math.round(book.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Technical Summary */}
              {book.summary && (
                <div className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-slate-800/50 border border-[#1E2A5E]/10 dark:border-slate-800 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1E2A5E] dark:text-amber-300" />
                    <span>{t.summaryLabel}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {book.summary}
                  </p>
                </div>
              )}

              {/* Status & Loan Information */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Current Availability
                    </span>
                    {book.status === 'available' ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.available} (Ready for checkout)</span>
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#0097B2] text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{t.borrowed} by {book.borrowedByName}</span>
                        </span>
                        {book.dueDate && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Due date: {new Date(book.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowReader(true)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{t.readPreview}</span>
                    </button>

                    {onSearchGrounding && (
                      <button
                        onClick={() => {
                          onClose();
                          onSearchGrounding(book);
                        }}
                        className="px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1.5"
                        title="Google Search Grounding for this book"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>Search Web</span>
                      </button>
                    )}

                    {onAskAI && (
                      <button
                        onClick={() => {
                          onClose();
                          onAskAI(book);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#1E2A5E] dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-slate-700 flex items-center gap-1.5"
                        title="Ask Gemini AI about this book"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                        <span>Ask AI</span>
                      </button>
                    )}

                    {currentRole === 'admin' && (
                      <>
                        {book.status === 'available' ? (
                          <button
                            onClick={() => {
                              onClose();
                              onLend(book);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white text-xs font-bold shadow-md"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-[#F5A623]" />
                            <span>{t.quickLend}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onClose();
                              onReturn(book);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0097B2] hover:bg-[#008299] text-white text-xs font-bold shadow-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.quickReturn}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Document File & Folder Hierarchy Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                    Document Properties & Folder Path
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                      book.fileType === 'docx' || book.fileName?.endsWith('.docx')
                        ? 'bg-[#185ABD]'
                        : 'bg-[#DC2626]'
                    }`}
                  >
                    {book.fileType === 'docx' || book.fileName?.endsWith('.docx') ? 'Word DOCX' : 'PDF Document'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400">Folder Directory: </span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {book.folderPath || 'Root / General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">File Name: </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 truncate inline-block max-w-[180px]">
                      {book.fileName || 'document.pdf'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Estimated Pages: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {book.pageCount || 1} pages
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">File Size: </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {book.fileSize ? `${(book.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Past Loan History for this book */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.borrowingHistoryLabel} ({bookLoans.length})
                </h4>
                {bookLoans.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No past loan logs yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                    {bookLoans.map(l => (
                      <div
                        key={l.id}
                        className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50"
                      >
                        <div>
                          <span className="font-bold text-[#1E2A5E] dark:text-white">
                            {l.userName}
                          </span>
                          <span className="text-slate-400 ml-2">
                            {new Date(l.borrowedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${
                            l.status === 'returned'
                              ? 'text-emerald-600'
                              : l.status === 'overdue'
                              ? 'text-rose-600 font-bold'
                              : 'text-amber-600'
                          }`}
                        >
                          {l.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
