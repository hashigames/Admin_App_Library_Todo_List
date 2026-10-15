import React from 'react';
import {
  X,
  BookOpen,
  Activity,
  UploadCloud,
  Users,
  Table2,
  Mic,
  Bot,
  Settings,
  Share2,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Shield,
  Laptop,
} from 'lucide-react';
import { TabKey } from './NavigationTabs';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface HamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  currentLang: Language;
  booksCount: number;
  equipmentCount: number;
  loansCount: number;
  todoListsCount: number;
  isFirebaseLive: boolean;
  onOpenResumeModal: (target?: 'todolist' | 'library' | 'equipment' | 'all') => void;
  isPanelMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const HamburgerDrawer: React.FC<HamburgerDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentLang,
  booksCount,
  equipmentCount,
  loansCount,
  todoListsCount,
  isFirebaseLive,
  onOpenResumeModal,
  isPanelMaximized = false,
  onToggleMaximize,
}) => {
  if (!isOpen) return null;
  const t = translations[currentLang];

  const panelItems: {
    key: TabKey;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    count?: number;
    badgeColor?: string;
    targetForResume?: 'todolist' | 'library' | 'equipment' | 'all';
  }[] = [
    {
      key: 'library',
      title: t.navLibrary,
      subtitle: 'Hierarchical Windows Panels & Shelves',
      icon: <BookOpen className="w-5 h-5 text-[#F5A623]" />,
      count: booksCount,
      badgeColor: 'bg-[#1E2A5E] text-white',
      targetForResume: 'library',
    },
    {
      key: 'todolist',
      title: 'TodoList Matrix',
      subtitle: 'Tabular Excel-like Databases & Deadlines',
      icon: <Table2 className="w-5 h-5 text-[#0097B2]" />,
      count: todoListsCount,
      badgeColor: 'bg-[#0097B2] text-white',
      targetForResume: 'todolist',
    },
    {
      key: 'equipment',
      title: t.navEquipment,
      subtitle: 'Team Accounts & Gundam Units',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      count: equipmentCount,
      badgeColor: 'bg-emerald-600 text-white',
      targetForResume: 'equipment',
    },
    {
      key: 'voice',
      title: currentLang === 'es' ? 'Comandos de Voz' : currentLang === 'ja' ? '音声コマンド' : 'Voice Commands',
      subtitle: 'Voice Input, AI Review & Fast Execution',
      icon: <Mic className="w-5 h-5 text-[#DC2626]" />,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      key: 'loans',
      title: t.navLoans,
      subtitle: 'Circulation Board & Overdue Alerts',
      icon: <Activity className="w-5 h-5 text-amber-500" />,
      count: loansCount,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      key: 'upload',
      title: t.navUpload,
      subtitle: 'Recursive Multi-Folder PDF & DOCX',
      icon: <UploadCloud className="w-5 h-5 text-indigo-500" />,
    },
    {
      key: 'chat',
      title: 'AI Archivist & Grounding',
      subtitle: 'Gemini Search & Reference Assistant',
      icon: <Bot className="w-5 h-5 text-purple-500" />,
    },
    {
      key: 'settings',
      title: t.navSettings,
      subtitle: 'Firebase Cloud Storage & Backup',
      icon: <Settings className="w-5 h-5 text-slate-500" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="relative w-screen max-w-md bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800">
          {/* Drawer Header */}
          <div className="p-5 bg-linear-to-r from-[#1E2A5E] to-[#2A3B82] text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-amber-300 border border-white/20">
                橋i
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Lighthouse Hashi</h3>
                <p className="text-xs text-blue-200">Main Menu Panels & Workspaces</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Bar: Panel Focus Controls & Cloud Sync */}
          <div className="px-5 py-3 bg-[#FAF7F0] dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
              <span className={`w-2 h-2 rounded-full ${isFirebaseLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isFirebaseLive ? 'Firestore Persistent Cloud' : 'Local Storage Mode'}</span>
            </div>

            {onToggleMaximize && (
              <button
                onClick={onToggleMaximize}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition"
              >
                {isPanelMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#0097B2]" />
                    <span>Restore Panel</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#0097B2]" />
                    <span>Maximize Panel</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Panel List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-1 pb-2">
              All System Panels (Can be Minimized / Maximized)
            </div>

            {panelItems.map(item => {
              const isActive = activeTab === item.key;
              return (
                <div
                  key={item.key}
                  className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-linear-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800 dark:to-slate-800/80 border-[#0097B2] shadow-sm'
                      : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectTab(item.key);
                      onClose();
                    }}
                    className="flex items-center gap-3.5 flex-1 text-left min-w-0"
                  >
                    <div
                      className={`p-2.5 rounded-xl border transition ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 border-[#0097B2]/30 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${isActive ? 'text-[#1E2A5E] dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {item.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#0097B2] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.count !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                        {item.count}
                      </span>
                    )}

                    {item.targetForResume && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenResumeModal(item.targetForResume);
                          onClose();
                        }}
                        title={`Export & Send Resume for ${item.title}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0097B2] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer: Global Resume Button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-[#FAF7F0] dark:bg-slate-900 space-y-2">
            <button
              onClick={() => {
                onOpenResumeModal('all');
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#1E2A5E] to-[#0097B2] hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Share2 className="w-4 h-4 text-amber-300" />
              <span>Export & Send All Resume (Excel / PDF / SMS)</span>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Lighthouse 橋i • Organized & Separated Architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
