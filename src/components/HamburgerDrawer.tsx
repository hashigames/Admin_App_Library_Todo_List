import React from 'react';
import {
  X,
  BookOpen,
  Activity,
  UploadCloud,
  Users,
  Table2,
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
      icon: <BookOpen className="w-5 h-5 text-[#C88A35]" />,
      count: booksCount,
      badgeColor: 'bg-[#2B2520] dark:bg-[#C88A35] text-[#FAF6EE] dark:text-[#2B2520]',
      targetForResume: 'library',
    },
    {
      key: 'todolist',
      title: 'Create TodoList',
      subtitle: 'Tabular Excel-like Databases & Deadlines',
      icon: <Table2 className="w-5 h-5 text-[#C88A35]" />,
      count: todoListsCount,
      badgeColor: 'bg-[#C88A35] text-white',
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
        <div className="relative w-screen max-w-md bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] shadow-2xl flex flex-col border-r border-[#EAE2D2] dark:border-[#38322B]">
          {/* Drawer Header */}
          <div className="p-5 bg-[#2B2520] text-[#FAF6EE] flex items-center justify-between shadow-md border-b border-[#38322B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-[#C88A35] border border-white/20">
                橋i
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-base leading-tight font-serif-jp">Lighthouse 橋i</h3>
                  <span className="text-[11px] font-bold bg-[#BD3A2B]/20 text-[#FAF6EE] border border-[#BD3A2B]/40 px-2 py-0.5 rounded-full font-serif-jp">
                    とうだいぶんこ
                  </span>
                </div>
                <p className="text-xs text-[#DECFA9]">燈台文庫 • Library & TodoList Workspaces</p>
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
          <div className="px-5 py-3 bg-[#F5EFE3] dark:bg-[#201C19] border-b border-[#EAE2D2] dark:border-[#38322B] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#736859] dark:text-[#A89D8E] font-semibold">
              <span className={`w-2 h-2 rounded-full ${isFirebaseLive ? 'bg-[#4A6B53]' : 'bg-[#C88A35]'}`} />
              <span>{isFirebaseLive ? 'Firestore Persistent Cloud' : 'Local Storage Mode'}</span>
            </div>

            {onToggleMaximize && (
              <button
                onClick={onToggleMaximize}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFFFF] dark:bg-[#2B2520] border border-[#EAE2D2] dark:border-[#38322B] hover:bg-[#FAF6EE] text-xs font-bold transition"
              >
                {isPanelMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#C88A35]" />
                    <span>Restore Panel</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#C88A35]" />
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
                      ? 'bg-[#FAF6EE] dark:bg-[#201C19] border-[#DECFA9] dark:border-[#38322B] shadow-2xs'
                      : 'border-[#EAE2D2]/60 dark:border-[#38322B]/60 hover:bg-[#FAF6EE]/50 dark:hover:bg-[#201C19]/40 hover:border-[#DECFA9]'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectTab(item.key);
                      onClose();
                    }}
                    className="flex items-center gap-3.5 flex-1 text-left min-w-0 py-1"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${isActive ? 'text-[#8A1E3B] dark:text-[#F48FB1]' : 'text-[#2B2520] dark:text-[#FAF6EE]'}`}>
                          {item.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#E8637C] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E8373] dark:text-[#A89F91] truncate mt-0.5">
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
                        className="p-1.5 rounded-lg text-[#736859] hover:text-[#BD3A2B] hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] transition"
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
          <div className="p-4 border-t border-[#EAE2D2] dark:border-[#38322B] bg-[#F5EFE3] dark:bg-[#171513] space-y-2">
            <button
              onClick={() => {
                onOpenResumeModal('all');
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#BD3A2B] hover:bg-[#A83225] shadow-xs flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Export & Send All Resume (Excel / PDF / SMS)</span>
            </button>
            <p className="text-[10px] text-center text-[#736859] dark:text-[#A89D8E]">
              Lighthouse 橋i • Organized & Separated Architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
