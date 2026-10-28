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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#201C19]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2B2520] dark:text-[#C88A35] font-serif-jp">
              LIGHTHOUSE 橋i • 蔵書詳細
            </span>
            {book.needsReview && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#BD3A2B] text-white">
                {t.needsReviewBadge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#736859] hover:text-[#2B2520] dark:text-[#A89D8E] dark:hover:text-[#FAF6EE] hover:bg-[#EAE2D2] dark:hover:bg-[#2D2823] transition-colors"
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
                <h3 className="font-bold text-sm text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C88A35]" />
                  <span>Reader: {book.title}</span>
                </h3>
                <button
                  onClick={() => setShowReader(false)}
                  className="text-xs font-bold text-[#736859] hover:text-[#BD3A2B] dark:text-[#A89D8E] dark:hover:text-[#FAF6EE] transition-colors"
                >
                  ← Back to Details
                </button>
              </div>

              <div className="w-full h-96 rounded-2xl bg-[#201C19] text-[#FAF6EE] flex flex-col items-center justify-center p-6 border border-[#38322B] text-center">
                <BookOpen className="w-12 h-12 text-[#C88A35] mb-3 animate-bounce" />
                <p className="font-bold text-base mb-1">{book.title}</p>
                <p className="text-xs text-[#A89D8E] max-w-md mb-4">
                  {book.pdfUrl
                    ? 'Interactive PDF document is ready for offline / online reading.'
                    : 'Generated technical summary and extracted opening chapters available.'}
                </p>
                {book.pdfUrl ? (
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white text-xs font-bold shadow-md transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Full PDF in New Tab</span>
                  </a>
                ) : (
                  <div className="p-4 rounded-xl bg-[#171513] max-w-lg text-left text-xs text-[#DECFA9] font-mono border border-[#38322B]">
                    <p className="text-[#C88A35] font-bold mb-1">Chapter 1: Architecture Overview</p>
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
                          className="w-full px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-sm font-bold text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#736859] dark:text-[#A89D8E] uppercase">
                          {t.author}
                        </label>
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={e => setEditAuthor(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-xs font-semibold text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#736859] dark:text-[#A89D8E] uppercase">
                          {t.primaryTopic}
                        </label>
                        <input
                          type="text"
                          value={editTopic}
                          onChange={e => setEditTopic(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-xs font-semibold text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#736859] dark:text-[#A89D8E] uppercase">
                          {t.summaryLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-xs text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 rounded-lg bg-[#4A6B53] hover:bg-[#3D5A45] text-white text-xs font-bold transition"
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] text-xs text-[#736859] dark:text-[#A89D8E] hover:bg-[#EAE2D2] transition"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#F5EFE3] dark:bg-[#201C19] text-[#2B2520] dark:text-[#C88A35] border border-[#DECFA9] dark:border-[#38322B]">
                          {book.topic}
                        </span>

                        {currentRole === 'admin' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="p-1.5 rounded-lg text-[#736859] hover:text-[#2B2520] dark:hover:text-[#FAF6EE] hover:bg-[#EAE2D2] dark:hover:bg-[#201C19] text-xs flex items-center gap-1 transition"
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
                              className="p-1.5 rounded-lg text-[#BD3A2B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1 transition"
                              title={t.deleteBook}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-[#2B2520] dark:text-[#FAF6EE] leading-tight font-serif-jp">
                        {book.title}
                      </h2>

                      <p className="text-sm text-[#736859] dark:text-[#A89D8E] italic">
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
                        <div className="flex items-center gap-2 pt-2 text-xs text-[#736859] dark:text-[#A89D8E]">
                          <Sparkles className="w-3.5 h-3.5 text-[#C88A35]" />
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
                <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C88A35]" />
                    <span>{t.summaryLabel}</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-[#2B2520] dark:text-[#FAF6EE] leading-relaxed">
                    {book.summary}
                  </p>
                </div>
              )}

              {/* Status & Loan Information */}
              <div className="p-4 rounded-2xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#736859] dark:text-[#A89D8E] uppercase block mb-1">
                      Current Availability
                    </span>
                    {book.status === 'available' ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#4A6B53] dark:text-[#689473] text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.available} (Ready for checkout)</span>
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#BD3A2B] text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{t.borrowed} by {book.borrowedByName}</span>
                        </span>
                        {book.dueDate && (
                          <p className="text-xs text-[#736859] dark:text-[#A89D8E] mt-0.5">
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
                      className="px-3.5 py-2 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE] hover:bg-[#F5EFE3] dark:hover:bg-[#2B2520] flex items-center gap-1.5 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#C88A35]" />
                      <span>{t.readPreview}</span>
                    </button>

                    {onSearchGrounding && (
                      <button
                        onClick={() => {
                          onClose();
                          onSearchGrounding(book);
                        }}
                        className="px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#4A4135] bg-[#F5EFE3] dark:bg-[#2B2520] text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE] hover:border-[#C88A35] flex items-center gap-1.5 transition"
                        title="Google Search Grounding for this book"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C88A35]" />
                        <span>Search Web</span>
                      </button>
                    )}

                    {onAskAI && (
                      <button
                        onClick={() => {
                          onClose();
                          onAskAI(book);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] text-[#2B2520] dark:text-[#FAF6EE] text-xs font-bold hover:bg-[#F5EFE3] flex items-center gap-1.5 transition"
                        title="Ask Gemini AI about this book"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C88A35]" />
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
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2B2520] dark:bg-[#C88A35] hover:bg-[#3D352E] dark:hover:bg-[#B37829] text-[#FAF6EE] dark:text-[#2B2520] text-xs font-bold shadow-sm transition active:scale-95"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>{t.quickLend}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onClose();
                              onReturn(book);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A6B53] hover:bg-[#3D5A45] text-white text-xs font-bold shadow-sm transition active:scale-95"
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
              <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#736859] dark:text-[#A89D8E] uppercase text-[11px] tracking-wider">
                    Document Properties & Folder Path
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                      book.fileType === 'docx' || book.fileName?.endsWith('.docx')
                        ? 'bg-[#2B2520]'
                        : 'bg-[#BD3A2B]'
                    }`}
                  >
                    {book.fileType === 'docx' || book.fileName?.endsWith('.docx') ? 'Word DOCX' : 'PDF Document'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#736859] dark:text-[#A89D8E]">
                  <div>
                    <span>Folder Directory: </span>
                    <span className="font-mono font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
                      {book.folderPath || 'Root / General'}
                    </span>
                  </div>
                  <div>
                    <span>File Name: </span>
                    <span className="font-mono text-[#2B2520] dark:text-[#FAF6EE] truncate inline-block max-w-[180px]">
                      {book.fileName || 'document.pdf'}
                    </span>
                  </div>
                  <div>
                    <span>Estimated Pages: </span>
                    <span className="font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
                      {book.pageCount || 1} pages
                    </span>
                  </div>
                  <div>
                    <span>File Size: </span>
                    <span className="font-mono text-[#2B2520] dark:text-[#FAF6EE]">
                      {book.fileSize ? `${(book.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Past Loan History for this book */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E]">
                  {t.borrowingHistoryLabel} ({bookLoans.length})
                </h4>
                {bookLoans.length === 0 ? (
                  <p className="text-xs text-[#736859] italic">No past loan logs yet.</p>
                ) : (
                  <div className="divide-y divide-[#EAE2D2] dark:divide-[#38322B] rounded-xl border border-[#EAE2D2] dark:border-[#38322B] overflow-hidden text-xs">
                    {bookLoans.map(l => (
                      <div
                        key={l.id}
                        className="p-3 flex items-center justify-between bg-[#FFFFFF] dark:bg-[#201C19]"
                      >
                        <div>
                          <span className="font-bold text-[#2B2520] dark:text-[#FAF6EE]">
                            {l.userName}
                          </span>
                          <span className="text-[#736859] ml-2">
                            {new Date(l.borrowedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${
                            l.status === 'returned'
                              ? 'text-[#4A6B53]'
                              : l.status === 'overdue'
                              ? 'text-[#BD3A2B] font-bold'
                              : 'text-[#C88A35]'
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
