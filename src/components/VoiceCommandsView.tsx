import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Table2,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Send,
  Download,
  Mail,
  Smartphone,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  Database,
  CloudCheck,
  Maximize2,
  Minimize2,
  Menu,
  FileSpreadsheet,
  FileText,
  Clock,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Language,
  Book,
  EquipmentUser,
  DynamicDatabase,
  VoiceTargetCategory,
  VoiceCommandDraft,
} from '../types';
import { saveDatabase } from '../firebase/dataService';
import {
  exportDatabaseToExcel,
  exportDatabaseToPdf,
  exportLibraryToExcel,
  exportLibraryToPdf,
  exportEquipmentToExcel,
  exportEquipmentToPdf,
} from '../services/databaseExporter';
import { VoiceInteractionToolkit } from './VoiceInteractionToolkit';

interface VoiceCommandsViewProps {
  currentLang: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUserEmail?: string;
  onNavigateToTab: (tab: 'todolist' | 'library' | 'equipment') => void;
  onAddBooks: (newBooks: Book[]) => Promise<void>;
  onAddEquipment: (name: string, email?: string, notes?: string) => Promise<void>;
  onOpenHamburger: () => void;
  onOpenResumeModal: (target?: 'todolist' | 'library' | 'equipment' | 'all') => void;
  books: Book[];
  topics: string[];
  equipmentList: EquipmentUser[];
}

export const VoiceCommandsView: React.FC<VoiceCommandsViewProps> = ({
  currentLang,
  onShowToast,
  currentUserEmail,
  onNavigateToTab,
  onAddBooks,
  onAddEquipment,
  onOpenHamburger,
  onOpenResumeModal,
  books,
  topics,
  equipmentList,
}) => {
  // Minimize / Maximize state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Category selection (Organized & separated)
  const [selectedCategory, setSelectedCategory] = useState<VoiceTargetCategory>('todolist');

  // Speech Recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  // TTS Voice Prompt state
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);

  // Review Draft State
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<VoiceCommandDraft | null>(null);
  const [refinementInput, setRefinementInput] = useState<string>('');

  // Execution & Cloud Sync state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [createdResult, setCreatedResult] = useState<{
    category: VoiceTargetCategory;
    name: string;
    details: string;
    savedInFirebase: boolean;
    data?: any;
  } | null>(null);

  // Recording waveform animation
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript.trim()) {
        setTranscriptText(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition warning:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentLang]);

  // Voice speech synthesis helper
  const speakText = (text: string) => {
    if (!isTtsEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Toggle listening
  const handleToggleListening = () => {
    if (!speechSupported) {
      onShowToast(
        'Speech recognition not supported in this browser. Please type your command below.',
        'info'
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setTranscriptText('');
      setRecordingSeconds(0);
      try {
        recognitionRef.current.start();
        setIsListening(true);
        timerRef.current = setInterval(() => {
          setRecordingSeconds(s => s + 1);
        }, 1000);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Preset example click
  const handleApplyPreset = (presetText: string, category: VoiceTargetCategory) => {
    setSelectedCategory(category);
    setTranscriptText(presetText);
    handleParseTranscript(presetText, category);
  };

  // Send voice input to AI Parser for review
  const handleParseTranscript = async (
    textToParse?: string,
    forcedCategory?: VoiceTargetCategory
  ) => {
    const text = textToParse || transcriptText;
    if (!text.trim()) {
      onShowToast('Please speak or type a voice command first.', 'error');
      return;
    }

    setIsParsing(true);
    setCreatedResult(null);

    try {
      const resp = await fetch('/api/parse-voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text.trim(),
          categoryHint: forcedCategory || selectedCategory,
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to parse voice command');
      }

      const draft: VoiceCommandDraft = await resp.json();
      setCurrentDraft(draft);
      setSelectedCategory(draft.targetCategory);

      // AI audio reply
      if (draft.clarificationQuestion) {
        speakText(
          `Command recognized. ${draft.clarificationQuestion}`
        );
      } else {
        speakText(
          `Created draft for ${draft.name}. Please review before executing.`
        );
      }

      onShowToast('Voice command parsed! Please review below before executing.', 'success');
    } catch (err: any) {
      console.error('Error parsing voice command:', err);
      onShowToast(`Parsing error: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Apply refinement to draft
  const handleApplyRefinement = () => {
    if (!refinementInput.trim() || !currentDraft) return;

    const lower = refinementInput.toLowerCase();
    const updated = { ...currentDraft };

    // Check if adding columns
    const colMatch = lower.match(/(?:add|agregar)\s+column[a-z]*\s+([a-zA-Z0-9_\-\s]+)/i);
    if (colMatch && colMatch[1] && updated.columns) {
      const newCol = colMatch[1].trim();
      if (!updated.columns.includes(newCol)) {
        updated.columns.push(newCol);
      }
    }

    // Check if changing author
    const authorMatch = lower.match(/(?:author|autor|creador|by)\s+([a-zA-Z0-9_\-\s]+)/i);
    if (authorMatch && authorMatch[1]) {
      updated.author = authorMatch[1].trim();
    }

    // Check if changing name
    const nameMatch = lower.match(/(?:name|rename|llamar|renombrar)\s+(?:to|a)?\s*([a-zA-Z0-9_\-\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      updated.name = nameMatch[1].trim();
    }

    setCurrentDraft(updated);
    setRefinementInput('');
    speakText('Draft updated with your voice changes.');
    onShowToast('Draft updated with your voice refinements.', 'success');
  };

  // Execute and Save to Persistent Firebase
  const handleExecuteDraft = async () => {
    if (!currentDraft) return;
    setIsExecuting(true);

    try {
      if (currentDraft.targetCategory === 'todolist') {
        // Build dynamic database
        const cols = (currentDraft.columns && currentDraft.columns.length > 0
          ? currentDraft.columns
          : ['Game / Item', 'Category / Engine', 'Platform', 'Status']
        ).map((colName, idx) => ({
          id: `col-${idx + 1}-${colName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: colName,
        }));

        // Build sample rows
        const rows: any[] = [];
        const sampleRowsData = currentDraft.sampleRows || [];

        if (sampleRowsData.length > 0) {
          sampleRowsData.forEach((rowObj, rIdx) => {
            const cells: Record<string, string> = {};
            cols.forEach(col => {
              cells[col.id] = (rowObj as any)[col.name] || '';
            });
            rows.push({
              id: `row-${rIdx + 1}`,
              cells,
            });
          });
        } else {
          // Default empty matrix
          const count = currentDraft.rowCount || 5;
          for (let i = 0; i < count; i++) {
            const cells: Record<string, string> = {};
            cols.forEach(col => {
              cells[col.id] = '';
            });
            rows.push({
              id: `row-${i + 1}`,
              cells,
            });
          }
        }

        const newDb: DynamicDatabase = {
          id: `db-${Date.now()}`,
          name: currentDraft.name || 'Voice Matrix',
          author: currentDraft.author || 'Voice Operator',
          authorEmail: currentUserEmail,
          deadline: currentDraft.deadline,
          columns: cols,
          rows,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSavedInFirebase: true,
          description: `Created via Voice Command: "${currentDraft.transcript}"`,
        };

        await saveDatabase(newDb);

        setCreatedResult({
          category: 'todolist',
          name: newDb.name,
          details: `Matrix created with ${newDb.columns.length} columns and ${newDb.rows.length} rows. Author: ${newDb.author}`,
          savedInFirebase: true,
          data: newDb,
        });

        speakText(
          `TodoList ${newDb.name} has been created and saved to persistent Firebase!`
        );
        onShowToast(
          `TodoList "${newDb.name}" created and saved to Firestore!`,
          'success'
        );
      } else if (currentDraft.targetCategory === 'library') {
        // Create books for library shelf
        const shelfTopic = currentDraft.topic || currentDraft.name || 'Technical Shelf';
        const booksToAdd: Book[] = (currentDraft.books || [
          {
            title: `${shelfTopic} Comprehensive Guide`,
            author: currentDraft.author || 'Senior Architect',
            topic: shelfTopic,
            format: 'pdf',
          },
          {
            title: `${shelfTopic} Production Playbook`,
            author: 'Technical Team',
            topic: shelfTopic,
            format: 'docx',
          },
        ]).map((b, idx) => ({
          id: `book-voice-${Date.now()}-${idx}`,
          title: b.title,
          author: b.author,
          topic: shelfTopic,
          subTags: ['Voice Cataloged', 'Technical Shelf', b.format?.toUpperCase() || 'PDF'],
          confidence: 0.98,
          needsReview: false,
          summary: `Technical reference book for ${shelfTopic} shelf.`,
          fileType: (b.format as any) || 'pdf',
          uploadedAt: new Date().toISOString(),
          status: 'available',
        }));

        await onAddBooks(booksToAdd);

        setCreatedResult({
          category: 'library',
          name: shelfTopic,
          details: `Shelf created with ${booksToAdd.length} technical books cataloged.`,
          savedInFirebase: true,
          data: booksToAdd,
        });

        speakText(
          `Library Shelf ${shelfTopic} created with ${booksToAdd.length} books and saved to Firebase!`
        );
        onShowToast(
          `Library Shelf "${shelfTopic}" created with ${booksToAdd.length} books!`,
          'success'
        );
      } else {
        // Equipment List
        const unitName = currentDraft.name || 'Engineering Team Equipment';
        const members = currentDraft.members || [
          { name: `${unitName} Lead`, role: 'admin', email: 'lead@lighthouse.org' },
          { name: `${unitName} Specialist`, role: 'user', email: 'spec@lighthouse.org' },
        ];

        for (const m of members) {
          await onAddEquipment(
            m.name,
            m.email,
            `Assigned unit for ${unitName} - Role: ${m.role || 'user'}`
          );
        }

        setCreatedResult({
          category: 'equipment',
          name: unitName,
          details: `Created equipment unit with ${members.length} team members.`,
          savedInFirebase: true,
          data: members,
        });

        speakText(
          `Equipment ${unitName} created and saved to persistent Firebase!`
        );
        onShowToast(
          `Equipment unit "${unitName}" created with ${members.length} members!`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      onShowToast(`Failed to execute: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // If Minimized, render compact bar
  if (isMinimized) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="p-3 bg-linear-to-r from-[#1E2A5E] to-[#2A3B82] text-white rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenHamburger}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              title="Open Hamburger Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-red-400" />
              <span className="font-bold text-sm">Voice Commands Panel (Minimized)</span>
            </div>
            {currentDraft && (
              <span className="text-xs bg-[#0097B2] text-white px-2 py-0.5 rounded-md font-medium">
                Draft: {currentDraft.name}
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
      }`}
    >
      <div className="space-y-6">
        {/* Top Panel Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenHamburger}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1E2A5E] dark:text-slate-200 transition"
              title="Open Main Menu Hamburger Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h1 className="text-lg font-bold text-[#1E2A5E] dark:text-slate-100 flex items-center gap-2">
                  <span>Voice Commands & Quick Creation</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  AI Voice Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Input customer voice commands • Review & adjust data draft • Execute & save to Firebase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TTS Voice Audio Toggle */}
            <button
              onClick={() => {
                const next = !isTtsEnabled;
                setIsTtsEnabled(next);
                if (next) speakText('Voice assistance audio enabled');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isTtsEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle AI Voice Audio Prompts"
            >
              {isTtsEnabled ? <Volume2 className="w-4 h-4 text-[#F5A623]" /> : <VolumeX className="w-4 h-4" />}
              <span>{isTtsEnabled ? 'Voice Prompts: ON' : 'Voice: Muted'}</span>
            </button>

            {/* Global Resume Dispatch Modal Trigger */}
            <button
              onClick={() => onOpenResumeModal(selectedCategory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0097B2] hover:bg-[#008199] text-white shadow-xs transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Export & Send Resume</span>
            </button>

            {/* Minimize Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Minimize Panel"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Maximize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isMaximized ? 'Restore View' : 'Maximize Panel Fullscreen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Selector: Organized & Strictly Separated */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Creation Target (Kept Separated & Organized)
            </span>
            <span className="text-xs text-slate-400">
              Library Shelves, Equipment & TodoLists are never mixed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Target 1: TodoList Matrix */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('todolist');
                speakText('Selected TodoList spreadsheet mode');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedCategory === 'todolist'
                  ? 'bg-gradient-to-br from-[#0097B2]/10 to-sky-50 dark:from-[#0097B2]/20 dark:to-slate-900 border-[#0097B2] shadow-md ring-2 ring-[#0097B2]/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#0097B2] text-white">
                  <Table2 className="w-5 h-5" />
                </div>
                {selectedCategory === 'todolist' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0097B2] text-white">
                    Selected
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-[#1E2A5E] dark:text-slate-100">
                TodoList Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Excel-like tabular databases (e.g. Games list for Roblox, Unity, Unreal, Phaser, WebGL)
              </p>
            </button>

            {/* Target 2: Library Shelves */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('library');
                speakText('Selected Library Shelves mode');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedCategory === 'library'
                  ? 'bg-gradient-to-br from-[#1E2A5E]/10 to-indigo-50 dark:from-[#1E2A5E]/20 dark:to-slate-900 border-[#1E2A5E] shadow-md ring-2 ring-[#1E2A5E]/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-[#1E2A5E] text-[#F5A623]">
                  <BookOpen className="w-5 h-5" />
                </div>
                {selectedCategory === 'library' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E2A5E] text-white">
                    Selected
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-[#1E2A5E] dark:text-slate-100">
                Library Shelves
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Organized topic bookshelves, PDF & DOCX technical documents & authors
              </p>
            </button>

            {/* Target 3: Equipment List */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('equipment');
                speakText('Selected Equipment Roster mode');
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedCategory === 'equipment'
                  ? 'bg-gradient-to-br from-emerald-500/10 to-teal-50 dark:from-emerald-950/30 dark:to-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                  <Users className="w-5 h-5" />
                </div>
                {selectedCategory === 'equipment' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Selected
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-[#1E2A5E] dark:text-slate-100">
                Equipment List
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gundam units, engineer roster, device allocation & circulation contacts
              </p>
            </button>
          </div>
        </div>

        {/* Voice Interaction & Browser Compatibility Toolkit */}
        <VoiceInteractionToolkit
          currentLang={currentLang}
          onShowToast={onShowToast}
          onVoiceTestSuccess={(testText) => {
            if (!transcriptText.trim()) {
              setTranscriptText(testText);
            }
          }}
        />

        {/* Voice Input Station */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Giant Microphone Button */}
              <button
                type="button"
                onClick={handleToggleListening}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-400/30'
                    : 'bg-linear-to-r from-[#1E2A5E] to-[#2A3B82] hover:opacity-95 text-white'
                }`}
                title={isListening ? 'Click to Stop Listening' : 'Click to Speak Voice Command'}
              >
                {isListening ? (
                  <MicOff className="w-7 h-7" />
                ) : (
                  <Mic className="w-7 h-7 text-[#F5A623]" />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white animate-ping" />
                )}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-[#1E2A5E] dark:text-white">
                    {isListening ? 'Listening to your voice...' : 'Press Mic & Speak Command'}
                  </span>
                  {isListening && (
                    <span className="text-xs font-mono px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-full font-bold">
                      {recordingSeconds}s
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Speak naturally in English, Spanish, or Japanese. The AI will prompt for missing dimensions.
                </p>
              </div>
            </div>

            {/* Audio Wave Simulator */}
            {isListening && (
              <div className="flex items-center gap-1.5 h-8">
                {[12, 28, 40, 20, 36, 16, 32, 24, 18, 30].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}px` }}
                    className="w-1.5 bg-[#0097B2] rounded-full animate-bounce"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Editable Transcript Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Customer Voice Command Input:</span>
              <span className="text-[11px] text-slate-400">You can also edit or type manually</span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={transcriptText}
                onChange={e => setTranscriptText(e.target.value)}
                placeholder={
                  selectedCategory === 'todolist'
                    ? 'e.g. create a todolist called games to enlist the games for Roblox, Unity, Unreal, Phaser, WebGL with 4 columns and 5 rows'
                    : selectedCategory === 'library'
                    ? 'e.g. create quick Library Shelves for Game Production and 3D Engines with PDF books'
                    : 'e.g. create equipment list for Gundam Strike Team with 4 pilot members'
                }
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
            </div>
          </div>

          {/* Preset Buttons for Quick Testing */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">
              Quick Voice Examples (Click to simulate voice):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'create a todolist called games to enlist the games for Roblox, Unity, Unreal, Phaser, WebGL with 4 columns and 5 rows',
                    'todolist'
                  )
                }
                className="text-xs px-2.5 py-1.5 bg-sky-50 dark:bg-slate-800 text-[#0097B2] border border-[#0097B2]/30 rounded-lg hover:bg-[#0097B2]/10 transition"
              >
                🎮 Games Production Matrix (Roblox, Unity, Unreal, Phaser, WebGL)
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'create a todolist called Employers_Colombia with 3 columns and 20 rows by Maria Gomez deadline in 14 days',
                    'todolist'
                  )
                }
                className="text-xs px-2.5 py-1.5 bg-sky-50 dark:bg-slate-800 text-[#0097B2] border border-[#0097B2]/30 rounded-lg hover:bg-[#0097B2]/10 transition"
              >
                📋 Employers_Colombia (3 cols × 20 rows)
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'create quick Library Shelves for Computer Vision and Generative AI with 4 technical books',
                    'library'
                  )
                }
                className="text-xs px-2.5 py-1.5 bg-indigo-50 dark:bg-slate-800 text-[#1E2A5E] dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
              >
                📚 Computer Vision & GenAI Bookshelf
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'create equipment list for Gundam Strike Squad with 3 pilots and technicians',
                    'equipment'
                  )
                }
                className="text-xs px-2.5 py-1.5 bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition"
              >
                👥 Gundam Strike Squad Roster
              </button>
            </div>
          </div>

          {/* Action to Process Voice */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setTranscriptText('');
                setCurrentDraft(null);
                setCreatedResult(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isParsing || !transcriptText.trim()}
              onClick={() => handleParseTranscript()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#1E2A5E] to-[#0097B2] hover:opacity-95 shadow-md transition disabled:opacity-50 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#F5A623]" />
              <span>{isParsing ? 'AI Parsing Voice Command...' : 'Review Voice Command & Data'}</span>
            </button>
          </div>
        </div>

        {/* STEP 2: REVIEW VOICE COMMAND BEFORE EXECUTING */}
        {currentDraft && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#0097B2] p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0097B2] text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white">
                      Review Voice Command Before Executing
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Step 2: Review & Complete
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify the AI-parsed structure, adjust columns, rows, or author, then click Execute to save into Firebase.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Category:</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-[#1E2A5E] text-white">
                  {currentDraft.targetCategory}
                </span>
              </div>
            </div>

            {/* AI Clarification Prompt if any */}
            {currentDraft.clarificationQuestion && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    AI Question for You:
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    "{currentDraft.clarificationQuestion}"
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
                    You can speak or type your answer below (e.g. "4 columns and 5 rows for games").
                  </p>
                </div>
              </div>
            )}

            {/* Draft Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Target Entity Name:
                </label>
                <input
                  type="text"
                  value={currentDraft.name}
                  onChange={e => setCurrentDraft({ ...currentDraft, name: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-[#1E2A5E] dark:text-slate-100 outline-none"
                />
              </div>

              {currentDraft.targetCategory === 'todolist' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Author / Creator:
                    </label>
                    <input
                      type="text"
                      value={currentDraft.author || ''}
                      onChange={e => setCurrentDraft({ ...currentDraft, author: e.target.value })}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Deadline / Alert Date:
                    </label>
                    <input
                      type="date"
                      value={currentDraft.deadline ? currentDraft.deadline.substring(0, 10) : ''}
                      onChange={e =>
                        setCurrentDraft({
                          ...currentDraft,
                          deadline: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* If TodoList: Column & Row Matrix Visualizer */}
            {currentDraft.targetCategory === 'todolist' && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-[#0097B2]" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Tabular Matrix Dimensions:
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0097B2]/20 text-[#0097B2]">
                      {currentDraft.columns?.length || 0} Columns × {currentDraft.rowCount || currentDraft.sampleRows?.length || 0} Rows
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newCol = prompt('Enter new column name:');
                      if (newCol && currentDraft.columns) {
                        setCurrentDraft({
                          ...currentDraft,
                          columns: [...currentDraft.columns, newCol],
                        });
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#0097B2] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                </div>

                {/* Columns Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Columns:</span>
                  {currentDraft.columns?.map((col, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-xs font-semibold text-[#1E2A5E] dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs"
                    >
                      <span>{col}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentDraft.columns?.filter((_, i) => i !== idx);
                          setCurrentDraft({ ...currentDraft, columns: updated });
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Sample Rows Preview */}
                {currentDraft.sampleRows && currentDraft.sampleRows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          {currentDraft.columns?.map((c, i) => (
                            <th key={i} className="p-2 font-bold whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentDraft.sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b last:border-b-0 dark:border-slate-800">
                            <td className="p-2 text-center text-slate-400 font-mono">{rIdx + 1}</td>
                            {currentDraft.columns?.map((c, cIdx) => (
                              <td key={cIdx} className="p-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                {(row as any)[c] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* If Library Shelves: Book List Preview */}
            {currentDraft.targetCategory === 'library' && currentDraft.books && (
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#F5A623]" />
                  <span>Proposed Books for Shelf "{currentDraft.name}":</span>
                </span>
                <div className="space-y-1.5">
                  {currentDraft.books.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E2A5E] dark:text-slate-100">{b.title}</span>
                        <span className="text-slate-400">by {b.author}</span>
                      </div>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        {b.format || 'pdf'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If Equipment: Members Preview */}
            {currentDraft.targetCategory === 'equipment' && currentDraft.members && (
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Proposed Equipment Unit Members:</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentDraft.members.map((m, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="font-bold text-[#1E2A5E] dark:text-slate-100">{m.name}</div>
                      <div className="text-[11px] text-slate-500">Role: {m.role} • {m.email || 'No email'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Natural Voice Refinement Bar */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Adjust draft: e.g. Add 2 more rows for Roblox, or set author to Carlos..."
                value={refinementInput}
                onChange={e => setRefinementInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyRefinement()}
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none"
              />
              <button
                type="button"
                onClick={handleApplyRefinement}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#1E2A5E] dark:text-slate-200 transition"
              >
                Apply Refinement
              </button>
            </div>

            {/* Primary Execution Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleListening()}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Record Voice</span>
              </button>

              <button
                type="button"
                disabled={isExecuting}
                onClick={handleExecuteDraft}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:opacity-95 shadow-lg shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isExecuting ? 'Creating & Syncing to Firebase...' : '⚡ Execute & Create in Persistent Firebase'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CREATION & FIREBASE SYNC SUCCESS BANNER */}
        {createdResult && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-2 border-emerald-500 shadow-md space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                      Successfully Created & Saved in Firebase!
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" />
                      <span>Persistent Firestore</span>
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {createdResult.details}
                  </p>
                </div>
              </div>

              {/* Direct Jump Button to respective panel */}
              <button
                onClick={() => onNavigateToTab(createdResult.category)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E2A5E] hover:bg-[#2A3B82] shadow-sm transition active:scale-95"
              >
                <span>Open in {createdResult.category.toUpperCase()} Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fast Resume Dispatch Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                Send Resume Report for this new {createdResult.category}:
              </span>
              <button
                onClick={() => onOpenResumeModal(createdResult.category)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-[#0097B2] border border-[#0097B2]/30 shadow-2xs hover:bg-[#0097B2]/10 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send via Email (Excel / PDF)</span>
              </button>

              <button
                onClick={() => onOpenResumeModal(createdResult.category)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-50 transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Send SMS Alert</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
