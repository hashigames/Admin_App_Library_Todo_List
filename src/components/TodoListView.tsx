import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Table2,
  Plus,
  Trash2,
  Save,
  Mail,
  Smartphone,
  FileSpreadsheet,
  FileText,
  Calendar,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpDown,
  Sparkles,
  Edit2,
  Copy,
  ChevronDown,
  RefreshCw,
  Send,
  X,
  Share2,
  Menu,
  Maximize2,
  Minimize2,
  Link,
  ExternalLink,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { DynamicDatabase, TodoListColumn, TodoListRow, Language } from '../types';
import {
  fetchDynamicDatabases,
  saveDynamicDatabase,
  deleteDynamicDatabase,
  INITIAL_DATABASES,
} from '../firebase/dataService';
import {
  exportDatabaseToExcel,
  exportDatabaseToPdf,
  sendDatabaseEmailApi,
  sendSmsReminderApi,
} from '../services/databaseExporter';
import { CountryPhoneInput } from './CountryPhoneInput';
import { ShareTodoListModal } from './ShareTodoListModal';
import { isUrlColumn, isValidUrl, ensureHttpUrl, getUrlDisplayLabel } from '../utils/urlHelper';
import {
  parseMultipleEmails,
  formatDatabaseTextSummary,
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildWhatsAppUrl,
  buildSmsUrl,
} from '../services/shareUtils';

interface TodoListViewProps {
  currentLang: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUserEmail?: string;
  onOpenHamburger?: () => void;
}

export const TodoListView: React.FC<TodoListViewProps> = ({
  currentLang,
  onShowToast,
  currentUserEmail,
  onOpenHamburger,
}) => {
  const [databases, setDatabases] = useState<DynamicDatabase[]>([]);
  const [activeDbId, setActiveDbId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isRenameColModalOpen, setIsRenameColModalOpen] = useState<boolean>(false);
  const [columnToRename, setColumnToRename] = useState<TodoListColumn | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  const [newColumnType, setNewColumnType] = useState<TodoListColumn['type']>('text');

  // Add Column Modal state
  const [isAddColModalOpen, setIsAddColModalOpen] = useState<boolean>(false);
  const [newAddColName, setNewAddColName] = useState<string>('');
  const [newAddColType, setNewAddColType] = useState<TodoListColumn['type']>('text');

  // URL Format Validation Alert state
  const [urlAlertModal, setUrlAlertModal] = useState<{
    isOpen: boolean;
    rowId: string;
    colId: string;
    columnName: string;
    rowNumber: number;
    enteredValue: string;
  } | null>(null);

  // Active cell tracking
  const [activeCell, setActiveCell] = useState<{ rowId: string; colId: string } | null>(null);

  // New Database form state
  const [newDbForm, setNewDbForm] = useState({
    name: 'Employers_Colombia',
    author: 'Admin Colombia',
    authorEmail: currentUserEmail || 'andreramiers@gmail.com',
    authorPhone: '+57 310 456 7890',
    deadline: '2026-10-30T17:00',
    colCount: 3,
    rowCount: 20,
    columnNames: ['Employee Name', 'Department / City', 'Monthly Salary (COP)'],
    columnTypes: ['text', 'text', 'number'] as Array<TodoListColumn['type']>,
  });

  // Load databases on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const dbs = await fetchDynamicDatabases();
        setDatabases(dbs);
        if (dbs.length > 0) {
          setActiveDbId(dbs[0].id);
        }
      } catch (err) {
        console.error('Failed to load dynamic databases:', err);
        setDatabases(INITIAL_DATABASES);
        setActiveDbId(INITIAL_DATABASES[0].id);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const activeDb = useMemo(() => {
    return databases.find(d => d.id === activeDbId) || databases[0] || null;
  }, [databases, activeDbId]);

  // Update active database locally
  const updateActiveDb = (updater: (prev: DynamicDatabase) => DynamicDatabase) => {
    if (!activeDb) return;
    const updated = updater(activeDb);
    setDatabases(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  };

  // Cell change handler
  const handleCellChange = (rowId: string, colId: string, value: string) => {
    updateActiveDb(prev => ({
      ...prev,
      rows: prev.rows.map(r =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
      ),
    }));
  };

  // Add row
  const handleAddRow = (count = 1) => {
    if (!activeDb) return;
    updateActiveDb(prev => {
      const newRows: TodoListRow[] = [];
      const baseIdx = prev.rows.length + 1;
      for (let i = 0; i < count; i++) {
        const rId = `row_${Date.now()}_${baseIdx + i}_${Math.random().toString(36).substring(2, 6)}`;
        const emptyCells: Record<string, string> = {};
        prev.columns.forEach(col => {
          emptyCells[col.id] = '';
        });
        newRows.push({ id: rId, cells: emptyCells });
      }
      return {
        ...prev,
        rows: [...prev.rows, ...newRows],
      };
    });
    onShowToast(`Added ${count} row(s) to ${activeDb.name}`, 'info');
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    if (!activeDb) return;
    if (activeDb.rows.length <= 1) {
      onShowToast('Database must keep at least 1 row', 'error');
      return;
    }
    updateActiveDb(prev => ({
      ...prev,
      rows: prev.rows.filter(r => r.id !== rowId),
    }));
  };

  // Cell Blur validation
  const handleCellBlur = (rowId: string, col: TodoListColumn, value: string, rIdx: number) => {
    if (!value || !value.trim()) return;

    const isColUrl = isUrlColumn(col);
    if (isColUrl && !isValidUrl(value)) {
      // Trigger user-facing alert
      onShowToast(
        `Validation Alert: "${value}" in column "${col.name}" is not a valid URL format link. Please enter a valid hyperlink URL (e.g., https://example.com).`,
        'error'
      );
      setUrlAlertModal({
        isOpen: true,
        rowId,
        colId: col.id,
        columnName: col.name,
        rowNumber: rIdx + 1,
        enteredValue: value,
      });
    }
  };

  // Open Add Column Modal
  const handleOpenAddColumn = () => {
    if (!activeDb) return;
    setNewAddColName(`Column ${activeDb.columns.length + 1}`);
    setNewAddColType('text');
    setIsAddColModalOpen(true);
  };

  // Add Column Submit
  const handleAddColumnSubmit = () => {
    if (!activeDb) return;
    const colName = newAddColName.trim() || `Column ${activeDb.columns.length + 1}`;
    const newColId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCol: TodoListColumn = {
      id: newColId,
      name: colName,
      type: newAddColType,
      width: newAddColType === 'url' ? 240 : 180,
    };

    updateActiveDb(prev => ({
      ...prev,
      columns: [...prev.columns, newCol],
      rows: prev.rows.map(r => ({
        ...r,
        cells: { ...r.cells, [newColId]: '' },
      })),
    }));

    setIsAddColModalOpen(false);
    onShowToast(`Added column "${colName}" (${(newCol.type || 'text').toUpperCase()})`, 'success');
  };

  // Delete Column
  const handleDeleteColumn = (colId: string) => {
    if (!activeDb) return;
    if (activeDb.columns.length <= 1) {
      onShowToast('Database must keep at least 1 column', 'error');
      return;
    }
    const targetCol = activeDb.columns.find(c => c.id === colId);
    if (!window.confirm(`Delete column "${targetCol?.name || 'this column'}" and all its values?`)) {
      return;
    }

    updateActiveDb(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== colId),
      rows: prev.rows.map(r => {
        const nextCells = { ...r.cells };
        delete nextCells[colId];
        return { ...r, cells: nextCells };
      }),
    }));
  };

  // Rename & Configure Column
  const handleRenameColumnSubmit = () => {
    if (!activeDb || !columnToRename || !newColumnTitle.trim()) return;
    updateActiveDb(prev => ({
      ...prev,
      columns: prev.columns.map(c =>
        c.id === columnToRename.id
          ? {
              ...c,
              name: newColumnTitle.trim(),
              type: newColumnType,
              width: newColumnType === 'url' ? Math.max(c.width || 180, 240) : c.width,
            }
          : c
      ),
    }));
    setIsRenameColModalOpen(false);
    onShowToast(`Updated column "${newColumnTitle.trim()}" (${(newColumnType || 'text').toUpperCase()})`, 'success');
  };

  // Save to Persistent Firebase
  const handleSaveToFirebase = async () => {
    if (!activeDb) return;
    try {
      setIsSaving(true);
      const saved = await saveDynamicDatabase(activeDb, true);
      setDatabases(prev => prev.map(d => (d.id === saved.id ? saved : d)));
      onShowToast(`Database "${activeDb.name}" saved to Persistent Firebase!`, 'success');
    } catch (err: any) {
      console.error('Error saving to Firebase:', err);
      onShowToast('Error saving to Firebase, saved locally', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  // Create New Database Submit
  const handleCreateNewDatabase = async () => {
    if (!newDbForm.name.trim()) {
      onShowToast('Please enter a database name', 'error');
      return;
    }

    const cols: TodoListColumn[] = [];
    for (let c = 0; c < newDbForm.colCount; c++) {
      const colTitle = newDbForm.columnNames[c] || `Column ${c + 1}`;
      const colType =
        newDbForm.columnTypes?.[c] ||
        (colTitle.toLowerCase().includes('url') || colTitle.toLowerCase().includes('link')
          ? 'url'
          : 'text');
      cols.push({
        id: `col_${c + 1}`,
        name: colTitle,
        type: colType,
        width: colType === 'url' ? 240 : 180,
      });
    }

    const rows: TodoListRow[] = [];
    for (let r = 0; r < newDbForm.rowCount; r++) {
      const rowId = `row_${r + 1}`;
      const cells: Record<string, string> = {};
      cols.forEach(col => {
        cells[col.id] = '';
      });
      rows.push({ id: rowId, cells });
    }

    const newDb: DynamicDatabase = {
      id: `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newDbForm.name.trim(),
      author: newDbForm.author.trim() || 'Lighthouse User',
      authorEmail: newDbForm.authorEmail.trim() || '',
      authorPhone: newDbForm.authorPhone.trim() || '',
      deadline: newDbForm.deadline || '',
      columns: cols,
      rows: rows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSavedInFirebase: false,
    };

    // Save and switch
    const saved = await saveDynamicDatabase(newDb, true);
    setDatabases(prev => [saved, ...prev]);
    setActiveDbId(saved.id);
    setIsCreateModalOpen(false);
    setIsShareModalOpen(true);
    onShowToast(`Created new database "${saved.name}" (${cols.length} cols × ${rows.length} rows)! Ready to share.`, 'success');
  };

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!activeDb) return [];
    if (!searchQuery.trim()) return activeDb.rows;
    const q = searchQuery.toLowerCase();
    return activeDb.rows.filter(r => {
      return Object.values(r.cells).some(val => (val || '').toLowerCase().includes(q));
    });
  }, [activeDb, searchQuery]);

  // Quick stats
  const totalCells = (activeDb?.rows.length || 0) * (activeDb?.columns.length || 0);
  const filledCells = activeDb
    ? activeDb.rows.reduce(
        (acc, r) =>
          acc +
          activeDb.columns.filter(c => Boolean(r.cells[c.id] && r.cells[c.id].trim() !== ''))
            .length,
        0
      )
    : 0;

  // Deadline calculation
  const deadlineDate = activeDb?.deadline ? new Date(activeDb.deadline) : null;
  const isOverdue = deadlineDate ? deadlineDate.getTime() < Date.now() : false;

  if (isMinimized) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="p-3 bg-linear-to-r from-[#1E2A5E] to-[#0097B2] text-white rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onOpenHamburger && (
              <button
                onClick={onOpenHamburger}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                title="Open Main Menu Drawer"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <Table2 className="w-4 h-4 text-amber-300" />
            <span className="font-bold text-sm">TodoList Matrix (Minimized)</span>
            {activeDb && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-mono">
                {activeDb.name} ({activeDb.columns.length} cols × {activeDb.rows.length} rows)
              </span>
            )}
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expand Panel</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`transition-all duration-300 ${
        isMaximized
          ? 'fixed inset-0 z-40 bg-[#FAF7F0] dark:bg-[#0B1120] overflow-y-auto p-4 sm:p-8'
          : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'
      } space-y-6`}
    >
      {/* Top Banner / Title Bar */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onOpenHamburger && (
              <button
                onClick={onOpenHamburger}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1E2A5E] dark:text-slate-200 transition mr-1"
                title="Open Main Menu Hamburger Drawer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <span className="p-2 rounded-xl bg-[#1E2A5E] text-white dark:bg-amber-400 dark:text-[#1E2A5E]">
              <Table2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1E2A5E] dark:text-white font-serif-jp">
                  TodoList & Dynamic Tabular Matrix
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Interactive Database
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create custom lists and tabular databases (e.g. Employers_Colombia), edit like Excel, save to Persistent Firebase, and export to Excel/PDF with email alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Database Switcher, Minimize, Maximize & Create New */}
        <div className="flex items-center gap-2 flex-wrap">
          {databases.length > 0 && (
            <div className="relative">
              <select
                value={activeDbId}
                onChange={e => setActiveDbId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[#1E2A5E] dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              >
                {databases.map(d => (
                  <option key={d.id} value={d.id}>
                    📊 {d.name} ({d.columns.length} cols × {d.rows.length} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0097B2] hover:bg-[#008299] text-white shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Database</span>
          </button>

          {/* Panel Minimize / Maximize Buttons */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Minimize Panel"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isMaximized ? 'Restore View' : 'Maximize Panel Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeDb ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Database Metadata Header Card */}
          <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Name, Author, Deadline */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#1E2A5E] dark:text-amber-400" />
                  <input
                    type="text"
                    value={activeDb.name}
                    onChange={e => {
                      const newName = e.target.value;
                      updateActiveDb(prev => ({ ...prev, name: newName }));
                    }}
                    className="text-base font-bold text-[#1E2A5E] dark:text-white bg-transparent border-b border-transparent hover:border-slate-400 focus:border-[#0097B2] focus:outline-none px-1 rounded transition-colors"
                    title="Click to rename database"
                  />
                </div>

                {/* Firebase Persistence Status */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    activeDb.isSavedInFirebase
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {activeDb.isSavedInFirebase ? 'Persistent in Firebase' : 'Local Draft (Unsaved)'}
                </span>

                {/* Deadline pill */}
                {activeDb.deadline && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      isOverdue
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Deadline: {new Date(activeDb.deadline).toLocaleDateString()}{' '}
                    {new Date(activeDb.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isOverdue && ' (Overdue!)'}
                  </span>
                )}
              </div>

              {/* Author & Contact Info */}
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Author:{' '}
                  <input
                    type="text"
                    value={activeDb.author}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, author: val }));
                    }}
                    placeholder="Author name"
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0097B2] text-slate-700 dark:text-slate-200 font-medium focus:outline-none px-1"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={activeDb.authorEmail || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, authorEmail: val }));
                    }}
                    placeholder="Contact Email(s) - comma separated"
                    title="Separate multiple emails with commas (,)"
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0097B2] text-slate-700 dark:text-slate-200 font-medium focus:outline-none px-1 text-xs"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={activeDb.authorPhone || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, authorPhone: val }));
                    }}
                    placeholder="Cellphone / SMS"
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0097B2] text-slate-700 dark:text-slate-200 font-medium focus:outline-none px-1 text-xs"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Deadline:{' '}
                  <input
                    type="datetime-local"
                    value={activeDb.deadline || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, deadline: val }));
                    }}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0097B2] text-slate-700 dark:text-slate-200 font-medium focus:outline-none px-1 text-xs"
                  />
                </span>
              </div>
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Save to Firebase */}
              <button
                onClick={handleSaveToFirebase}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1E2A5E] hover:bg-[#162047] text-white shadow-sm dark:bg-amber-400 dark:text-[#1E2A5E] transition-transform active:scale-95 disabled:opacity-50"
                title="Save database and matrix state into Persistent Firebase"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save to Firebase'}</span>
              </button>

              {/* Share Matrix to Customer / Team (Email & SMS) */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#0097B2] hover:bg-[#008299] text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
                title="Share this TodoList to Customer or Team via Email (multi-recipient, comma-separated) or Cellphone SMS / WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Matrix (Email / SMS)</span>
              </button>

              {/* Direct Excel download */}
              <button
                onClick={() => {
                  exportDatabaseToExcel(activeDb);
                  onShowToast(`Downloaded Excel spreadsheet for "${activeDb.name}"`, 'success');
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Download .xlsx Excel file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              {/* Direct PDF download */}
              <button
                onClick={() => {
                  exportDatabaseToPdf(activeDb);
                  onShowToast(`Downloaded PDF document for "${activeDb.name}"`, 'success');
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                title="Download .pdf Report file"
              >
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>PDF</span>
              </button>

              {/* Delete Database */}
              {databases.length > 1 && (
                <button
                  onClick={async () => {
                    if (window.confirm(`Delete database "${activeDb.name}" permanently?`)) {
                      await deleteDynamicDatabase(activeDb.id);
                      const remaining = databases.filter(d => d.id !== activeDb.id);
                      setDatabases(remaining);
                      setActiveDbId(remaining[0].id);
                      onShowToast(`Deleted database "${activeDb.name}"`, 'info');
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Delete database"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Secondary Ribbon: Matrix Dimension Controls & Search */}
          <div className="p-3 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Dimensions & Add Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Matrix: {activeDb.columns.length} Cols × {activeDb.rows.length} Rows
              </span>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              {/* + Add Column */}
              <button
                onClick={handleOpenAddColumn}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <Plus className="w-3 h-3 text-[#0097B2]" />
                <span>Add Column</span>
              </button>

              {/* + Add Row (Renglón) */}
              <button
                onClick={() => handleAddRow(1)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>Add Row (Renglón)</span>
              </button>

              {/* + Add 5 Rows */}
              <button
                onClick={() => handleAddRow(5)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Add 5 rows at once"
              >
                <span>+5 Rows</span>
              </button>

              {/* + Add 10 Rows */}
              <button
                onClick={() => handleAddRow(10)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Add 10 rows at once"
              >
                <span>+10 Rows</span>
              </button>
            </div>

            {/* In-table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cell values..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0097B2] text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Excel-like Spreadsheet Table */}
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto relative no-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              {/* Sticky Table Header */}
              <thead className="bg-[#FAF7F0] dark:bg-slate-900 sticky top-0 z-20 border-b border-slate-300 dark:border-slate-700 shadow-xs">
                <tr>
                  {/* Row index indicator header */}
                  <th className="w-12 px-2 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 sticky left-0 z-30">
                    #
                  </th>

                  {/* Column Headers */}
                  {activeDb.columns.map((col, cIdx) => {
                    const isColUrl = isUrlColumn(col);
                    return (
                      <th
                        key={col.id}
                        style={{ minWidth: `${col.width || (isColUrl ? 240 : 180)}px` }}
                        className="px-3 py-2 text-xs font-bold text-[#1E2A5E] dark:text-amber-300 border-r border-slate-200 dark:border-slate-800 group relative"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {isColUrl && (
                              <span title="Hyperlink URL Column (Links are clickable)">
                                <Link className="w-3.5 h-3.5 text-[#0097B2] shrink-0" />
                              </span>
                            )}
                            <span className="truncate" title={col.name}>
                              {col.name || `Col ${cIdx + 1}`}
                            </span>
                            {isColUrl && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0097B2]/10 text-[#0097B2] border border-[#0097B2]/30">
                                URL
                              </span>
                            )}
                          </div>

                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setColumnToRename(col);
                                setNewColumnTitle(col.name);
                                setNewColumnType(col.type || (isColUrl ? 'url' : 'text'));
                                setIsRenameColModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-[#0097B2] rounded transition-colors"
                              title="Configure / Rename Column"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {activeDb.columns.length > 1 && (
                              <button
                                onClick={() => handleDeleteColumn(col.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="Delete Column"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Add Column quick button in header */}
                  <th className="w-10 px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                    <button
                      onClick={handleOpenAddColumn}
                      className="p-1 rounded text-slate-400 hover:text-[#0097B2] hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Add another column"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* Table Body (Rows / Renglones) */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredRows.map((row, rIdx) => {
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Row index number & Delete Row */}
                      <td className="px-2 py-1.5 text-center text-[10px] font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 sticky left-0 z-10 group-hover:bg-blue-50 dark:group-hover:bg-slate-800">
                        <div className="flex items-center justify-center relative">
                          <span className="group-hover:hidden">{rIdx + 1}</span>
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="hidden group-hover:inline-flex text-red-500 hover:text-red-700 p-0.5 rounded"
                            title={`Delete Row ${rIdx + 1}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Cell inputs & clickable hyperlinks */}
                      {activeDb.columns.map(col => {
                        const cellVal = row.cells[col.id] || '';
                        const isFocused =
                          activeCell?.rowId === row.id && activeCell?.colId === col.id;
                        const isColUrl = isUrlColumn(col);
                        const hasValue = Boolean(cellVal && cellVal.trim());
                        const isFormatValid = !hasValue || isValidUrl(cellVal);
                        const hasUrlError = isColUrl && hasValue && !isFormatValid;
                        const isClickableUrl =
                          hasValue &&
                          isFormatValid &&
                          (isColUrl ||
                            cellVal.startsWith('http://') ||
                            cellVal.startsWith('https://') ||
                            cellVal.startsWith('www.'));

                        return (
                          <td
                            key={col.id}
                            className={`p-0 border-r border-slate-200 dark:border-slate-800 transition-colors relative ${
                              hasUrlError
                                ? 'ring-2 ring-red-500 bg-red-50/60 dark:bg-red-950/40'
                                : isFocused
                                ? 'ring-2 ring-[#0097B2] ring-inset bg-blue-50/30 dark:bg-blue-950/20'
                                : ''
                            }`}
                          >
                            {isFocused ? (
                              /* Focused Cell: Input with Quick External Link & Validation Warning */
                              <div className="relative flex items-center w-full">
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellVal}
                                  onFocus={() => setActiveCell({ rowId: row.id, colId: col.id })}
                                  onBlur={() => {
                                    handleCellBlur(row.id, col, cellVal, rIdx);
                                    setActiveCell(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleCellBlur(row.id, col, cellVal, rIdx);
                                      setActiveCell(null);
                                    }
                                  }}
                                  onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                  placeholder={isColUrl ? 'https://example.com' : '-'}
                                  className={`w-full px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
                                    isColUrl ? 'font-mono' : ''
                                  }`}
                                />
                                {isClickableUrl && (
                                  <a
                                    href={ensureHttpUrl(cellVal)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onMouseDown={e => e.preventDefault()}
                                    className="mr-2 p-1 text-[#0097B2] hover:text-[#008199] hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition shrink-0"
                                    title={`Test / Open Hyperlink: ${ensureHttpUrl(cellVal)}`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {hasUrlError && (
                                  <button
                                    type="button"
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      handleCellBlur(row.id, col, cellVal, rIdx);
                                    }}
                                    className="mr-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 rounded transition shrink-0"
                                    title="Invalid URL format link! Click to see alert."
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : isClickableUrl ? (
                              /* Not focused & Valid URL: Render as Clickable Hyperlink! */
                              <div
                                onClick={() => setActiveCell({ rowId: row.id, colId: col.id })}
                                className="flex items-center justify-between px-3 py-1.5 group/url cursor-pointer hover:bg-sky-50/60 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                <a
                                  href={ensureHttpUrl(cellVal)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => {
                                    e.stopPropagation();
                                  }}
                                  className="flex items-center gap-1.5 text-xs text-[#0097B2] dark:text-[#38BDF8] hover:text-[#007085] hover:underline font-mono font-medium truncate py-0.5"
                                  title={`Click to open link in new tab: ${ensureHttpUrl(cellVal)}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#0097B2]" />
                                  <span className="truncate">{cellVal}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveCell({ rowId: row.id, colId: col.id });
                                  }}
                                  className="opacity-0 group-hover/url:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
                                  title="Edit cell"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : hasUrlError ? (
                              /* Not focused & Invalid URL format: Warning Display */
                              <div
                                onClick={() => setActiveCell({ rowId: row.id, colId: col.id })}
                                className="flex items-center justify-between px-3 py-2 cursor-pointer text-red-600 dark:text-red-400 font-mono text-xs"
                                title="Invalid URL format link! Click to correct."
                              >
                                <span className="truncate underline decoration-wavy decoration-red-500">
                                  {cellVal}
                                </span>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 ml-1" />
                              </div>
                            ) : (
                              /* Regular cell text */
                              <input
                                type="text"
                                value={cellVal}
                                onFocus={() => setActiveCell({ rowId: row.id, colId: col.id })}
                                onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                placeholder="-"
                                className="w-full px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Empty cell spacer */}
                      <td className="w-10 px-2 border-r border-slate-200 dark:border-slate-800" />
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeDb.columns.length + 2}
                      className="text-center py-12 text-slate-400 text-xs"
                    >
                      No cell values match the filter &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Add Bottom Row Strip */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => handleAddRow(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E2A5E] dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add new row (renglón {activeDb.rows.length + 1})</span>
            </button>

            {/* Matrix completeness stats */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>
                Total cells: <strong className="text-slate-700 dark:text-slate-200">{totalCells}</strong>
              </span>
              <span>
                Filled: <strong className="text-emerald-600">{filledCells}</strong> ({totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0}%)
              </span>
              <span>
                Last edited: {new Date(activeDb.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
          <Table2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Tabular Databases Created Yet
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Create your first tabular database (e.g. Employers_Colombia with 3 columns and 20 rows) to start entering and saving records.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#0097B2] hover:bg-[#008299] text-white"
          >
            Create New Database
          </button>
        </div>
      )}

      {/* MODAL 1: Create New Database Wizard */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#1E2A5E] text-white dark:bg-amber-400 dark:text-[#1E2A5E]">
                  <Database className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1E2A5E] dark:text-white">
                    Create New Dynamic Database (TodoList)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define database name, matrix dimensions, column headers, author, and deadline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Template Presets
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewDbForm({
                      name: 'Employers_Colombia',
                      author: 'Carolina Herrera (HR)',
                      authorEmail: currentUserEmail || 'andreramiers@gmail.com',
                      authorPhone: '+57 310 456 7890',
                      deadline: '2026-10-30T17:00',
                      colCount: 3,
                      rowCount: 20,
                      columnNames: ['Employee Name', 'Department / City', 'Monthly Salary (COP)'],
                      columnTypes: ['text', 'text', 'number'],
                    });
                  }}
                  className="p-2.5 rounded-xl border border-[#0097B2]/40 bg-[#0097B2]/5 hover:bg-[#0097B2]/10 text-left transition-colors"
                >
                  <p className="text-xs font-bold text-[#0097B2]">Employers_Colombia</p>
                  <p className="text-[11px] text-slate-500">3 cols × 20 rows (Employee directory)</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewDbForm({
                      name: 'Engineering_Inspection_Q4',
                      author: 'Lead Architect',
                      authorEmail: currentUserEmail || 'andreramiers@gmail.com',
                      authorPhone: '+57 300 123 4567',
                      deadline: '2026-11-15T12:00',
                      colCount: 4,
                      rowCount: 10,
                      columnNames: ['Asset ID', 'Component', 'Status', 'Inspector Notes'],
                      columnTypes: ['text', 'text', 'status', 'text'],
                    });
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Inspection Matrix
                  </p>
                  <p className="text-[11px] text-slate-500">4 cols × 10 rows (Status audit)</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewDbForm({
                      name: 'Game_Production_Engines',
                      author: 'Lead Producer (Studio Hashi)',
                      authorEmail: currentUserEmail || 'andreramiers@gmail.com',
                      authorPhone: '+57 310 456 7890',
                      deadline: '2026-11-20T18:00',
                      colCount: 4,
                      rowCount: 5,
                      columnNames: [
                        'Game Engine / Platform',
                        'Documentation URL (Hyperlink)',
                        'Graphics API',
                        'Community Portal URL',
                      ],
                      columnTypes: ['text', 'url', 'text', 'url'],
                    });
                  }}
                  className="col-span-2 p-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-left transition-colors"
                >
                  <p className="text-xs font-bold text-[#0097B2] flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    <span>Game_Production_Engines (Hyperlinks & URLs)</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    4 cols × 5 rows (Roblox, Unity, Unreal, Phaser, WebGL with clickable URLs)
                  </p>
                </button>
              </div>
            </div>

            {/* Database Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Database / List Name *
              </label>
              <input
                type="text"
                value={newDbForm.name}
                onChange={e => setNewDbForm({ ...newDbForm, name: e.target.value })}
                placeholder="e.g. Employers_Colombia"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
            </div>

            {/* Author & Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Author (Creator) *
                </label>
                <input
                  type="text"
                  value={newDbForm.author}
                  onChange={e => setNewDbForm({ ...newDbForm, author: e.target.value })}
                  placeholder="e.g. Carolina Herrera"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Author Email(s) (Alerts) - comma separated
                </label>
                <input
                  type="text"
                  value={newDbForm.authorEmail}
                  onChange={e => setNewDbForm({ ...newDbForm, authorEmail: e.target.value })}
                  placeholder="andreramiers@gmail.com, team@company.com"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
                />
              </div>
            </div>

            {/* Cellphone & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Author Cellphone (Indicate Country)
                </label>
                <CountryPhoneInput
                  value={newDbForm.authorPhone}
                  onChange={(fullPhone) => setNewDbForm({ ...newDbForm, authorPhone: fullPhone })}
                  placeholder="310 456 7890"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Deadline / Fecha Límite
                </label>
                <input
                  type="datetime-local"
                  value={newDbForm.deadline}
                  onChange={e => setNewDbForm({ ...newDbForm, deadline: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
                />
              </div>
            </div>

            {/* Matrix Tabular Dimensions: Columns vs. Rows (Renglones) */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Number of Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={newDbForm.colCount}
                  onChange={e => {
                    const c = Math.max(1, Math.min(15, Number(e.target.value) || 1));
                    const cols = [...newDbForm.columnNames];
                    while (cols.length < c) cols.push(`Column ${cols.length + 1}`);
                    setNewDbForm({ ...newDbForm, colCount: c, columnNames: cols.slice(0, c) });
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Rows / Renglones
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={newDbForm.rowCount}
                  onChange={e => {
                    const r = Math.max(1, Math.min(200, Number(e.target.value) || 1));
                    setNewDbForm({ ...newDbForm, rowCount: r });
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Column Names & Types Specification */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Define Column Headers & Types:
                </label>
                <span className="text-[10px] text-slate-400">
                  Select &quot;URL&quot; for clickable web links
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-1.5 max-h-40 overflow-y-auto p-1">
                {Array.from({ length: newDbForm.colCount }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 w-6 shrink-0">C{idx + 1}:</span>
                    <input
                      type="text"
                      value={newDbForm.columnNames[idx] || ''}
                      onChange={e => {
                        const updatedCols = [...newDbForm.columnNames];
                        updatedCols[idx] = e.target.value;
                        const updatedTypes = [...(newDbForm.columnTypes || [])];
                        if (
                          e.target.value.toLowerCase().includes('url') ||
                          e.target.value.toLowerCase().includes('link') ||
                          e.target.value.toLowerCase().includes('web')
                        ) {
                          updatedTypes[idx] = 'url';
                        }
                        setNewDbForm({ ...newDbForm, columnNames: updatedCols, columnTypes: updatedTypes });
                      }}
                      placeholder={`Column ${idx + 1} Name`}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                    <select
                      value={newDbForm.columnTypes?.[idx] || 'text'}
                      onChange={e => {
                        const updatedTypes = [...(newDbForm.columnTypes || [])];
                        updatedTypes[idx] = e.target.value as any;
                        setNewDbForm({ ...newDbForm, columnTypes: updatedTypes });
                      }}
                      className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
                    >
                      <option value="text">Text</option>
                      <option value="url">🔗 URL / Link</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewDatabase}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E2A5E] hover:bg-[#162047] text-white dark:bg-amber-400 dark:text-[#1E2A5E] shadow-sm"
              >
                Create Database Matrix
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 4: Rename & Configure Column Dialog */}
      {isRenameColModalOpen && columnToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#0097B2]" />
                <span>Configure & Rename Column</span>
              </h3>
              <button
                onClick={() => setIsRenameColModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Column Name / Header
              </label>
              <input
                type="text"
                value={newColumnTitle}
                onChange={e => setNewColumnTitle(e.target.value)}
                placeholder="Column Name"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Column Data Type
              </label>
              <select
                value={newColumnType}
                onChange={e => setNewColumnType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              >
                <option value="text">Text (General)</option>
                <option value="url">🔗 URL / Hyperlink (Clickable Web Links)</option>
                <option value="number">Number / Currency</option>
                <option value="date">Date & Time</option>
                <option value="status">Status / Category</option>
              </select>
              {newColumnType === 'url' && (
                <p className="text-[11px] text-[#0097B2] mt-1 font-medium">
                  Cells in this column will be rendered as clickable hyperlinks with URL format validation.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsRenameColModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameColumnSubmit}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#0097B2] text-white rounded-lg hover:bg-[#008299] shadow-xs"
              >
                Save Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Dedicated Share TodoList to Customer (Email / Cellphone with Country Indicator) */}
      <ShareTodoListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        database={activeDb}
        onShowToast={onShowToast}
        currentUserEmail={currentUserEmail}
      />

      {/* MODAL 6: Add Column Dialog */}
      {isAddColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#0097B2]" />
                <span>Add New Column</span>
              </h3>
              <button
                onClick={() => setIsAddColModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Column Name
              </label>
              <input
                type="text"
                value={newAddColName}
                onChange={e => {
                  const val = e.target.value;
                  setNewAddColName(val);
                  if (
                    val.toLowerCase().includes('url') ||
                    val.toLowerCase().includes('link') ||
                    val.toLowerCase().includes('web')
                  ) {
                    setNewAddColType('url');
                  }
                }}
                placeholder="e.g. Documentation URL or Reference Link"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Column Data Type
              </label>
              <select
                value={newAddColType}
                onChange={e => setNewAddColType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              >
                <option value="text">Text (General)</option>
                <option value="url">🔗 URL / Hyperlink (Clickable Web Links)</option>
                <option value="number">Number / Currency</option>
                <option value="date">Date & Time</option>
                <option value="status">Status / Category</option>
              </select>
              {newAddColType === 'url' && (
                <p className="text-[11px] text-[#0097B2] mt-1 font-medium">
                  Enforces valid hyperlink URLs and enables direct click-to-open links.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsAddColModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumnSubmit}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#0097B2] text-white rounded-lg hover:bg-[#008299] shadow-xs"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: URL Format Validation Alert */}
      {urlAlertModal && urlAlertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4">
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  URL Format Validation Alert
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The value in column <strong>&quot;{urlAlertModal.columnName}&quot;</strong> (Row {urlAlertModal.rowNumber}) is not a valid URL format link.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-red-900 dark:text-red-200">Entered Value:</span>
                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-red-600 font-bold border border-red-200 dark:border-red-800">
                  {urlAlertModal.enteredValue}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                It must be a valid hyperlink URL so people can click and open the link:
              </p>
              <ul className="text-xs font-mono text-[#0097B2] space-y-0.5 list-disc pl-4">
                <li>https://create.roblox.com</li>
                <li>https://unity.com</li>
                <li>https://unrealengine.com</li>
                <li>https://example.com/project</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {!urlAlertModal.enteredValue.includes(' ') && urlAlertModal.enteredValue.includes('.') && (
                <button
                  type="button"
                  onClick={() => {
                    const fixed = ensureHttpUrl(urlAlertModal.enteredValue);
                    handleCellChange(urlAlertModal.rowId, urlAlertModal.colId, fixed);
                    setUrlAlertModal(null);
                    onShowToast(`Auto-corrected to "${fixed}"`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0097B2] hover:bg-[#008199] text-white transition"
                >
                  Auto-fix to https://
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveCell({ rowId: urlAlertModal.rowId, colId: urlAlertModal.colId });
                  setUrlAlertModal(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Edit URL
              </button>
              <button
                type="button"
                onClick={() => setUrlAlertModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
