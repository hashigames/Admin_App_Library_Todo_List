import React, { useState, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  BookOpen,
  AlertCircle,
  Plus,
  Sparkles,
  Layers,
  FolderTree,
} from 'lucide-react';
import { Book, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { BookCard } from './BookCard';
import { BookTableView } from './BookTableView';
import { WindowsPanelsExplorer } from './WindowsPanelsExplorer';

interface LibraryViewProps {
  books: Book[];
  topics: string[];
  currentLang: Language;
  currentRole: UserRole;
  onLendBook: (book: Book) => void;
  onReturnBook: (book: Book) => void;
  onViewBookDetails: (book: Book) => void;
  onOpenUpload: () => void;
  onOpenAiChat?: (book?: Book) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  topics,
  currentLang,
  currentRole,
  onLendBook,
  onReturnBook,
  onViewBookDetails,
  onOpenUpload,
  onOpenAiChat,
}) => {
  const t = translations[currentLang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'needsReview'>('all');
  
  // View mode: 'windows' (Windows Explorer Panels Hierarchy), 'shelf' (Cover Grid), or 'table' (Details List)
  const [viewMode, setViewMode] = useState<'windows' | 'shelf' | 'table'>('windows');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'popular'>('newest');

  // Count Needs Review items for badge
  const needsReviewCount = useMemo(() => {
    return books.filter(b => b.needsReview).length;
  }, [books]);

  // Compute topic counts
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of books) {
      counts[b.topic] = (counts[b.topic] || 0) + 1;
    }
    return counts;
  }, [books]);

  // Filter and sort books for Shelf & Table modes
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Status filter
    if (statusFilter === 'available') {
      result = result.filter(b => b.status === 'available');
    } else if (statusFilter === 'borrowed') {
      result = result.filter(b => b.status === 'borrowed');
    } else if (statusFilter === 'needsReview') {
      result = result.filter(b => b.needsReview);
    }

    // Topic filter
    if (selectedTopic !== 'all') {
      result = result.filter(b => b.topic === selectedTopic);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.topic.toLowerCase().includes(q) ||
          (b.folderPath && b.folderPath.toLowerCase().includes(q)) ||
          (b.borrowedByName && b.borrowedByName.toLowerCase().includes(q)) ||
          b.subTags?.some(tag => tag.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'popular') {
        return (b.loanCount || 0) - (a.loanCount || 0);
      }
      return 0;
    });

    return result;
  }, [books, statusFilter, selectedTopic, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in">
      
      {/* ── TOP VIEW SWITCHER & TITLE BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#1E2A5E]/10 dark:border-slate-700/60 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#1E2A5E] dark:text-white flex items-center gap-2 font-serif-jp">
            <span>燈台文庫 蔵書一覧</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0097B2]/10 text-[#0097B2] dark:text-[#38BDF8] font-medium tracking-wide">
              とうだいぶんこ
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E2A5E] text-white font-sans font-bold">
              {books.length} Books
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organized with Windows Panels Hierarchy, topic directories, and real-time loan tracking.
          </p>
        </div>

        {/* View Switcher: Windows Panels vs Shelves vs Table */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">View:</span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-2xl p-1">
            <button
              onClick={() => setViewMode('windows')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'windows'
                  ? 'bg-[#1E2A5E] text-white shadow-xs dark:bg-amber-400 dark:text-[#1E2A5E]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#1E2A5E] dark:hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Windows Panels</span>
            </button>

            <button
              onClick={() => setViewMode('shelf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'shelf'
                  ? 'bg-[#1E2A5E] text-white shadow-xs dark:bg-amber-400 dark:text-[#1E2A5E]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#1E2A5E] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Shelves</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'table'
                  ? 'bg-[#1E2A5E] text-white shadow-xs dark:bg-amber-400 dark:text-[#1E2A5E]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#1E2A5E] dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODE 1: WINDOWS PANELS HIERARCHY EXPLORER (Full 3-Panel Experience) ── */}
      {viewMode === 'windows' ? (
        <WindowsPanelsExplorer
          books={books}
          topics={topics}
          currentLang={currentLang}
          currentRole={currentRole}
          onLendBook={onLendBook}
          onReturnBook={onReturnBook}
          onViewBookDetails={onViewBookDetails}
          onOpenUpload={onOpenUpload}
          onOpenAiChat={onOpenAiChat}
        />
      ) : (
        /* ── MODES 2 & 3: SHELF GRID & TABLE VIEW WITH SEARCH & TOPIC CHIPS ── */
        <div className="space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-[#1E2A5E] dark:text-white shadow-xs outline-none focus:ring-2 focus:ring-[#1E2A5E] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Toggle & Sort Controls */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">{t.allStatus}</option>
                <option value="available">{t.available}</option>
                <option value="borrowed">{t.borrowed}</option>
                <option value="needsReview">Needs Review ({needsReviewCount})</option>
              </select>

              {/* Sort By Select */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="title">{t.sortTitle}</option>
                <option value="popular">{t.sortPopular}</option>
              </select>
            </div>
          </div>

          {/* Topic Filter Chips Horizontal Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedTopic('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                selectedTopic === 'all'
                  ? 'bg-[#1E2A5E] text-white dark:bg-amber-400 dark:text-[#1E2A5E] shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {t.allTopics} ({books.length})
            </button>

            {needsReviewCount > 0 && (
              <button
                onClick={() => {
                  setSelectedTopic('all');
                  setStatusFilter('needsReview');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 active:scale-95 ${
                  statusFilter === 'needsReview'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Unsorted ({needsReviewCount})</span>
              </button>
            )}

            {topics.map(topic => {
              const count = topicCounts[topic] || 0;
              if (count === 0 && selectedTopic !== topic) return null;

              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    selectedTopic === topic
                      ? 'bg-[#1E2A5E] text-white dark:bg-amber-400 dark:text-[#1E2A5E] shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span>{topic}</span>
                  <span className="ml-1.5 text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Catalog Count Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>{t.booksCount.replace('{count}', String(filteredBooks.length))}</span>
            {currentRole === 'admin' && (
              <button
                onClick={onOpenUpload}
                className="text-xs font-bold text-[#0097B2] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Folders / Files</span>
              </button>
            )}
          </div>

          {/* Empty State or Content */}
          {filteredBooks.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-center max-w-lg mx-auto">
              <BookOpen className="w-12 h-12 text-[#F5A623] mx-auto mb-3 opacity-80" />
              <h3 className="text-base sm:text-lg font-bold text-[#1E2A5E] dark:text-white mb-1">
                {t.noBooksFound}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                {t.noBooksFoundSub}
              </p>
              {currentRole === 'admin' && (
                <button
                  onClick={onOpenUpload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white text-xs font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4 text-[#F5A623]" />
                  <span>{t.startBatchUpload}</span>
                </button>
              )}
            </div>
          ) : viewMode === 'shelf' ? (
            /* Shelf View: Grid of 3D spine book covers */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {filteredBooks.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  currentLang={currentLang}
                  currentRole={currentRole}
                  onLend={onLendBook}
                  onReturn={onReturnBook}
                  onViewDetails={onViewBookDetails}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <BookTableView
              books={filteredBooks}
              currentLang={currentLang}
              currentRole={currentRole}
              onLend={onLendBook}
              onReturn={onReturnBook}
              onViewDetails={onViewBookDetails}
            />
          )}
        </div>
      )}

    </div>
  );
};
