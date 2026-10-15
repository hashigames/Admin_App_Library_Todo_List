import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Folder,
  FolderOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  List,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { Book, Language, UploadBatchItem } from '../types';
import { translations } from '../i18n/translations';
import {
  extractDocumentMetadata,
  classifyDocumentWithGemini,
  generateCoverThumbnail,
} from '../services/pdfClassifier';
import { uploadBookPdf } from '../firebase/dataService';

interface BulkUploadViewProps {
  currentLang: Language;
  existingTopics: string[];
  onAddCustomTopic: (newTopic: string) => void;
  onSaveBatchBooks: (books: Book[]) => Promise<void>;
  onNavigateToLibrary: () => void;
}

export const BulkUploadView: React.FC<BulkUploadViewProps> = ({
  currentLang,
  existingTopics,
  onAddCustomTopic,
  onSaveBatchBooks,
  onNavigateToLibrary,
}) => {
  const t = translations[currentLang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [batchItems, setBatchItems] = useState<UploadBatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [saveSuccessCount, setSaveSuccessCount] = useState<number | null>(null);
  const [queueViewMode, setQueueViewMode] = useState<'tree' | 'cards'>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Helper to determine file type
  const getFileType = (fileName: string): 'pdf' | 'docx' | 'doc' | 'other' => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.docx')) return 'docx';
    if (lower.endsWith('.doc')) return 'doc';
    return 'other';
  };

  // Extract relative folder path from File.webkitRelativePath or fallback
  const getFolderPathFromFile = (file: File, fallbackRelativePath?: string): string => {
    if (fallbackRelativePath) {
      const parts = fallbackRelativePath.split('/').filter(Boolean);
      parts.pop(); // remove file name
      return parts.join('/') || 'Root';
    }
    if ((file as any).webkitRelativePath) {
      const parts = (file as any).webkitRelativePath.split('/').filter(Boolean);
      parts.pop();
      return parts.join('/') || 'Root';
    }
    return 'Root';
  };

  // Recursive directory reader for drag-and-drop folders with arbitrary sub-folders
  const readEntryRecursively = async (
    entry: any,
    currentPath: string = ''
  ): Promise<{ file: File; relativePath: string }[]> => {
    const results: { file: File; relativePath: string }[] = [];

    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const fileType = getFileType(file.name);
      if (fileType === 'pdf' || fileType === 'docx' || fileType === 'doc') {
        results.push({
          file,
          relativePath: currentPath ? `${currentPath}/${file.name}` : file.name,
        });
      }
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = async (): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };

      let entries: any[] = [];
      let batch: any[] = [];
      do {
        batch = await readEntries();
        entries = entries.concat(batch);
      } while (batch.length > 0);

      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      for (const child of entries) {
        const childFiles = await readEntryRecursively(child, nextPath);
        results.push(...childFiles);
      }
    }

    return results;
  };

  // Handle files selected via file input
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newItems: UploadBatchItem[] = fileList
      .filter(f => {
        const type = getFileType(f.name);
        return type === 'pdf' || type === 'docx' || type === 'doc';
      })
      .map(file => {
        const folderPath = getFolderPathFromFile(file);
        return {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          relativePath: folderPath !== 'Root' ? `${folderPath}/${file.name}` : file.name,
          fileType: getFileType(file.name),
          progress: 0,
          status: 'pending',
        };
      });

    if (newItems.length === 0) return;

    setBatchItems(prev => [...prev, ...newItems]);
    processQueue(newItems);
  };

  // Handle drag-and-drop of multiple files, multiple folders, or nested subfolders
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const collectedFiles: { file: File; relativePath: string }[] = [];

    if (items && items.length > 0) {
      const entryPromises: Promise<{ file: File; relativePath: string }[]>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            entryPromises.push(readEntryRecursively(entry));
          }
        } else {
          const file = item.getAsFile();
          if (file) {
            const type = getFileType(file.name);
            if (type === 'pdf' || type === 'docx' || type === 'doc') {
              collectedFiles.push({ file, relativePath: file.name });
            }
          }
        }
      }

      const results = await Promise.all(entryPromises);
      results.forEach(res => collectedFiles.push(...res));
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(f => {
        const type = getFileType(f.name);
        if (type === 'pdf' || type === 'docx' || type === 'doc') {
          collectedFiles.push({ file: f, relativePath: f.name });
        }
      });
    }

    if (collectedFiles.length === 0) return;

    const newItems: UploadBatchItem[] = collectedFiles.map(({ file, relativePath }) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      relativePath,
      fileType: getFileType(file.name),
      progress: 0,
      status: 'pending',
    }));

    setBatchItems(prev => [...prev, ...newItems]);
    processQueue(newItems);
  };

  // 1-Click Demo Folder Hierarchy with nested subfolders and both PDF and Word docs
  const handleLoadDemoFolderTree = () => {
    const demoItems: {
      name: string;
      path: string;
      type: 'pdf' | 'docx';
      size: number;
      text: string;
    }[] = [
      {
        name: 'Distributed_Systems_Patterns_2026.pdf',
        path: 'Engineering/Cloud Architecture/Distributed Systems/Distributed_Systems_Patterns_2026.pdf',
        type: 'pdf',
        size: 14200000,
        text: 'Distributed consensus algorithms, Paxos, Raft, event-driven microservices on Google Cloud and Kubernetes.',
      },
      {
        name: 'LLM_FineTuning_LoRA_Guide.docx',
        path: 'Engineering/Artificial Intelligence/Generative AI/LLM_FineTuning_LoRA_Guide.docx',
        type: 'docx',
        size: 8900000,
        text: 'Practical guide to parameter efficient fine tuning LoRA, QLoRA, memory quantization, and RLHF alignment.',
      },
      {
        name: 'Zero_Trust_Network_Architecture.docx',
        path: 'Security/Enterprise Infrastructure/Active Directory/Zero_Trust_Network_Architecture.docx',
        type: 'docx',
        size: 11400000,
        text: 'Implementing beyondcorp zero trust perimeter, mutual TLS, Entra ID conditional access, and Kerberos federation.',
      },
      {
        name: 'Autonomous_Vision_Edge_YOLO.pdf',
        path: 'Engineering/Artificial Intelligence/Computer Vision/Autonomous_Vision_Edge_YOLO.pdf',
        type: 'pdf',
        size: 21500000,
        text: 'Real time visual recognition, spatial point clouds, edge TPU inference, and video object tracking pipeline.',
      },
      {
        name: 'Unreal_Engine_Shaders_Nanite.pdf',
        path: 'Simulation/Game Engines/Unreal Engine/Unreal_Engine_Shaders_Nanite.pdf',
        type: 'pdf',
        size: 32000000,
        text: 'HLSL shader authoring, virtualized micropolygon geometry with Nanite, Lumen global illumination, and runtime performance.',
      },
    ];

    const newItems: UploadBatchItem[] = demoItems.map((item, idx) => {
      // Create a mock File object
      const blob = new Blob([item.text], {
        type: item.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const file = new File([blob], item.name, {
        type: item.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return {
        id: `demo-${Date.now()}-${idx}`,
        file,
        relativePath: item.path,
        fileType: item.type,
        progress: 0,
        status: 'pending',
        extractedText: item.text,
      };
    });

    setBatchItems(prev => [...prev, ...newItems]);
    processQueue(newItems);
  };

  // Process items with AI classification
  const processQueue = async (items: UploadBatchItem[]) => {
    setIsProcessing(true);
    setSaveSuccessCount(null);

    for (const item of items) {
      // Step 1: Extract Document text & metadata
      setBatchItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'extracting', progress: 30 } : i))
      );

      let textSnippet = item.extractedText || '';
      let pageCount = 1;
      let coverDataUrl: string | undefined = undefined;

      try {
        const metadata = await extractDocumentMetadata(item.file);
        textSnippet = metadata.textSnippet || textSnippet;
        pageCount = metadata.pageCount;
        coverDataUrl = metadata.coverDataUrl;
      } catch (err) {
        console.warn('Document extraction warning, using fallback parser:', err);
      }

      // Extract folder path from relativePath
      const folderPath = getFolderPathFromFile(item.file, item.relativePath);

      // Step 2: Gemini AI Classification with folder context
      setBatchItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'classifying', progress: 65 } : i))
      );

      try {
        const classification = await classifyDocumentWithGemini(
          item.file.name,
          textSnippet,
          pageCount,
          folderPath,
          item.fileType,
          existingTopics
        );

        // Generate elegant canvas cover art if none extracted
        if (!coverDataUrl) {
          coverDataUrl = generateCoverThumbnail(
            classification.title,
            classification.author,
            classification.topic,
            classification.subTags,
            item.fileType
          );
        }

        setBatchItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'ready',
                  progress: 100,
                  pageCount,
                  extractedText: textSnippet,
                  coverDataUrl,
                  classifiedData: {
                    ...classification,
                    suggestedFolder: classification.suggestedFolder || folderPath,
                  },
                }
              : i
          )
        );
      } catch (error: any) {
        console.error('Error during AI classification:', error);
        setBatchItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  progress: 100,
                  errorMessage: error.message || 'Classification failed',
                }
              : i
          )
        );
      }
    }

    setIsProcessing(false);
  };

  // Update classification metadata manually (override)
  const handleUpdateItem = (
    itemId: string,
    field: 'title' | 'author' | 'topic' | 'summary',
    value: string
  ) => {
    setBatchItems(prev =>
      prev.map(item => {
        if (item.id !== itemId || !item.classifiedData) return item;
        const updatedClassified = {
          ...item.classifiedData,
          [field]: value,
          needsReview: field === 'topic' ? false : item.classifiedData.needsReview,
        };

        // Re-generate cover thumbnail if title, author, or topic changed
        let newCover = item.coverDataUrl;
        if (field === 'title' || field === 'topic' || field === 'author') {
          newCover = generateCoverThumbnail(
            field === 'title' ? value : item.classifiedData.title,
            field === 'author' ? value : item.classifiedData.author,
            field === 'topic' ? value : item.classifiedData.topic,
            item.classifiedData.subTags,
            item.fileType
          );
        }

        return {
          ...item,
          coverDataUrl: newCover,
          classifiedData: updatedClassified,
        };
      })
    );
  };

  // Remove single item from queue
  const handleRemoveItem = (id: string) => {
    setBatchItems(prev => prev.filter(i => i.id !== id));
  };

  // Commit all ready books to library
  const handleApproveAll = async () => {
    const readyItems = batchItems.filter(i => i.status === 'ready' && i.classifiedData);
    if (readyItems.length === 0) return;

    setIsProcessing(true);

    const booksToSave: Book[] = [];

    for (const item of readyItems) {
      const cls = item.classifiedData!;
      const bookId = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const folderPath = getFolderPathFromFile(item.file, item.relativePath);

      // Upload file to Firebase Storage (or create local blob url)
      const pdfUrl = await uploadBookPdf(item.file, bookId);

      booksToSave.push({
        id: bookId,
        title: cls.title,
        author: cls.author,
        topic: cls.topic,
        subTags: cls.subTags,
        coverUrl: item.coverDataUrl,
        pdfUrl,
        uploadedAt: new Date().toISOString(),
        status: 'available',
        pageCount: item.pageCount || 1,
        summary: cls.summary,
        fileSize: item.file.size,
        fileName: item.file.name,
        folderPath: cls.suggestedFolder || folderPath,
        fileType: item.fileType,
        needsReview: cls.needsReview,
        confidence: cls.confidence,
        loanCount: 0,
      });
    }

    await onSaveBatchBooks(booksToSave);
    setSaveSuccessCount(booksToSave.length);
    setBatchItems([]);
    setIsProcessing(false);
  };

  // Add custom topic
  const handleAddTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicInput.trim()) return;
    onAddCustomTopic(newTopicInput.trim());
    setNewTopicInput('');
    setShowAddTopic(false);
  };

  // Group batch items by their folder path for Windows Hierarchy view
  const batchGroupedByFolder = React.useMemo(() => {
    const map: Record<string, UploadBatchItem[]> = {};
    batchItems.forEach(item => {
      const folder = getFolderPathFromFile(item.file, item.relativePath);
      if (!map[folder]) map[folder] = [];
      map[folder].push(item);
    });
    return map;
  }, [batchItems]);

  const readyCount = batchItems.filter(i => i.status === 'ready').length;
  const needsReviewCount = batchItems.filter(
    i => i.status === 'ready' && i.classifiedData?.needsReview
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#1E2A5E]/10 dark:border-slate-700/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#1E2A5E] text-white">
              <Sparkles className="w-4 h-4 text-[#F5A623]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E2A5E] dark:text-white font-serif-jp">
              {t.bulkUploadTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Upload multiple folders, nested sub-folders, or individual files (PDF & Word DOCX). Gemini AI analyzes content, extracts folder hierarchy, auto-assigns primary topic categories, and suggests folder placement.
          </p>
        </div>

        {/* Custom Category Extension & Demo Folder Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadDemoFolderTree}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition shadow-xs"
            title="Pre-load nested sample folders containing AI, Cloud, Security and Simulation books"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Demo Folder Tree</span>
          </button>

          {showAddTopic ? (
            <form onSubmit={handleAddTopicSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTopicInput}
                onChange={e => setNewTopicInput(e.target.value)}
                placeholder="New Category..."
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#1E2A5E] dark:text-white outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-[#1E2A5E] text-white text-xs font-bold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddTopic(false)}
                className="text-xs text-slate-400"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddTopic(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              <Plus className="w-3.5 h-3.5 text-[#0097B2]" />
              <span>{t.addCustomTopic}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SUCCESS NOTIFICATION BANNER ── */}
      {saveSuccessCount !== null && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">
              Successfully categorized and saved {saveSuccessCount} books to the library hierarchy!
            </span>
          </div>
          <button
            onClick={onNavigateToLibrary}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <span>View in Windows Panels</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── DUAL FOLDER & MULTI-FILE DRAG & DROP ZONE ── */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#0097B2] bg-[#0097B2]/5 scale-[0.99]'
            : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:border-[#1E2A5E] dark:hover:border-amber-400 hover:bg-white dark:hover:bg-slate-800'
        }`}
      >
        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />

        {/* Hidden Folder Directory Picker Input (supports folder containing sub-folders) */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F0] dark:bg-slate-700 flex items-center justify-center text-[#1E2A5E] dark:text-amber-300 shadow-xs">
              <Folder className="w-7 h-7 text-[#F5A623]" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F0] dark:bg-slate-700 flex items-center justify-center text-[#0097B2] shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#1E2A5E] dark:text-white mb-1">
            Drag & Drop Folders or Documents Here
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Drop entire folders (including nested folders and sub-directories) or multiple PDF & Word (.docx) files. The original directory tree will be preserved and classified by Gemini AI.
          </p>

          {/* Action Buttons: Pick Folder vs Pick Files */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white text-xs font-bold shadow-md transition"
            >
              <FolderOpen className="w-4 h-4 text-[#F5A623]" />
              <span>Select Folder Tree (Recursive)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition"
            >
              <FileText className="w-4 h-4 text-[#0097B2]" />
              <span>Select Multiple PDF / Word Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BATCH REVIEW & HIERARCHY CONFIRMATION SECTION ── */}
      {batchItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white flex items-center gap-2">
                <span>{t.aiReviewTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1E2A5E] text-white">
                  {readyCount}/{batchItems.length}
                </span>
                {needsReviewCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{needsReviewCount} Needs Review</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review assigned categories, folder hierarchy, and tags. You can edit any field before saving to the library.
              </p>
            </div>

            {/* Queue View Switcher & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-0.5">
                <button
                  onClick={() => setQueueViewMode('tree')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    queueViewMode === 'tree'
                      ? 'bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Windows Folder Tree Hierarchy"
                >
                  <Folder className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>Folder Tree</span>
                </button>
                <button
                  onClick={() => setQueueViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    queueViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Detailed Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              <button
                onClick={() => setBatchItems([])}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {t.discardBatch}
              </button>

              <button
                onClick={handleApproveAll}
                disabled={isProcessing || readyCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white text-xs font-bold shadow-md disabled:opacity-50 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                <span>{t.approveAndSaveAll} ({readyCount})</span>
              </button>
            </div>
          </div>

          {/* ── QUEUE VIEW 1: WINDOWS HIERARCHY TREE VIEW ── */}
          {queueViewMode === 'tree' ? (
            <div className="space-y-4">
              {Object.entries(batchGroupedByFolder).map(([folderPath, items]) => {
                const folderKey = `fld-${folderPath}`;
                const isExpanded = expandedFolders[folderKey] !== false; // expanded by default

                return (
                  <div
                    key={folderPath}
                    className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                  >
                    {/* Folder Header Banner */}
                    <div
                      onClick={() =>
                        setExpandedFolders(prev => ({ ...prev, [folderKey]: !isExpanded }))
                      }
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 cursor-pointer select-none hover:bg-slate-100/70"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                        <FolderOpen className="w-4 h-4 text-[#F5A623]" />
                        <span>{folderPath}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-sans">
                          {items.length} items
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {items.filter(i => i.status === 'ready').length}/{items.length} classified
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Folder Documents Items */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 p-2">
                        {items.map(item => {
                          const cls = item.classifiedData;
                          const isWord = item.fileType === 'docx' || item.fileType === 'doc';

                          return (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-750/50 rounded-xl transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-100 shrink-0 shadow-xs">
                                  {item.coverDataUrl ? (
                                    <img
                                      src={item.coverDataUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                                      <FileText className="w-5 h-5 animate-pulse" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                                        isWord ? 'bg-[#185ABD]' : 'bg-[#DC2626]'
                                      }`}
                                    >
                                      {isWord ? 'DOCX' : 'PDF'}
                                    </span>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {cls?.title || item.file.name}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    <span>著: {cls?.author || 'Unknown'}</span>
                                    <span>•</span>
                                    <span className="font-mono">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                                  </div>

                                  {/* Progress or status */}
                                  {item.status !== 'ready' && (
                                    <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-[#0097B2] h-full transition-all duration-300"
                                        style={{ width: `${item.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Classification pill & manual override */}
                              <div className="flex items-center gap-3 shrink-0">
                                {cls ? (
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#1E2A5E] text-white text-[11px] font-bold">
                                        {cls.topic}
                                      </span>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {Math.round(cls.confidence * 100)}% match
                                      </div>
                                    </div>

                                    {/* Topic Selector Override */}
                                    <select
                                      value={cls.topic}
                                      onChange={e => handleUpdateItem(item.id, 'topic', e.target.value)}
                                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 outline-none"
                                    >
                                      {existingTopics.map(t => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 animate-pulse">
                                    Analyzing with Gemini AI...
                                  </span>
                                )}

                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                                  title="Remove from queue"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── QUEUE VIEW 2: DETAILED CARDS VIEW ── */
            <div className="space-y-3">
              {batchItems.map(item => {
                const cls = item.classifiedData;
                const isWord = item.fileType === 'docx' || item.fileType === 'doc';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border transition-all ${
                      cls?.needsReview
                        ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      {/* Cover thumbnail */}
                      <div className="w-16 h-22 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative shadow-sm">
                        {item.coverDataUrl ? (
                          <img
                            src={item.coverDataUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileText className="w-6 h-6 animate-pulse" />
                          </div>
                        )}
                        <span
                          className={`absolute top-1 right-1 px-1 rounded text-[8px] font-bold text-white ${
                            isWord ? 'bg-[#185ABD]' : 'bg-[#DC2626]'
                          }`}
                        >
                          {isWord ? 'DOCX' : 'PDF'}
                        </span>
                      </div>

                      {/* Content / Metadata Review */}
                      <div className="flex-1 min-w-0 space-y-2 w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500 truncate max-w-xs">
                              {item.relativePath || item.file.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({(item.file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          </div>

                          {cls && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-500">
                                {t.confidenceScore}:
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  cls.confidence > 0.8
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {Math.round(cls.confidence * 100)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title input */}
                        <div>
                          <input
                            type="text"
                            value={cls?.title || item.file.name}
                            onChange={e => handleUpdateItem(item.id, 'title', e.target.value)}
                            disabled={!cls}
                            placeholder="Book Title"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm font-bold text-[#1E2A5E] dark:text-white outline-none focus:ring-1 focus:ring-[#1E2A5E]"
                          />
                        </div>

                        {/* Topic & Author Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">
                              {t.primaryTopic}
                            </label>
                            <select
                              value={cls?.topic || 'Other'}
                              onChange={e => handleUpdateItem(item.id, 'topic', e.target.value)}
                              disabled={!cls}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-[#1E2A5E] dark:text-white outline-none"
                            >
                              {existingTopics.map(topic => (
                                <option key={topic} value={topic}>
                                  {topic}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">
                              {t.author}
                            </label>
                            <input
                              type="text"
                              value={cls?.author || ''}
                              onChange={e => handleUpdateItem(item.id, 'author', e.target.value)}
                              disabled={!cls}
                              placeholder="Author name"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[#1E2A5E] dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* Sub-tags */}
                        {cls?.subTags && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {cls.subTags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Remove item button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Remove from batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
