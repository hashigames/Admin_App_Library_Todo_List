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
  Keyboard,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Columns,
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

  // Keyboard navigation & CRUD instructions modal
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

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

  // Zoom state (percentages: 50%, 65%, 75%, 85%, 100%, 115%, 125%, 150%)
  const [matrixZoom, setMatrixZoom] = useState<number>(100);
  const [columnDensity, setColumnDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');

  // Interactive Column Resizing state
  const [resizingCol, setResizingCol] = useState<{
    colId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Column resize event listeners for drag-to-resize
  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingCol.startX;
      // Allow diminishing column width down to 60px (very compact for multi-column matrices) up to 500px
      const newWidth = Math.max(60, Math.min(500, Math.round(resizingCol.startWidth + deltaX)));

      updateActiveDb(prev => ({
        ...prev,
        columns: prev.columns.map(c =>
          c.id === resizingCol.colId ? { ...c, width: newWidth } : c
        ),
      }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  // Start column resize on drag handle mousedown
  const handleStartResize = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol({
      colId,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setMatrixZoom(prev => Math.min(150, prev + (prev < 100 ? 15 : 25)));
  };

  const handleZoomOut = () => {
    setMatrixZoom(prev => Math.max(50, prev - (prev <= 100 ? 15 : 25)));
  };

  const handleResetZoom = () => {
    setMatrixZoom(100);
  };

  // Auto Fit Full Matrix (calculates ideal zoom to view full matrix on screen)
  const handleFitMatrixToScreen = () => {
    if (!activeDb) return;
    const numCols = activeDb.columns.length;
    if (numCols <= 4) {
      setMatrixZoom(100);
      setColumnDensity('normal');
    } else if (numCols <= 7) {
      setMatrixZoom(85);
      setColumnDensity('compact');
    } else if (numCols <= 10) {
      setMatrixZoom(75);
      setColumnDensity('compact');
    } else if (numCols <= 14) {
      setMatrixZoom(65);
      setColumnDensity('compact');
    } else {
      setMatrixZoom(50);
      setColumnDensity('compact');
    }
    onShowToast(`Auto-fitted ${numCols} columns to screen!`, 'info');
  };

  // Quick diminish / expand all column widths
  const handleToggleColumnDensity = () => {
    if (!activeDb) return;
    if (columnDensity === 'compact') {
      setColumnDensity('normal');
      updateActiveDb(prev => ({
        ...prev,
        columns: prev.columns.map(c => ({
          ...c,
          width: isUrlColumn(c) ? 240 : 170,
        })),
      }));
      onShowToast('Reset columns to standard width (170px)', 'info');
    } else {
      setColumnDensity('compact');
      updateActiveDb(prev => ({
        ...prev,
        columns: prev.columns.map(c => ({
          ...c,
          width: isUrlColumn(c) ? 130 : 95,
        })),
      }));
      onShowToast('Diminished all columns to compact width (95px) to fit full matrix', 'info');
    }
  };

  // Get effective column width
  const getEffectiveColWidth = (col: TodoListColumn) => {
    if (col.width) return col.width;
    const isUrl = isUrlColumn(col);
    if (columnDensity === 'compact') return isUrl ? 130 : 95;
    if (columnDensity === 'spacious') return isUrl ? 280 : 220;
    return isUrl ? 240 : 170;
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
  const handleAddRow = (count = 1, silent = false) => {
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
    if (!silent) {
      onShowToast(`Added ${count} row(s) to ${activeDb.name}`, 'info');
    }
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

  // Focus helper for seamless matrix keyboard navigation
  const focusCell = (targetRowIdx: number, targetColIdx: number) => {
    if (!activeDb) return;
    const targetRow = filteredRows[targetRowIdx];
    const targetCol = activeDb.columns[targetColIdx];
    if (targetRow && targetCol) {
      setActiveCell({ rowId: targetRow.id, colId: targetCol.id });
    }
    setTimeout(() => {
      const el = document.getElementById(`matrix-cell-${targetRowIdx}-${targetColIdx}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }, 25);
  };

  // Matrix cell keydown handler (Tab, Shift+Tab, Arrows, Enter, Escape)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rIdx: number,
    cIdx: number,
    row: TodoListRow,
    col: TodoListColumn
  ) => {
    if (!activeDb) return;
    const numRows = filteredRows.length;
    const numCols = activeDb.columns.length;

    // 1. TAB (Move Column to Column)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Move to previous column
        if (cIdx > 0) {
          focusCell(rIdx, cIdx - 1);
        } else if (rIdx > 0) {
          // Wrap to last column of previous row
          focusCell(rIdx - 1, numCols - 1);
        }
      } else {
        // Tab: Move to next column
        if (cIdx < numCols - 1) {
          focusCell(rIdx, cIdx + 1);
        } else if (rIdx < numRows - 1) {
          // Wrap to first column of next row
          focusCell(rIdx + 1, 0);
        } else {
          // At the very last cell of the table -> Automatically add a new row & focus col 0!
          handleAddRow(1, true);
          setTimeout(() => {
            focusCell(numRows, 0);
          }, 50);
          onShowToast('Auto-expanded matrix with new row (Renglón)', 'info');
        }
      }
      return;
    }

    // 2. ENTER (Move Row to Row in same column, or create row at bottom)
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Enter: Move up in same column
        if (rIdx > 0) {
          focusCell(rIdx - 1, cIdx);
        }
      } else {
        // Enter: Move down in same column
        if (rIdx < numRows - 1) {
          focusCell(rIdx + 1, cIdx);
        } else {
          // At the bottom of the table -> Automatically add a new row & focus same column!
          handleAddRow(1, true);
          setTimeout(() => {
            focusCell(numRows, cIdx);
          }, 50);
          onShowToast('Auto-expanded matrix with new row (Renglón)', 'info');
        }
      }
      return;
    }

    // 3. ARROW KEYS
    // Arrow Up: Move to row above in same column
    if (e.key === 'ArrowUp') {
      if (rIdx > 0) {
        e.preventDefault();
        focusCell(rIdx - 1, cIdx);
      }
      return;
    }

    // Arrow Down: Move to row below in same column
    if (e.key === 'ArrowDown') {
      if (rIdx < numRows - 1) {
        e.preventDefault();
        focusCell(rIdx + 1, cIdx);
      }
      return;
    }

    // Arrow Left: if cursor is at start of input, move to previous column
    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        if (cIdx > 0) {
          e.preventDefault();
          focusCell(rIdx, cIdx - 1);
        } else if (rIdx > 0) {
          e.preventDefault();
          focusCell(rIdx - 1, numCols - 1);
        }
      }
      return;
    }

    // Arrow Right: if cursor is at end of input, move to next column
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        if (cIdx < numCols - 1) {
          e.preventDefault();
          focusCell(rIdx, cIdx + 1);
        } else if (rIdx < numRows - 1) {
          e.preventDefault();
          focusCell(rIdx + 1, 0);
        }
      }
      return;
    }

    // 4. ESCAPE (Blur current cell)
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      setActiveCell(null);
      return;
    }
  };

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
        <div className="p-3 bg-[#2B2520] text-[#FAF6EE] rounded-2xl shadow-md flex items-center justify-between border border-[#DECFA9] dark:border-[#38322B]">
          <div className="flex items-center gap-3">
            {onOpenHamburger && (
              <button
                onClick={onOpenHamburger}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                title="Open Main Menu Drawer"
              >
                <Menu className="w-4 h-4 text-[#C88A35]" />
              </button>
            )}
            <Table2 className="w-4 h-4 text-[#C88A35]" />
            <span className="font-bold text-sm">TodoList Matrix (Minimized)</span>
            {activeDb && (
              <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md font-mono text-[#FAF6EE]">
                {activeDb.name} ({activeDb.columns.length} cols × {activeDb.rows.length} rows)
              </span>
            )}
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition cursor-pointer"
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
          ? 'fixed inset-0 z-40 bg-[#FAF6EE] dark:bg-[#171513] overflow-y-auto p-4 sm:p-8'
          : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'
      } space-y-6`}
    >
      {/* Top Banner / Title Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl p-5 border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onOpenHamburger && (
              <button
                onClick={onOpenHamburger}
                className="p-2 rounded-xl bg-[#F5EFE3] dark:bg-[#2B2520] hover:bg-[#EAE2D2] text-[#2B2520] dark:text-[#FAF6EE] transition mr-1 cursor-pointer"
                title="Open Main Menu Hamburger Drawer"
              >
                <Menu className="w-5 h-5 text-[#C88A35]" />
              </button>
            )}
            <span className="p-2 rounded-xl bg-[#2B2520] text-[#FAF6EE] shadow-2xs">
              <Table2 className="w-5 h-5 text-[#C88A35]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
                  TodoList & Dynamic Tabular Matrix
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4A6B53]/15 text-[#324D3B] dark:bg-[#4A6B53]/30 dark:text-[#7EB38B] border border-[#4A6B53]/40">
                  Interactive Database
                </span>
              </div>
              <p className="text-xs text-[#736859] dark:text-[#A89D8E]">
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
                className="bg-[#F5EFE3] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] text-[#2B2520] dark:text-[#FAF6EE] text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs transition-transform active:scale-95 cursor-pointer"
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
                  <Database className="w-4 h-4 text-[#C88A35]" />
                  <input
                    type="text"
                    value={activeDb.name}
                    onChange={e => {
                      const newName = e.target.value;
                      updateActiveDb(prev => ({ ...prev, name: newName }));
                    }}
                    className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] bg-transparent border-b border-transparent hover:border-[#DECFA9] focus:border-[#C88A35] focus:outline-none px-1 rounded transition-colors"
                    title="Click to rename database"
                  />
                </div>

                {/* Firebase Persistence Status */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    activeDb.isSavedInFirebase
                      ? 'bg-[#4A6B53]/15 text-[#324D3B] dark:bg-[#4A6B53]/30 dark:text-[#7EB38B] border border-[#4A6B53]/40'
                      : 'bg-[#C88A35]/15 text-[#8A5A18] dark:bg-[#C88A35]/30 dark:text-[#DECFA9] border border-[#C88A35]/30'
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
                        ? 'bg-[#BD3A2B]/15 text-[#BD3A2B] dark:text-[#FF8D80] border border-[#BD3A2B]/30'
                        : 'bg-[#C88A35]/15 text-[#8A5A18] dark:text-[#DECFA9] border border-[#C88A35]/30'
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
              <div className="flex items-center gap-4 text-xs text-[#736859] dark:text-[#A89D8E] flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#A89D8E]" />
                  Author:{' '}
                  <input
                    type="text"
                    value={activeDb.author}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, author: val }));
                    }}
                    placeholder="Author name"
                    className="bg-transparent border-b border-transparent hover:border-[#DECFA9] focus:border-[#C88A35] text-[#2B2520] dark:text-[#FAF6EE] font-medium focus:outline-none px-1"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#A89D8E]" />
                  <input
                    type="text"
                    value={activeDb.authorEmail || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, authorEmail: val }));
                    }}
                    placeholder="Contact Email(s) - comma separated"
                    title="Separate multiple emails with commas (,)"
                    className="bg-transparent border-b border-transparent hover:border-[#DECFA9] focus:border-[#C88A35] text-[#2B2520] dark:text-[#FAF6EE] font-medium focus:outline-none px-1 text-xs"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#A89D8E]" />
                  <input
                    type="text"
                    value={activeDb.authorPhone || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, authorPhone: val }));
                    }}
                    placeholder="Cellphone / SMS"
                    className="bg-transparent border-b border-transparent hover:border-[#DECFA9] focus:border-[#C88A35] text-[#2B2520] dark:text-[#FAF6EE] font-medium focus:outline-none px-1 text-xs"
                  />
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#A89D8E]" />
                  Deadline:{' '}
                  <input
                    type="datetime-local"
                    value={activeDb.deadline || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveDb(prev => ({ ...prev, deadline: val }));
                    }}
                    className="bg-transparent border-b border-transparent hover:border-[#DECFA9] focus:border-[#C88A35] text-[#2B2520] dark:text-[#FAF6EE] font-medium focus:outline-none px-1 text-xs"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#2B2520] hover:bg-[#3D352E] text-[#FAF6EE] shadow-sm transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Save database and matrix state into Persistent Firebase"
              >
                <Save className="w-3.5 h-3.5 text-[#C88A35]" />
                <span>{isSaving ? 'Saving...' : 'Save to Firebase'}</span>
              </button>

              {/* Share Matrix to Customer / Team (Email & SMS) */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs transition-transform active:scale-95 cursor-pointer"
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F5EFE3] dark:bg-[#201C19] hover:bg-[#EAE2D2] text-[#2B2520] dark:text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#C88A35]" />
                <span>Add Column</span>
              </button>

              {/* + Add Row (Renglón) */}
              <button
                onClick={() => handleAddRow(1)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F5EFE3] dark:bg-[#201C19] hover:bg-[#EAE2D2] text-[#2B2520] dark:text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#4A6B53]" />
                <span>Add Row (Renglón)</span>
              </button>

              {/* + Add 5 Rows */}
              <button
                onClick={() => handleAddRow(5)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#736859] dark:text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] transition-colors cursor-pointer"
                title="Add 5 rows at once"
              >
                <span>+5 Rows</span>
              </button>

              {/* + Add 10 Rows */}
              <button
                onClick={() => handleAddRow(10)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#736859] dark:text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] transition-colors cursor-pointer"
                title="Add 10 rows at once"
              >
                <span>+10 Rows</span>
              </button>
            </div>

            {/* Matrix Zoom In/Out & Column Diminish Controls */}
            <div className="flex items-center gap-1.5 bg-[#FAF6EE] dark:bg-[#1E1A17] p-1 rounded-xl border border-[#DECFA9] dark:border-[#38322B] flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E] px-1 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-[#C88A35]" />
                <span className="hidden xl:inline">Zoom:</span>
              </span>

              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={matrixZoom <= 50}
                className="p-1 rounded-lg bg-white dark:bg-[#2B2520] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE] border border-[#DECFA9] dark:border-[#4A4135] disabled:opacity-40 transition shadow-2xs cursor-pointer"
                title="Zoom Out (Visualize full matrix with many columns)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Percentage Reset */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#2B2520] text-xs font-mono font-bold text-[#2B2520] dark:text-[#FAF6EE] border border-[#DECFA9] dark:border-[#4A4135] hover:border-[#BD3A2B] transition shadow-2xs cursor-pointer"
                title="Click to reset zoom to 100%"
              >
                {matrixZoom}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={matrixZoom >= 150}
                className="p-1 rounded-lg bg-white dark:bg-[#2B2520] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE] border border-[#DECFA9] dark:border-[#4A4135] disabled:opacity-40 transition shadow-2xs cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[#DECFA9] dark:bg-[#4A4135] mx-0.5" />

              {/* Auto-Fit Full Matrix Button */}
              <button
                type="button"
                onClick={handleFitMatrixToScreen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C88A35]/15 hover:bg-[#C88A35]/25 text-[#8A5A18] dark:text-[#DECFA9] border border-[#C88A35]/30 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                title="Auto-calculate zoom to visualize entire matrix on screen without horizontal scrolling"
              >
                <Maximize2 className="w-3 h-3 text-[#C88A35]" />
                <span>Fit Matrix</span>
              </button>

              {/* Diminish Columns Width Preset */}
              <button
                type="button"
                onClick={handleToggleColumnDensity}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                  columnDensity === 'compact'
                    ? 'bg-[#BD3A2B] text-white border-[#BD3A2B]'
                    : 'bg-white dark:bg-[#2B2520] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE] border-[#DECFA9] dark:border-[#4A4135]'
                }`}
                title={
                  columnDensity === 'compact'
                    ? 'Switch back to standard column widths (170px)'
                    : 'Diminish all columns to compact size (95px) to fit matrices with many columns'
                }
              >
                <Columns className="w-3 h-3" />
                <span>{columnDensity === 'compact' ? 'Reset Widths' : 'Diminish Cols'}</span>
              </button>
            </div>

            {/* In-table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A89D8E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cell values..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] focus:outline-none focus:ring-1 focus:ring-[#C88A35] text-[#2B2520] dark:text-[#FAF6EE]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A89D8E] hover:text-[#2B2520] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ── KEYBOARD NAVIGATION & CRUD INSTRUCTIONS BAR ── */}
          <div className="px-4 py-2.5 bg-[#FAF6EE] dark:bg-[#1C1815] border-b border-[#EAE2D2] dark:border-[#38322B] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-[#BD3A2B] text-xs">
                <Keyboard className="w-4 h-4" />
                <span>Matrix Navigation:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#736859] dark:text-[#A89D8E]">
                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px] text-[#BD3A2B]">Tab</kbd> Next Col
                </span>

                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px] text-[#BD3A2B]">Shift+Tab</kbd> Prev Col
                </span>

                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px] text-[#BD3A2B]">Enter</kbd> / <kbd className="font-mono font-bold text-[10px]">↓</kbd> Next Row
                </span>

                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px] text-[#BD3A2B]">Shift+Enter</kbd> / <kbd className="font-mono font-bold text-[10px]">↑</kbd> Prev Row
                </span>

                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px]">←</kbd> <kbd className="font-mono font-bold text-[10px]">→</kbd> Cell Move
                </span>

                <span className="inline-flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#25201C] px-2 py-0.5 rounded-lg border border-[#DECFA9] dark:border-[#4A4135] shadow-2xs font-medium text-[#2B2520] dark:text-[#FAF6EE]">
                  <kbd className="font-mono font-bold text-[10px]">Esc</kbd> Exit
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-[11px] text-[#8A5A18] dark:text-[#DECFA9] font-medium bg-[#F5EFE3] dark:bg-[#2B2520] px-2 py-0.5 rounded-md border border-[#DECFA9]/50 dark:border-[#4A4135]">
                💡 Tab on last cell auto-creates new row
              </span>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#BD3A2B] hover:text-[#A83225] hover:underline cursor-pointer"
                title="View full matrix navigation & CRUD instructions"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>CRUD Instructions</span>
              </button>
            </div>
          </div>

          {/* Interactive Excel-like Spreadsheet Table */}
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto relative no-scrollbar">
            <div
              style={{ zoom: `${matrixZoom}%` }}
              className="min-w-full inline-block align-top transition-all origin-top-left"
            >
              <table className="w-full border-collapse text-left text-xs">
                {/* Sticky Table Header */}
                <thead className="bg-[#FAF6EE] dark:bg-[#171513] sticky top-0 z-20 border-b border-[#DECFA9] dark:border-[#38322B] shadow-2xs">
                  <tr>
                    {/* Row index indicator header */}
                    <th className="w-12 px-2 py-2.5 text-center text-[10px] font-bold text-[#A89D8E] uppercase tracking-wider border-r border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#201C19] sticky left-0 z-30">
                      #
                    </th>

                    {/* Column Headers with Interactive Resize Divider */}
                    {activeDb.columns.map((col, cIdx) => {
                      const isColUrl = isUrlColumn(col);
                      const colWidth = getEffectiveColWidth(col);
                      return (
                        <th
                          key={col.id}
                          style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                          className="px-3 py-2 text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE] border-r border-[#EAE2D2] dark:border-[#38322B] group relative select-none"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              {isColUrl && (
                                <span title="Hyperlink URL Column (Links are clickable)">
                                  <Link className="w-3.5 h-3.5 text-[#C88A35] shrink-0" />
                                </span>
                              )}
                              <span className="truncate" title={col.name}>
                                {col.name || `Col ${cIdx + 1}`}
                              </span>
                              {isColUrl && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C88A35]/15 text-[#8A5A18] dark:text-[#DECFA9] border border-[#C88A35]/30">
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
                                className="p-1 text-[#A89D8E] hover:text-[#C88A35] rounded transition-colors cursor-pointer"
                                title="Configure / Rename Column"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {activeDb.columns.length > 1 && (
                                <button
                                  onClick={() => handleDeleteColumn(col.id)}
                                  className="p-1 text-[#A89D8E] hover:text-[#BD3A2B] rounded transition-colors cursor-pointer"
                                  title="Delete Column"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Interactive Column Divider Resize Handle (drag to diminish / expand width) */}
                          <div
                            onMouseDown={e => handleStartResize(e, col.id, colWidth)}
                            onDoubleClick={() => {
                              updateActiveDb(prev => ({
                                ...prev,
                                columns: prev.columns.map(c =>
                                  c.id === col.id ? { ...c, width: undefined } : c
                                ),
                              }));
                              onShowToast(`Reset "${col.name}" to default width`, 'info');
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#C88A35] active:bg-[#BD3A2B] z-30 flex items-center justify-center group/divider"
                            title="Drag to diminish or expand column width. Double-click to reset."
                          >
                            <div className="w-0.5 h-3.5 bg-transparent group-hover/divider:bg-white" />
                          </div>
                        </th>
                      );
                    })}

                  {/* Add Column quick button in header */}
                  <th className="w-10 px-2 py-2 text-center border-r border-[#EAE2D2] dark:border-[#38322B]">
                    <button
                      onClick={handleOpenAddColumn}
                      className="p-1 rounded text-[#A89D8E] hover:text-[#C88A35] hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] transition-colors cursor-pointer"
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
                      {activeDb.columns.map((col, cIdx) => {
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

                        const colWidth = getEffectiveColWidth(col);
                        return (
                          <td
                            key={col.id}
                            style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                            className={`p-0 border-r border-[#EAE2D2] dark:border-[#38322B] transition-colors relative ${
                              hasUrlError
                                ? 'ring-2 ring-[#BD3A2B] bg-[#BD3A2B]/10'
                                : isFocused
                                ? 'ring-2 ring-[#C88A35] ring-inset bg-[#FAF6EE] dark:bg-[#171513]'
                                : ''
                            }`}
                          >
                            <div className="relative flex items-center w-full group/cell">
                              <input
                                id={`matrix-cell-${rIdx}-${cIdx}`}
                                type="text"
                                value={cellVal}
                                onFocus={() => setActiveCell({ rowId: row.id, colId: col.id })}
                                onBlur={() => {
                                  handleCellBlur(row.id, col, cellVal, rIdx);
                                }}
                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx, row, col)}
                                onChange={e => handleCellChange(row.id, col.id, e.target.value)}
                                placeholder={isColUrl ? 'https://example.com' : '-'}
                                className={`w-full px-3 py-2 text-xs text-[#2B2520] dark:text-[#FAF6EE] bg-transparent focus:outline-none placeholder:text-[#A89D8E] ${
                                  isColUrl ? 'font-mono' : ''
                                } ${isClickableUrl && !isFocused ? 'text-[#C88A35] font-medium underline decoration-dotted' : ''}`}
                              />
                              {isClickableUrl && (
                                <a
                                  href={ensureHttpUrl(cellVal)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  tabIndex={-1}
                                  onMouseDown={e => e.preventDefault()}
                                  className={`mr-2 p-1 text-[#C88A35] hover:text-[#BD3A2B] hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] rounded transition shrink-0 cursor-pointer ${
                                    isFocused ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'
                                  }`}
                                  title={`Open Hyperlink: ${ensureHttpUrl(cellVal)}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {hasUrlError && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    handleCellBlur(row.id, col, cellVal, rIdx);
                                  }}
                                  className="mr-2 p-1 text-[#BD3A2B] hover:bg-[#BD3A2B]/10 rounded transition shrink-0 cursor-pointer"
                                  title="Invalid URL format link! Click to see alert."
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
          </div>

          {/* Quick Add Bottom Row Strip */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => handleAddRow(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2B2520] dark:text-[#FAF6EE] hover:bg-[#EAE2D2] dark:hover:bg-[#38322B] transition-colors"
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
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs cursor-pointer"
          >
            Create New Database
          </button>
        </div>
      )}

      {/* MODAL 1: Create New Database Wizard */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#2B2520] text-[#FAF6EE]">
                  <Database className="w-4 h-4 text-[#C88A35]" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
                    Create New Dynamic Database (TodoList)
                  </h3>
                  <p className="text-xs text-[#736859] dark:text-[#A89D8E]">
                    Define database name, matrix dimensions, column headers, author, and deadline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E]">
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
                  className="p-2.5 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#171513] hover:bg-[#EAE2D2] text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE]">Employers_Colombia</p>
                  <p className="text-[11px] text-[#736859] dark:text-[#A89D8E]">3 cols × 20 rows (Employee directory)</p>
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
                  className="p-2.5 rounded-xl border border-[#DECFA9] dark:border-[#38322B] hover:bg-[#F5EFE3] dark:hover:bg-[#171513] text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE]">
                    Inspection Matrix
                  </p>
                  <p className="text-[11px] text-[#736859] dark:text-[#A89D8E]">4 cols × 10 rows (Status audit)</p>
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
                  className="col-span-2 p-2.5 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#171513] hover:bg-[#EAE2D2] text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-[#C88A35] flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    <span>Game_Production_Engines (Hyperlinks & URLs)</span>
                  </p>
                  <p className="text-[11px] text-[#736859] dark:text-[#A89D8E]">
                    4 cols × 5 rows (Roblox, Unity, Unreal, Phaser, WebGL with clickable URLs)
                  </p>
                </button>
              </div>
            </div>

            {/* Database Name */}
            <div>
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                Database / List Name *
              </label>
              <input
                type="text"
                value={newDbForm.name}
                onChange={e => setNewDbForm({ ...newDbForm, name: e.target.value })}
                placeholder="e.g. Employers_Colombia"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />
            </div>

            {/* Author & Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                  Author (Creator) *
                </label>
                <input
                  type="text"
                  value={newDbForm.author}
                  onChange={e => setNewDbForm({ ...newDbForm, author: e.target.value })}
                  placeholder="e.g. Carolina Herrera"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                  Author Email(s) (Alerts) - comma separated
                </label>
                <input
                  type="text"
                  value={newDbForm.authorEmail}
                  onChange={e => setNewDbForm({ ...newDbForm, authorEmail: e.target.value })}
                  placeholder="andreramiers@gmail.com, team@company.com"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
                />
              </div>
            </div>

            {/* Cellphone & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                  Author Cellphone (Indicate Country)
                </label>
                <CountryPhoneInput
                  value={newDbForm.authorPhone}
                  onChange={(fullPhone) => setNewDbForm({ ...newDbForm, authorPhone: fullPhone })}
                  placeholder="310 456 7890"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                  Deadline / Fecha Límite
                </label>
                <input
                  type="datetime-local"
                  value={newDbForm.deadline}
                  onChange={e => setNewDbForm({ ...newDbForm, deadline: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-xs transition active:scale-95"
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
          <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DECFA9] dark:border-[#38322B] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-2">
              <h3 className="text-sm font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 font-serif-jp">
                <Edit2 className="w-4 h-4 text-[#C88A35]" />
                <span>Configure & Rename Column</span>
              </h3>
              <button
                onClick={() => setIsRenameColModalOpen(false)}
                className="text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                Column Name / Header
              </label>
              <input
                type="text"
                value={newColumnTitle}
                onChange={e => setNewColumnTitle(e.target.value)}
                placeholder="Column Name"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                Column Data Type
              </label>
              <select
                value={newColumnType}
                onChange={e => setNewColumnType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              >
                <option value="text">Text (General)</option>
                <option value="url">🔗 URL / Hyperlink (Clickable Web Links)</option>
                <option value="number">Number / Currency</option>
                <option value="date">Date & Time</option>
                <option value="status">Status / Category</option>
              </select>
              {newColumnType === 'url' && (
                <p className="text-[11px] text-[#C88A35] mt-1 font-medium">
                  Cells in this column will be rendered as clickable hyperlinks with URL format validation.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
              <button
                onClick={() => setIsRenameColModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#736859] hover:text-[#2B2520] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameColumnSubmit}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#BD3A2B] text-white rounded-lg hover:bg-[#A83225] shadow-2xs cursor-pointer"
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
          <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DECFA9] dark:border-[#38322B] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-2">
              <h3 className="text-sm font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 font-serif-jp">
                <Plus className="w-4 h-4 text-[#C88A35]" />
                <span>Add New Column</span>
              </h3>
              <button
                onClick={() => setIsAddColModalOpen(false)}
                className="text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
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
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E]">
                Column Data Type
              </label>
              <select
                value={newAddColType}
                onChange={e => setNewAddColType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              >
                <option value="text">Text (General)</option>
                <option value="url">🔗 URL / Hyperlink (Clickable Web Links)</option>
                <option value="number">Number / Currency</option>
                <option value="date">Date & Time</option>
                <option value="status">Status / Category</option>
              </select>
              {newAddColType === 'url' && (
                <p className="text-[11px] text-[#C88A35] mt-1 font-medium">
                  Enforces valid hyperlink URLs and enables direct click-to-open links.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
              <button
                onClick={() => setIsAddColModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#736859] hover:text-[#2B2520] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumnSubmit}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#BD3A2B] text-white rounded-lg hover:bg-[#A83225] shadow-2xs cursor-pointer"
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
          <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#BD3A2B]/40 space-y-4">
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-xl bg-[#BD3A2B]/15 text-[#BD3A2B] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
                  URL Format Validation Alert
                </h3>
                <p className="text-xs text-[#736859] dark:text-[#A89D8E] mt-0.5">
                  The value in column <strong>&quot;{urlAlertModal.columnName}&quot;</strong> (Row {urlAlertModal.rowNumber}) is not a valid URL format link.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#BD3A2B]/10 dark:bg-[#BD3A2B]/20 rounded-xl border border-[#BD3A2B]/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#BD3A2B] dark:text-[#FF8D80]">Entered Value:</span>
                <span className="font-mono bg-[#FFFFFF] dark:bg-[#171513] px-2 py-0.5 rounded text-[#BD3A2B] font-bold border border-[#BD3A2B]/30">
                  {urlAlertModal.enteredValue}
                </span>
              </div>
              <p className="text-xs text-[#5C5348] dark:text-[#DECFA9]">
                It must be a valid hyperlink URL so people can click and open the link:
              </p>
              <ul className="text-xs font-mono text-[#C88A35] space-y-0.5 list-disc pl-4">
                <li>https://create.roblox.com</li>
                <li>https://unity.com</li>
                <li>https://unrealengine.com</li>
                <li>https://example.com/project</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
              {!urlAlertModal.enteredValue.includes(' ') && urlAlertModal.enteredValue.includes('.') && (
                <button
                  type="button"
                  onClick={() => {
                    const fixed = ensureHttpUrl(urlAlertModal.enteredValue);
                    handleCellChange(urlAlertModal.rowId, urlAlertModal.colId, fixed);
                    setUrlAlertModal(null);
                    onShowToast(`Auto-corrected to "${fixed}"`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C88A35] hover:bg-[#B3792A] text-white transition shadow-2xs cursor-pointer"
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

      {/* MODAL 8: Matrix Keyboard Navigation & CRUD Instructions Dialog */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#DECFA9] dark:border-[#38322B] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#BD3A2B] text-white">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
                    Matrix Navigation &amp; CRUD Instructions
                  </h3>
                  <p className="text-xs text-[#736859] dark:text-[#A89D8E]">
                    Fast keyboard shortcuts to accelerate matrix creation and editing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 rounded-lg text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {/* Section 1: Fluid Keyboard Navigation */}
              <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] space-y-2.5">
                <h4 className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Column-to-Column &amp; Row Shortcuts</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Move to next column:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold text-[#BD3A2B] border border-[#DECFA9]">Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Move to prev column:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold text-[#BD3A2B] border border-[#DECFA9]">Shift + Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Move to row below:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold text-[#BD3A2B] border border-[#DECFA9]">Enter / ↓</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Move to row above:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold text-[#BD3A2B] border border-[#DECFA9]">Shift+Enter / ↑</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Navigate inside cell/col:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold border border-[#DECFA9]">←  →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B]">
                    <span className="text-[#736859] dark:text-[#A89D8E]">Deselect / blur cell:</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#FAF6EE] dark:bg-[#2B2520] font-mono font-bold border border-[#DECFA9]">Esc</kbd>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#C88A35]/10 border border-[#C88A35]/30 text-[11px] text-[#8A5A18] dark:text-[#DECFA9]">
                  ⚡ <strong>Auto-Expansion:</strong> Pressing <strong>Tab</strong> on the last cell of any matrix automatically creates a new row (renglón) and moves your cursor to Column 1!
                </div>
              </div>

              {/* Section 2: Matrix CRUD Guide */}
              <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] space-y-2">
                <h4 className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Database className="w-3.5 h-3.5 text-[#BD3A2B]" />
                  <span>Matrix CRUD Operations (Create, Read, Update, Delete)</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-[#5C5348] dark:text-[#D5CCA8] list-disc pl-4">
                  <li><strong>Create:</strong> Click <em>&quot;+ Add Database&quot;</em> in the sidebar or use <em>&quot;+ Add Row&quot;</em> / <em>&quot;+ Add Column&quot;</em> to dynamically construct tables.</li>
                  <li><strong>Read:</strong> Filter any text instantly across columns and rows with the search bar.</li>
                  <li><strong>Update:</strong> Click or Tab into any cell to edit values inline. Hyperlinks display clickable icons with automatic URL validation.</li>
                  <li><strong>Delete:</strong> Hover over the row index number <code>#</code> on the left to reveal the red trash icon and delete any row. Click column headers to configure or delete columns.</li>
                </ul>
              </div>

              {/* Section 3: Column Resizing & Zoom (Excel-style) */}
              <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#EAE2D2] dark:border-[#38322B] space-y-2.5">
                <h4 className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <ZoomIn className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Column Resizing &amp; Matrix Zoom Controls</span>
                </h4>
                <div className="space-y-2 text-[11px] text-[#5C5348] dark:text-[#D5CCA8]">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#BD3A2B] shrink-0">↔ Resize / Diminish Columns:</span>
                    <span>Hover over any column divider line in the header and drag left or right to diminish (shrink) or expand column width. Double-click the divider to reset to default.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#C88A35] shrink-0">🔍 Zoom In &amp; Out (50% - 150%):</span>
                    <span>Use the <strong>[-]</strong> and <strong>[+]</strong> zoom buttons in the top bar to scale wide matrices down so all columns fit within view at once. Click the % badge to reset to 100%.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#2B2520] dark:text-[#FAF6EE] shrink-0">📐 Fit Matrix:</span>
                    <span>Click <strong>&quot;Fit Matrix&quot;</strong> to automatically calculate the optimal zoom percentage based on your matrix column count so the entire table fits your screen.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#736859] dark:text-[#A89D8E] shrink-0">📦 Diminish Cols:</span>
                    <span>Toggle <strong>&quot;Diminish Cols&quot;</strong> to instantly compress all column widths to a compact 95px size for dense multi-column inspection.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-xs transition cursor-pointer"
              >
                Got It, Start Navigating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
