import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Search,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCw,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Sparkles,
  HardDrive,
  FileCode,
  Tag,
  ExternalLink,
  Plus,
  Maximize2,
  Minimize2,
  Filter,
  SlidersHorizontal,
  Bookmark,
  Layers,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';
import { Book, Language, UserRole } from '../types';
import { translations } from '../i18n/translations';

interface WindowsPanelsExplorerProps {
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

// Tree node definition
interface TreeNode {
  id: string;
  name: string;
  type: 'root' | 'category-group' | 'topic' | 'folder' | 'equipment' | 'status-filter';
  icon?: React.ReactNode;
  count: number;
  children?: TreeNode[];
  dataKey?: string;
  path?: string[];
}

export const WindowsPanelsExplorer: React.FC<WindowsPanelsExplorerProps> = ({
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

  // Active navigation & view state
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all-books');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'quick-access': true,
    'topics-root': true,
    'ai-group': true,
    'cloud-group': true,
    'folders-root': true,
    'equipment-root': true,
  });

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'needsReview'>('all');
  const [viewStyle, setViewStyle] = useState<'tiles' | 'details'>('tiles');
  const [sortBy, setSortBy] = useState<'name' | 'author' | 'topic' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Panel visibility toggles (Windows Explorer style)
  const [showLeftTree, setShowLeftTree] = useState(true);
  const [showRightPreview, setShowRightPreview] = useState(true);

  // History tracking for Explorer Back/Forward/Up
  const [history, setHistory] = useState<string[]>(['all-books']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Format file size
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Build recursive folder hierarchy from books' folderPath
  const folderTree = useMemo(() => {
    const root: Record<string, any> = {};

    books.forEach(b => {
      const pathStr = b.folderPath || 'Unsorted';
      const parts = pathStr.split('/').filter(Boolean);
      let curr = root;

      parts.forEach((part, idx) => {
        if (!curr[part]) {
          curr[part] = {
            _name: part,
            _path: parts.slice(0, idx + 1).join('/'),
            _books: [],
            _children: {},
          };
        }
        curr = curr[part]._children;
      });

      // Register book in its leaf and ancestors
      let walk = root;
      parts.forEach(part => {
        if (walk[part]) {
          walk[part]._books.push(b);
          walk = walk[part]._children;
        }
      });
    });

    const convertToTreeNodes = (obj: Record<string, any>, prefix: string = 'folder'): TreeNode[] => {
      return Object.keys(obj).map(key => {
        const item = obj[key];
        const id = `${prefix}-${item._path}`;
        return {
          id,
          name: item._name,
          type: 'folder',
          count: item._books.length,
          path: item._path.split('/'),
          dataKey: item._path,
          children: Object.keys(item._children).length > 0 ? convertToTreeNodes(item._children, id) : undefined,
        };
      });
    };

    return convertToTreeNodes(root);
  }, [books]);

  // Compute active equipment counts
  const equipmentLoanCounts = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};
    books.forEach(b => {
      if (b.status === 'borrowed' && b.borrowedBy) {
        if (!counts[b.borrowedBy]) {
          counts[b.borrowedBy] = { count: 0, name: b.borrowedByName || b.borrowedBy };
        }
        counts[b.borrowedBy].count++;
      }
    });
    return counts;
  }, [books]);

  // Group topics logically for Windows Library hierarchy
  const categorizedTopics = useMemo(() => {
    const aiTopics = ['Machine Learning', 'Computer Vision', 'Generative AI', 'RAG', 'Python'];
    const cloudTopics = ['Google Cloud', 'Cisco', 'Networking', 'Active Directory', 'DevOps'];
    const enginesTopics = ['Unity', 'Unreal Engine', 'Structural Design'];
    const securityTopics = ['Cybersecurity', 'CompTIA'];

    const getCount = (name: string) => books.filter(b => b.topic === name).length;

    const buildNodes = (names: string[]): TreeNode[] => {
      return names
        .filter(n => topics.includes(n) || getCount(n) > 0)
        .map(n => ({
          id: `topic-${n}`,
          name: n,
          type: 'topic',
          count: getCount(n),
          dataKey: n,
        }));
    };

    const otherTopicNames = topics.filter(
      t =>
        !aiTopics.includes(t) &&
        !cloudTopics.includes(t) &&
        !enginesTopics.includes(t) &&
        !securityTopics.includes(t)
    );

    return {
      ai: buildNodes(aiTopics),
      cloud: buildNodes(cloudTopics),
      engines: buildNodes(enginesTopics),
      security: buildNodes(securityTopics),
      other: buildNodes(otherTopicNames),
    };
  }, [topics, books]);

  // Expand / collapse helper
  const toggleNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Navigate to a node
  const navigateToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nodeId);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Explorer History: Back
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setSelectedNodeId(history[newIdx]);
    }
  };

  // Explorer History: Forward
  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setSelectedNodeId(history[newIdx]);
    }
  };

  // Explorer History: Up
  const handleGoUp = () => {
    if (selectedNodeId.startsWith('topic-')) {
      navigateToNode('topics-root');
    } else if (selectedNodeId.startsWith('folder-')) {
      const path = selectedNodeId.replace(/^folder-/, '');
      const parts = path.split('/');
      if (parts.length > 1) {
        parts.pop();
        navigateToNode(`folder-${parts.join('/')}`);
      } else {
        navigateToNode('folders-root');
      }
    } else {
      navigateToNode('all-books');
    }
  };

  // Breadcrumbs generator
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: '燈台文庫 橋i', id: 'all-books' }];

    if (selectedNodeId === 'all-books') {
      crumbs.push({ label: 'All Library Books', id: 'all-books' });
    } else if (selectedNodeId === 'available-books') {
      crumbs.push({ label: 'Available (貸出可)', id: 'available-books' });
    } else if (selectedNodeId === 'borrowed-books') {
      crumbs.push({ label: 'Borrowed (貸出中)', id: 'borrowed-books' });
    } else if (selectedNodeId === 'needs-review') {
      crumbs.push({ label: 'Needs Review (Unsorted)', id: 'needs-review' });
    } else if (selectedNodeId === 'overdue-loans') {
      crumbs.push({ label: 'Overdue Loans (延滞)', id: 'overdue-loans' });
    } else if (selectedNodeId === 'topics-root') {
      crumbs.push({ label: 'Topic Library', id: 'topics-root' });
    } else if (selectedNodeId.startsWith('topic-')) {
      crumbs.push({ label: 'Topic Library', id: 'topics-root' });
      crumbs.push({ label: selectedNodeId.replace(/^topic-/, ''), id: selectedNodeId });
    } else if (selectedNodeId === 'folders-root') {
      crumbs.push({ label: 'Uploaded Folder Hierarchy', id: 'folders-root' });
    } else if (selectedNodeId.startsWith('folder-')) {
      crumbs.push({ label: 'Folders', id: 'folders-root' });
      const folderPath = selectedNodeId.replace(/^folder-/, '');
      const parts = folderPath.split('/');
      let currentAcc = '';
      parts.forEach(part => {
        currentAcc = currentAcc ? `${currentAcc}/${part}` : part;
        crumbs.push({ label: part, id: `folder-${currentAcc}` });
      });
    } else if (selectedNodeId.startsWith('eq-')) {
      crumbs.push({ label: 'Equipment', id: 'all-books' });
      const eqId = selectedNodeId.replace(/^eq-/, '');
      crumbs.push({ label: equipmentLoanCounts[eqId]?.name || eqId, id: selectedNodeId });
    }

    return crumbs;
  }, [selectedNodeId, equipmentLoanCounts]);

  // Filter books based on active node and search
  const displayedBooks = useMemo(() => {
    let result = [...books];

    // Filter by node
    if (selectedNodeId === 'available-books') {
      result = result.filter(b => b.status === 'available');
    } else if (selectedNodeId === 'borrowed-books') {
      result = result.filter(b => b.status === 'borrowed');
    } else if (selectedNodeId === 'needs-review') {
      result = result.filter(b => b.needsReview);
    } else if (selectedNodeId === 'overdue-loans') {
      const now = Date.now();
      result = result.filter(b => b.status === 'borrowed' && b.dueDate && new Date(b.dueDate).getTime() < now);
    } else if (selectedNodeId.startsWith('topic-')) {
      const topicName = selectedNodeId.replace(/^topic-/, '');
      result = result.filter(b => b.topic.toLowerCase() === topicName.toLowerCase());
    } else if (selectedNodeId.startsWith('folder-')) {
      const targetFolder = selectedNodeId.replace(/^folder-/, '');
      result = result.filter(b => (b.folderPath || '').startsWith(targetFolder));
    } else if (selectedNodeId.startsWith('eq-')) {
      const eqId = selectedNodeId.replace(/^eq-/, '');
      result = result.filter(b => b.borrowedBy === eqId);
    }

    // Status filter chip
    if (statusFilter === 'available') {
      result = result.filter(b => b.status === 'available');
    } else if (statusFilter === 'borrowed') {
      result = result.filter(b => b.status === 'borrowed');
    } else if (statusFilter === 'needsReview') {
      result = result.filter(b => b.needsReview);
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
          (b.fileName && b.fileName.toLowerCase().includes(q)) ||
          (b.borrowedByName && b.borrowedByName.toLowerCase().includes(q)) ||
          b.subTags?.some(tag => tag.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'author') {
        comparison = a.author.localeCompare(b.author);
      } else if (sortBy === 'topic') {
        comparison = a.topic.localeCompare(b.topic);
      } else if (sortBy === 'size') {
        comparison = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortBy === 'date') {
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [books, selectedNodeId, statusFilter, searchQuery, sortBy, sortOrder]);

  // Set default selected book if none selected or if not in current view
  useEffect(() => {
    if (displayedBooks.length > 0) {
      if (!selectedBookId || !displayedBooks.some(b => b.id === selectedBookId)) {
        setSelectedBookId(displayedBooks[0].id);
      }
    } else {
      setSelectedBookId(null);
    }
  }, [displayedBooks, selectedBookId]);

  // Currently selected book for the right preview pane
  const selectedBook = useMemo(() => {
    return books.find(b => b.id === selectedBookId) || null;
  }, [books, selectedBookId]);

  // Counts for summary
  const availableCount = books.filter(b => b.status === 'available').length;
  const borrowedCount = books.filter(b => b.status === 'borrowed').length;
  const needsReviewCount = books.filter(b => b.needsReview).length;
  const overdueCount = books.filter(
    b => b.status === 'borrowed' && b.dueDate && new Date(b.dueDate).getTime() < Date.now()
  ).length;

  return (
    <div className="flex flex-col bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] rounded-3xl overflow-hidden shadow-2xl transition-all max-w-[1720px] mx-auto my-4 animate-in fade-in">
      
      {/* ── WINDOW TITLE BAR (Windows Fluent Japanese Native Header) ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#2B2520] dark:bg-[#1E1A17] text-[#FAF6EE] select-none border-b border-[#38322B]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#C88A35] flex items-center justify-center text-[#2B2520] font-bold text-[10px] shadow-xs">
            橋
          </div>
          <span className="font-semibold text-xs tracking-wide font-serif-jp flex items-center gap-1.5 flex-wrap">
            <span>燈台文庫 橋i</span>
            <span className="text-[10px] font-bold text-[#2B2520] bg-[#DECFA9] px-1.5 py-0.5 rounded tracking-wide">
              とうだいぶんこ
            </span>
            <span className="text-[#8E8373]">•</span>
            <span className="text-[#DECFA9] font-normal">Windows Panels Hierarchy Explorer</span>
          </span>
        </div>

        {/* Windows title bar action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLeftTree(prev => !prev)}
            className={`p-1 rounded-md text-xs transition ${
              showLeftTree ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
            }`}
            title="Toggle Left Hierarchy Tree"
          >
            {showLeftTree ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowRightPreview(prev => !prev)}
            className={`p-1 rounded-md text-xs transition ${
              showRightPreview ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
            }`}
            title="Toggle Right Preview Pane (Alt+P)"
          >
            {showRightPreview ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
          </button>
          <div className="w-px h-3.5 bg-white/20 mx-1" />
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" title="Firebase Realtime Connected" />
            <span className="text-[11px] font-mono">橋i Cloud Sync</span>
          </div>
        </div>
      </div>

      {/* ── WINDOWS EXPLORER COMMAND RIBBON & ADDRESS BAR ── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Navigation History & Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={handleGoBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleGoUp}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              title="Up one folder"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedNodeId(selectedNodeId)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Breadcrumb address path bar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF6EE] dark:bg-[#1E1A17] border border-[#EAE2D2] dark:border-[#38322B] flex-1 min-w-0 overflow-x-auto no-scrollbar text-xs">
            <HardDrive className="w-3.5 h-3.5 text-[#C88A35] shrink-0" />
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id + idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-[#8E8373] shrink-0" />}
                <button
                  onClick={() => navigateToNode(crumb.id)}
                  className={`hover:underline truncate shrink-0 font-medium ${
                    idx === breadcrumbs.length - 1
                      ? 'text-[#2B2520] dark:text-[#FAF6EE] font-bold'
                      : 'text-[#736859] dark:text-[#A89D8E]'
                  }`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search & Actions Ribbon */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick search input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8E8373] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search in folder..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-xs text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-1 focus:ring-[#C88A35]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8373] hover:text-[#2B2520] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-[#FAF6EE] dark:bg-[#1E1A17] border border-[#EAE2D2] dark:border-[#38322B] rounded-xl p-0.5">
            <button
              onClick={() => setViewStyle('tiles')}
              className={`p-1.5 rounded-lg transition ${
                viewStyle === 'tiles'
                  ? 'bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] shadow-2xs font-bold'
                  : 'text-[#8E8373] hover:text-[#2B2520] dark:hover:text-[#FAF6EE]'
              }`}
              title="Large Tiles / Cover Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewStyle('details')}
              className={`p-1.5 rounded-lg transition ${
                viewStyle === 'details'
                  ? 'bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] shadow-2xs font-bold'
                  : 'text-[#8E8373] hover:text-[#2B2520] dark:hover:text-[#FAF6EE]'
              }`}
              title="Explorer Details List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action: Upload Folder */}
          {currentRole === 'admin' && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white text-xs font-bold shadow-2xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Folders</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3-PANEL EXPLORER WORKSPACE ── */}
      <div className="flex flex-col lg:flex-row min-h-[640px] max-h-[820px] overflow-hidden">
        
        {/* ── LEFT PANEL: HIERARCHY TREE (Windows Explorer Sidebar) ── */}
        {showLeftTree && (
          <aside className="w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-[#FAF9F5] dark:bg-[#0F172A] p-3 overflow-y-auto no-scrollbar shrink-0 select-none text-xs space-y-4">
            
            {/* 1. Quick Access */}
            <div>
              <div
                onClick={() => toggleNode('quick-access')}
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Quick Access</span>
                </div>
                {expandedNodes['quick-access'] ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {expandedNodes['quick-access'] && (
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => navigateToNode('all-books')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                      selectedNodeId === 'all-books'
                        ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold shadow-2xs'
                        : 'text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#EAE2D2]/60 dark:hover:bg-[#2D2823]/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-[#C88A35]" />
                      <span>All Documents</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-mono">({books.length})</span>
                  </button>

                  <button
                    onClick={() => navigateToNode('available-books')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                      selectedNodeId === 'available-books'
                        ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold shadow-2xs'
                        : 'text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#EAE2D2]/60 dark:hover:bg-[#2D2823]/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4A6B53]" />
                      <span>Available (貸出可)</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#4A6B53] font-bold">
                      ({availableCount})
                    </span>
                  </button>

                  <button
                    onClick={() => navigateToNode('borrowed-books')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                      selectedNodeId === 'borrowed-books'
                        ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold shadow-2xs'
                        : 'text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#EAE2D2]/60 dark:hover:bg-[#2D2823]/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#C88A35]" />
                      <span>Borrowed (貸出中)</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold">({borrowedCount})</span>
                  </button>

                  {needsReviewCount > 0 && (
                    <button
                      onClick={() => navigateToNode('needs-review')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                        selectedNodeId === 'needs-review'
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Needs Review</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold">({needsReviewCount})</span>
                    </button>
                  )}

                  {overdueCount > 0 && (
                    <button
                      onClick={() => navigateToNode('overdue-loans')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                        selectedNodeId === 'overdue-loans'
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Overdue (延滞)</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold">({overdueCount})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Topics Library Hierarchy (Windows Category Panels) */}
            <div>
              <div
                onClick={() => toggleNode('topics-root')}
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Topic Library Panels</span>
                </div>
                {expandedNodes['topics-root'] ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {expandedNodes['topics-root'] && (
                <div className="mt-1 space-y-1.5 pl-1.5">
                  
                  {/* AI & Data Domain */}
                  <div>
                    <div
                      onClick={() => toggleNode('ai-group')}
                      className="flex items-center justify-between px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1.5">
                        {expandedNodes['ai-group'] ? (
                          <FolderOpen className="w-3.5 h-3.5 text-[#C88A35]" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-[#C88A35]" />
                        )}
                        <span className="font-semibold text-[11px]">Artificial Intelligence</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 transition ${expandedNodes['ai-group'] ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {expandedNodes['ai-group'] && (
                      <div className="pl-4 space-y-0.5 mt-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                        {categorizedTopics.ai.map(node => (
                          <button
                            key={node.id}
                            onClick={() => navigateToNode(node.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                              selectedNodeId === node.id
                                ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">{node.name}</span>
                            <span className="text-[10px] opacity-75 font-mono ml-1">({node.count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cloud & Infrastructure Domain */}
                  <div>
                    <div
                      onClick={() => toggleNode('cloud-group')}
                      className="flex items-center justify-between px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1.5">
                        {expandedNodes['cloud-group'] ? (
                          <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-sky-500" />
                        )}
                        <span className="font-semibold text-[11px]">Cloud & Infrastructure</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 transition ${expandedNodes['cloud-group'] ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {expandedNodes['cloud-group'] && (
                      <div className="pl-4 space-y-0.5 mt-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                        {categorizedTopics.cloud.map(node => (
                          <button
                            key={node.id}
                            onClick={() => navigateToNode(node.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                              selectedNodeId === node.id
                                ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">{node.name}</span>
                            <span className="text-[10px] opacity-75 font-mono ml-1">({node.count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Engines & Design Domain */}
                  <div>
                    <div
                      onClick={() => toggleNode('engines-group')}
                      className="flex items-center justify-between px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1.5">
                        {expandedNodes['engines-group'] ? (
                          <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span className="font-semibold text-[11px]">Engines & Structural</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 transition ${expandedNodes['engines-group'] ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {expandedNodes['engines-group'] && (
                      <div className="pl-4 space-y-0.5 mt-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                        {categorizedTopics.engines.map(node => (
                          <button
                            key={node.id}
                            onClick={() => navigateToNode(node.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                              selectedNodeId === node.id
                                ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">{node.name}</span>
                            <span className="text-[10px] opacity-75 font-mono ml-1">({node.count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Security & Certs */}
                  <div>
                    <div
                      onClick={() => toggleNode('security-group')}
                      className="flex items-center justify-between px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1.5">
                        {expandedNodes['security-group'] ? (
                          <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span className="font-semibold text-[11px]">Security & CompTIA</span>
                      </div>
                      <ChevronDown
                        className={`w-3 h-3 transition ${expandedNodes['security-group'] ? '' : '-rotate-90'}`}
                      />
                    </div>
                    {expandedNodes['security-group'] && (
                      <div className="pl-4 space-y-0.5 mt-0.5 border-l border-slate-200 dark:border-slate-800 ml-2">
                        {categorizedTopics.security.map(node => (
                          <button
                            key={node.id}
                            onClick={() => navigateToNode(node.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                              selectedNodeId === node.id
                                ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">{node.name}</span>
                            <span className="text-[10px] opacity-75 font-mono ml-1">({node.count})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other / Custom Topics */}
                  {categorizedTopics.other.length > 0 && (
                    <div className="pt-1">
                      {categorizedTopics.other.map(node => (
                        <button
                          key={node.id}
                          onClick={() => navigateToNode(node.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                            selectedNodeId === node.id
                              ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="truncate">{node.name}</span>
                          <span className="text-[10px] opacity-75 font-mono ml-1">({node.count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Uploaded Folder Directory Hierarchy */}
            <div>
              <div
                onClick={() => toggleNode('folders-root')}
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Folder Directory Tree</span>
                </div>
                {expandedNodes['folders-root'] ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {expandedNodes['folders-root'] && (
                <div className="mt-1 space-y-1 pl-1">
                  {folderTree.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-2 py-1 italic">
                      No folder hierarchy yet
                    </p>
                  ) : (
                    folderTree.map(node => (
                      <div key={node.id} className="space-y-0.5">
                        <button
                          onClick={() => navigateToNode(node.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                            selectedNodeId === node.id
                              ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Folder className="w-3 h-3 text-[#C88A35] shrink-0" />
                            <span className="truncate">{node.name}</span>
                          </div>
                          <span className="text-[10px] opacity-75 font-mono shrink-0 ml-1">
                            ({node.count})
                          </span>
                        </button>

                        {/* Render Subfolders */}
                        {node.children && node.children.length > 0 && (
                          <div className="pl-3 border-l border-slate-200 dark:border-slate-800 ml-2 space-y-0.5">
                            {node.children.map(subNode => (
                              <button
                                key={subNode.id}
                                onClick={() => navigateToNode(subNode.id)}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                                  selectedNodeId === subNode.id
                                    ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Folder className="w-2.5 h-2.5 text-[#C88A35] shrink-0" />
                                  <span className="truncate text-[11px]">{subNode.name}</span>
                                </div>
                                <span className="text-[9px] opacity-75 font-mono shrink-0 ml-1">
                                  ({subNode.count})
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 4. Equipment Nodes (Gundam Equipment) */}
            <div>
              <div
                onClick={() => toggleNode('equipment-root')}
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-[#BD3A2B]" />
                  <span>Equipment (Gundams)</span>
                </div>
                {expandedNodes['equipment-root'] ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {expandedNodes['equipment-root'] && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {Object.keys(equipmentLoanCounts).length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-2 py-1 italic">
                      No active equipment loans
                    </p>
                  ) : (
                    Object.entries(equipmentLoanCounts).map(([eqId, data]) => (
                      <button
                        key={eqId}
                        onClick={() => navigateToNode(`eq-${eqId}`)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition ${
                          selectedNodeId === `eq-${eqId}`
                            ? 'bg-[#2B2520] text-[#FAF6EE] dark:bg-[#FAF6EE] dark:text-[#2B2520] font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#BD3A2B]" />
                          <span className="truncate">{data.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#BD3A2B]">
                          {data.count} reading
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

          </aside>
        )}

        {/* ── CENTER PANEL: FILE WORKSPACE (Grid / List of Books) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
          
          {/* Sub-header Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {displayedBooks.length} items
              </span>
              <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />
              {/* Quick status chips */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('available')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    statusFilter === 'available'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => setStatusFilter('borrowed')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition ${
                    statusFilter === 'borrowed'
                      ? 'bg-[#BD3A2B] text-white'
                      : 'text-[#BD3A2B] hover:bg-[#BD3A2B]/10'
                  }`}
                >
                  Borrowed
                </button>
              </div>
            </div>

            {/* Sorting selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#8E8373] text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] text-[#2B2520] dark:text-[#FAF6EE] rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#C88A35]"
              >
                <option value="name">Name</option>
                <option value="author">Author</option>
                <option value="topic">Topic</option>
                <option value="size">File Size</option>
                <option value="date">Date Uploaded</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-1.5 py-1 rounded-lg border border-[#EAE2D2] dark:border-[#38322B] text-[11px] font-mono text-[#5C5348] dark:text-[#DDD3BC] hover:bg-[#F5EFE3] dark:hover:bg-[#201C19]"
                title="Toggle Sort Order"
              >
                {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
              </button>
            </div>
          </div>

          {/* Files container (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayedBooks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Folder className="w-12 h-12 text-[#DECFA9] dark:text-[#38322B] mb-2 stroke-1" />
                <p className="text-sm font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
                  This folder is empty
                </p>
                <p className="text-xs text-[#8E8373] mt-1 max-w-sm">
                  No PDF or Word books match the current filters or folder path.
                </p>
                {currentRole === 'admin' && (
                  <button
                    onClick={onOpenUpload}
                    className="mt-4 px-3.5 py-1.5 rounded-xl bg-[#BD3A2B] text-white text-xs font-bold shadow-2xs hover:bg-[#A83225] transition active:scale-95"
                  >
                    Upload Documents to this Folder
                  </button>
                )}
              </div>
            ) : viewStyle === 'tiles' ? (
              /* ── TILES / LARGE ICONS VIEW (Windows Explorer Style) ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {displayedBooks.map(book => {
                  const isSelected = selectedBookId === book.id;
                  const isWord = book.fileType === 'docx' || book.fileType === 'doc' || book.fileName?.endsWith('.docx');

                  return (
                    <div
                      key={book.id}
                      onClick={() => setSelectedBookId(book.id)}
                      onDoubleClick={() => onViewBookDetails(book)}
                      className={`group relative flex flex-col rounded-2xl p-3 border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-[#C88A35] bg-[#C88A35]/5 dark:bg-[#C88A35]/10 ring-2 ring-[#C88A35]/50 shadow-md'
                          : 'border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] hover:border-[#DECFA9] dark:hover:border-[#5C5348] hover:shadow-2xs'
                      }`}
                    >
                      {/* Cover Thumbnail */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#FAF6EE] dark:bg-[#171513] shadow-xs mb-2.5">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#2B2520] text-[#FAF6EE] p-3 text-center">
                            <BookOpen className="w-8 h-8 text-[#C88A35] mb-2 opacity-80" />
                            <span className="text-[10px] font-bold line-clamp-2">{book.title}</span>
                          </div>
                        )}

                        {/* Format Badge (PDF vs DOCX) */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-white shadow-xs ${
                              isWord ? 'bg-[#185ABD]' : 'bg-[#BD3A2B]'
                            }`}
                          >
                            {isWord ? 'DOCX' : 'PDF'}
                          </span>
                        </div>

                        {/* Status Chip */}
                        <div className="absolute bottom-2 left-2">
                          {book.status === 'available' ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#4A6B53]/95 text-white text-[9px] font-bold shadow-xs">
                              貸出可 Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#2B2520]/90 text-[#DECFA9] text-[9px] font-bold shadow-xs">
                              {book.borrowedByName || 'Borrowed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info Block */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-[#2B2520] dark:text-[#FAF6EE] line-clamp-2 leading-tight mb-1" title={book.title}>
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-[#736859] dark:text-[#A89D8E] truncate">
                            {book.author}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#EAE2D2] dark:border-[#38322B] flex items-center justify-between text-[10px] text-[#8E8373]">
                          <span className="px-1.5 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] font-semibold truncate max-w-[90px]">
                            {book.topic}
                          </span>
                          <span className="font-mono">{formatBytes(book.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── DETAILS TABLE VIEW (Windows Explorer Details List) ── */
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-850 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none">
                      <th className="py-2.5 px-3">Name / Title</th>
                      <th className="py-2.5 px-3">Format</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Primary Topic</th>
                      <th className="py-2.5 px-3">Folder Path</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Size</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedBooks.map(book => {
                      const isSelected = selectedBookId === book.id;
                      const isWord = book.fileType === 'docx' || book.fileType === 'doc';

                      return (
                        <tr
                          key={book.id}
                          onClick={() => setSelectedBookId(book.id)}
                          onDoubleClick={() => onViewBookDetails(book)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-[#C88A35]/10 dark:bg-[#C88A35]/20 font-medium'
                              : 'hover:bg-[#FAF6EE]/50 dark:hover:bg-[#201C19]/50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 max-w-xs sm:max-w-md truncate">
                              <span
                                className={`p-1 rounded text-[10px] font-bold text-white shrink-0 ${
                                  isWord ? 'bg-[#185ABD]' : 'bg-[#BD3A2B]'
                                }`}
                              >
                                {isWord ? 'DOCX' : 'PDF'}
                              </span>
                              <span className="font-semibold text-[#2B2520] dark:text-[#FAF6EE] truncate">
                                {book.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[11px] font-mono text-[#736859]">
                            {isWord ? 'Word' : 'PDF'}
                          </td>
                          <td className="py-2.5 px-3 text-[#5C5348] dark:text-[#DDD3BC] truncate max-w-[140px]">
                            {book.author}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] text-[11px] font-semibold text-[#5C5348] dark:text-[#DDD3BC]">
                              {book.topic}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] font-mono text-[#8E8373] truncate max-w-[150px]">
                            {book.folderPath || 'Root'}
                          </td>
                          <td className="py-2.5 px-3">
                            {book.status === 'available' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A6B53]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B53]" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#BD3A2B]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#BD3A2B]" />
                                {book.borrowedByName || 'On Loan'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[#8E8373]">
                            {formatBytes(book.fileSize)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {book.status === 'available' ? (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onLendBook(book);
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#BD3A2B] hover:bg-[#A83225] text-white text-[10px] font-bold shadow-2xs transition"
                                >
                                  Prestar
                                </button>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onReturnBook(book);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold hover:bg-slate-300"
                                >
                                  Devolver
                                </button>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onViewBookDetails(book);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600"
                                title="View details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: INSPECTOR & PREVIEW PANE (Windows Explorer Preview) ── */}
        {showRightPreview && (
          <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-[#FAF9F5] dark:bg-[#0F172A] p-4 overflow-y-auto no-scrollbar shrink-0 select-none text-xs flex flex-col justify-between">
            {selectedBook ? (
              <div className="space-y-4">
                
                {/* Book Cover Preview */}
                <div className="relative aspect-[3/4] w-48 mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-md">
                  {selectedBook.coverUrl ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#2B2520] text-[#FAF6EE] p-4 text-center">
                      <BookOpen className="w-10 h-10 text-[#C88A35] mb-2" />
                      <span className="text-xs font-bold">{selectedBook.title}</span>
                    </div>
                  )}

                  {/* Document Format Badge */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs ${
                      selectedBook.fileType === 'docx' ? 'bg-[#185ABD]' : 'bg-[#BD3A2B]'
                    }`}
                  >
                    {selectedBook.fileType === 'docx' ? 'WORD DOCX' : 'PDF DOCUMENT'}
                  </span>
                </div>

                {/* Title & Metadata */}
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm text-[#2B2520] dark:text-[#FAF6EE] leading-snug">
                    {selectedBook.title}
                  </h3>
                  <p className="text-xs text-[#736859] dark:text-[#A89D8E] font-medium">
                    著: {selectedBook.author}
                  </p>
                  <p className="text-[10px] text-[#8E8373] font-mono">
                    {selectedBook.fileName || 'document.pdf'}
                  </p>
                </div>

                {/* AI Classification Card */}
                <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-[11px] text-[#2B2520] dark:text-[#FAF6EE]">
                      <Sparkles className="w-3.5 h-3.5 text-[#C88A35]" />
                      <span>Gemini AI Classification</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#171513] text-[#C88A35] border border-[#EAE2D2] dark:border-[#38322B] font-bold">
                      {Math.round((selectedBook.confidence || 0.95) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Primary Topic:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {selectedBook.topic}
                    </span>
                  </div>

                  {selectedBook.subTags && selectedBook.subTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedBook.subTags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedBook.summary && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 leading-relaxed border-t border-slate-100 dark:border-slate-700">
                      {selectedBook.summary}
                    </p>
                  )}
                </div>

                {/* File Properties Table */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Folder Path:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                      {selectedBook.folderPath || 'Root'}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Pages:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {selectedBook.pageCount || 1} pages
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Size:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {formatBytes(selectedBook.fileSize)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Date Added:</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Date(selectedBook.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Lending Status Card */}
                <div
                  className={`p-3 rounded-2xl border ${
                    selectedBook.status === 'available'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Lending Status
                    </span>
                    {selectedBook.status === 'available' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                        貸出可 Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#2B2520] text-[#FAF6EE] font-bold text-[10px]">
                        貸出中 Borrowed
                      </span>
                    )}
                  </div>

                  {selectedBook.status === 'borrowed' && (
                    <div className="text-[11px] space-y-1 mb-3">
                      <div className="flex justify-between">
                        <span className="text-[#8E8373]">Equipo:</span>
                        <span className="font-bold text-[#2B2520] dark:text-[#FAF6EE]">
                          {selectedBook.borrowedByName}
                        </span>
                      </div>
                      {selectedBook.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-[#8E8373]">Due Date:</span>
                          <span className="font-mono font-semibold">
                            {new Date(selectedBook.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Action Button */}
                  <div className="space-y-1.5 pt-1">
                    {selectedBook.status === 'available' ? (
                      <button
                        onClick={() => onLendBook(selectedBook)}
                        className="w-full py-2 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white font-bold text-xs shadow-2xs transition active:scale-95"
                      >
                        Prestar a un Equipo (Lend)
                      </button>
                    ) : (
                      <button
                        onClick={() => onReturnBook(selectedBook)}
                        className="w-full py-2 rounded-xl bg-[#4A6B53] hover:bg-[#3D5A45] text-white font-bold text-xs shadow-2xs transition active:scale-95"
                      >
                        Devolver Libro (Return)
                      </button>
                    )}

                    <button
                      onClick={() => onViewBookDetails(selectedBook)}
                      className="w-full py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                    >
                      Open Document Reader / Details
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <FileText className="w-10 h-10 mb-2 stroke-1" />
                <p className="font-semibold text-xs">No item selected</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Select a book from the center panel to preview its cover and AI metadata.
                </p>
              </div>
            )}
          </aside>
        )}

      </div>

      {/* ── WINDOWS BOTTOM STATUS BAR (Japanese Native Palette) ── */}
      <div className="border-t border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#1E1A17] px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#736859] dark:text-[#A89D8E] select-none gap-2">
        <div className="flex items-center gap-4">
          <span>{displayedBooks.length} items</span>
          {selectedBook && (
            <span>
              1 item selected ({formatBytes(selectedBook.fileSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4A6B53]" />
            <span>貸出可能 (Available): <strong>{availableCount}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#BD3A2B]" />
            <span>貸出中 (Borrowed): <strong>{borrowedCount}</strong></span>
          </span>
          <span className="hidden md:inline font-mono">
            LightHouse 橋i Pipeline
          </span>
        </div>
      </div>

    </div>
  );
};
