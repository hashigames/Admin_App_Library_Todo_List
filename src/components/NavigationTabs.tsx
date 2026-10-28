import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Activity,
  UploadCloud,
  Users,
  Settings,
  Bot,
  Table2,
  Menu,
  X,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

export type TabKey = 'library' | 'loans' | 'upload' | 'equipment' | 'todolist' | 'chat' | 'settings';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  currentLang: Language;
  activeLoanCount: number;
  overdueCount: number;
  needsReviewCount: number;
  onOpenHamburger?: () => void;
}

// Clean default workspace: Library, TodoList, Equipment, Settings
// Auxiliary panels (loans, upload, chat) are optional
const DEFAULT_VISIBLE_PANELS: TabKey[] = ['library', 'todolist', 'equipment', 'settings'];

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  currentLang,
  activeLoanCount,
  overdueCount,
  needsReviewCount,
  onOpenHamburger,
}) => {
  const t = translations[currentLang];

  const [visiblePanels, setVisiblePanels] = useState<TabKey[]>(() => {
    try {
      const stored = localStorage.getItem('lighthouse_visible_panels');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((k: string) => k !== 'voice' && ['library', 'loans', 'upload', 'equipment', 'todolist', 'chat', 'settings'].includes(k));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return DEFAULT_VISIBLE_PANELS;
  });

  const [isManageOpen, setIsManageOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lighthouse_visible_panels', JSON.stringify(visiblePanels));
    } catch {}
  }, [visiblePanels]);

  // If the currently active tab was deleted, switch to the first visible tab
  useEffect(() => {
    if (!visiblePanels.includes(activeTab) && visiblePanels.length > 0) {
      onTabChange(visiblePanels[0]);
    }
  }, [visiblePanels, activeTab, onTabChange]);

  const allTabs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    description: string;
  }[] = [
    {
      key: 'library',
      label: t.navLibrary,
      icon: <BookOpen className="w-4 h-4" />,
      badge: needsReviewCount > 0 ? needsReviewCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      description: 'Book Shelves & Windows Panels Explorer',
    },
    {
      key: 'todolist',
      label: 'TodoList Matrix',
      icon: <Table2 className="w-4 h-4 text-[#C88A35]" />,
      description: 'Tabular Matrix, Excel & PDF sharing',
    },
    {
      key: 'equipment',
      label: t.navEquipment,
      icon: <Users className="w-4 h-4" />,
      description: 'Gundam units & Team Hardware accounts',
    },
    {
      key: 'loans',
      label: t.navLoans,
      icon: <Activity className="w-4 h-4" />,
      badge: overdueCount > 0 ? overdueCount : activeLoanCount > 0 ? activeLoanCount : undefined,
      badgeColor: overdueCount > 0 ? 'bg-[#BD3A2B] text-white animate-pulse' : 'bg-[#C88A35] text-white',
      description: 'Circulation & Overdue Monitoring',
    },
    {
      key: 'upload',
      label: t.navUpload,
      icon: <UploadCloud className="w-4 h-4" />,
      description: 'Bulk recursive document upload',
    },
    {
      key: 'chat',
      label: 'AI Archivist & Search',
      icon: <Bot className="w-4 h-4 text-[#C88A35]" />,
      description: 'Gemini research assistant & search grounding',
    },
    {
      key: 'settings',
      label: t.navSettings,
      icon: <Settings className="w-4 h-4" />,
      description: 'Firebase, Cloud storage & SMTP email config',
    },
  ];

  const handleDeletePanel = (panelKey: TabKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (visiblePanels.length <= 1) return;
    const next = visiblePanels.filter((k) => k !== panelKey);
    setVisiblePanels(next);
  };

  const handleRestorePanel = (panelKey: TabKey) => {
    if (!visiblePanels.includes(panelKey)) {
      const next = [...visiblePanels, panelKey];
      setVisiblePanels(next);
      onTabChange(panelKey);
    }
  };

  const handleResetPanels = () => {
    setVisiblePanels(DEFAULT_VISIBLE_PANELS);
    setIsManageOpen(false);
  };

  const displayedTabs = allTabs.filter((tab) => visiblePanels.includes(tab.key));
  const hiddenTabs = allTabs.filter((tab) => !visiblePanels.includes(tab.key));

  return (
    <nav className="border-b border-[#EAE2D2] dark:border-[#2D2823] bg-[#FAF6EE] dark:bg-[#171513] px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 py-2.5">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {onOpenHamburger && (
            <button
              onClick={onOpenHamburger}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs hover:bg-[#F5EFE3] dark:hover:bg-[#2B2520] transition active:scale-95 mr-1 cursor-pointer"
              title="Open Hamburger Main Menu"
            >
              <Menu className="w-4 h-4 text-[#C88A35]" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          )}

          {/* Render Active/Visible Tabs with Quick Delete (×) option */}
          {displayedTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <div key={tab.key} className="relative group flex items-center">
                <button
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-2 pl-3 sm:pl-3.5 pr-2 sm:pr-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap active:scale-98 cursor-pointer ${
                    isActive
                      ? 'bg-[#2B2520] text-[#FAF6EE] shadow-sm dark:bg-[#FAF6EE] dark:text-[#2B2520]'
                      : 'text-[#736859] dark:text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#201C19]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        tab.badgeColor || 'bg-[#736859] text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {/* Quick Delete Panel Button (x) */}
                  <span
                    onClick={(e) => handleDeletePanel(tab.key, e)}
                    className={`ml-1.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition opacity-0 group-hover:opacity-100 ${
                      isActive ? 'text-[#FAF6EE]/80 dark:text-[#2B2520]/80' : 'text-[#9C907E] hover:text-[#BD3A2B]'
                    }`}
                    title={`Delete / Hide ${tab.label} panel`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              </div>
            );
          })}

          {/* Customize & Restore Panels Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsManageOpen(!isManageOpen)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold border border-dashed border-[#DECFA9] dark:border-[#4A4135] text-[#736859] dark:text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white hover:bg-[#F5EFE3] dark:hover:bg-[#201C19] transition cursor-pointer"
              title="Manage, Delete, or Restore workspace panels"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C88A35]" />
              <span className="hidden md:inline">Manage Panels</span>
              {hiddenTabs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#EAE2D2] dark:bg-[#2D2823] text-[#2B2520] dark:text-[#FAF6EE] rounded-full font-bold">
                  +{hiddenTabs.length}
                </span>
              )}
            </button>

            {/* Manage Panels Dropdown Modal */}
            {isManageOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-[#FFFFFF] dark:bg-[#201C19] rounded-2xl shadow-xl border border-[#EAE2D2] dark:border-[#38322B] p-3.5 z-50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-2">
                  <h4 className="text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE] uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#C88A35]" />
                    <span>Manage Workspace Panels</span>
                  </h4>
                  <button
                    onClick={() => setIsManageOpen(false)}
                    className="p-1 text-[#9C907E] hover:text-[#2B2520] dark:hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Visible Panels List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Panels ({displayedTabs.length}):
                  </span>
                  <div className="space-y-1">
                    {displayedTabs.map((t) => (
                      <div
                        key={t.key}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                          {t.icon}
                          <span className="truncate max-w-[130px]">{t.label}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeletePanel(t.key, e)}
                          disabled={displayedTabs.length <= 1}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hidden / Deleted Panels to Restore */}
                {hiddenTabs.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Deleted / Hidden Panels ({hiddenTabs.length}):
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {hiddenTabs.map((t) => (
                        <div
                          key={t.key}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/30 text-xs"
                        >
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            {t.icon}
                            <span className="truncate max-w-[130px]">{t.label}</span>
                          </div>
                          <button
                            onClick={() => handleRestorePanel(t.key)}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <button
                    onClick={handleResetPanels}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    onClick={() => setIsManageOpen(false)}
                    className="font-bold text-[#BD3A2B] hover:underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
