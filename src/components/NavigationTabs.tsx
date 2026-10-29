import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Activity,
  UploadCloud,
  Users,
  Bot,
  Table2,
  Menu,
  X,
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
  visiblePanels?: TabKey[];
  onSetVisiblePanels?: React.Dispatch<React.SetStateAction<TabKey[]>>;
}

// Clean default workspace: Library, TodoList, Equipment, Loan & Board
export const DEFAULT_VISIBLE_PANELS: TabKey[] = ['library', 'todolist', 'equipment', 'loans'];

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  currentLang,
  activeLoanCount,
  overdueCount,
  needsReviewCount,
  onOpenHamburger,
  visiblePanels: propVisiblePanels,
  onSetVisiblePanels: propSetVisiblePanels,
}) => {
  const t = translations[currentLang];

  const [internalVisiblePanels, setInternalVisiblePanels] = useState<TabKey[]>(() => {
    try {
      const stored = localStorage.getItem('lighthouse_visible_panels');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((k: string) => k !== 'voice' && k !== 'settings' && ['library', 'loans', 'upload', 'equipment', 'todolist', 'chat'].includes(k));
          if (!filtered.includes('loans')) {
            filtered.push('loans');
          }
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return DEFAULT_VISIBLE_PANELS;
  });

  const visiblePanels = propVisiblePanels || internalVisiblePanels;
  const setVisiblePanels = propSetVisiblePanels || setInternalVisiblePanels;

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lighthouse_visible_panels', JSON.stringify(visiblePanels));
    } catch {}
  }, [visiblePanels]);

  // If the currently active tab was deleted, switch to the first visible tab
  useEffect(() => {
    if (!visiblePanels.includes(activeTab) && visiblePanels.length > 0 && activeTab !== 'settings') {
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
      icon: <BookOpen className="w-4 h-4 text-[#E8637C]" />,
      badge: needsReviewCount > 0 ? needsReviewCount : undefined,
      badgeColor: 'bg-[#E8637C] text-white',
      description: 'Software inventory & documentation catalog',
    },
    {
      key: 'todolist',
      label: 'Create TodoList',
      icon: <Table2 className="w-4 h-4 text-[#E8637C]" />,
      description: 'Dynamic TodoLists, tabular matrix & spreadsheets',
    },
    {
      key: 'equipment',
      label: t.navEquipment,
      icon: <Users className="w-4 h-4 text-[#E8637C]" />,
      description: 'Equipment inventory, Gundam units & team accounts',
    },
    {
      key: 'loans',
      label: t.navLoans,
      icon: <Activity className="w-4 h-4 text-[#E8637C]" />,
      badge: overdueCount > 0 ? overdueCount : activeLoanCount > 0 ? activeLoanCount : undefined,
      badgeColor: overdueCount > 0 ? 'bg-[#8A1E3B] text-white animate-pulse' : 'bg-[#E8637C] text-white',
      description: 'Circulation & Overdue Monitoring',
    },
    {
      key: 'upload',
      label: t.navUpload,
      icon: <UploadCloud className="w-4 h-4 text-[#E8637C]" />,
      description: 'Bulk recursive document upload',
    },
    {
      key: 'chat',
      label: 'AI Archivist & Search',
      icon: <Bot className="w-4 h-4 text-[#E8637C]" />,
      description: 'Gemini research assistant & search grounding',
    },
  ];

  const handleDeletePanel = (panelKey: TabKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (visiblePanels.length <= 1) return;
    const next = visiblePanels.filter((k) => k !== panelKey);
    setVisiblePanels(next);
  };

  const displayedTabs = allTabs.filter((tab) => visiblePanels.includes(tab.key));

  return (
    <nav className="border-b border-[#F2D5DE] dark:border-[#382631] bg-[#FFFFFF] dark:bg-[#140E12] px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 py-2.5">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {onOpenHamburger && (
            <button
              onClick={onOpenHamburger}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#FFFFFF] dark:bg-[#21171D] text-[#1E1619] dark:text-[#FDF2F5] border border-[#F2D5DE] dark:border-[#382631] shadow-2xs hover:bg-[#FFF5F7] dark:hover:bg-[#2B1B24] transition active:scale-95 mr-1 cursor-pointer"
              title="Open Hamburger Main Menu"
            >
              <Menu className="w-4 h-4 text-[#E8637C]" />
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
                  data-miyu-tip={`nav-${tab.key}`}
                  className={`flex items-center gap-2 pl-3 sm:pl-3.5 pr-2 sm:pr-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap active:scale-98 cursor-pointer ${
                    isActive
                      ? 'bg-[#8A1E3B] text-white shadow-sm dark:bg-[#E8637C] dark:text-[#1E1619]'
                      : 'text-[#6B5B63] dark:text-[#E2B8C4] hover:text-[#8A1E3B] dark:hover:text-white hover:bg-[#FFF5F7] dark:hover:bg-[#21171D]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        tab.badgeColor || 'bg-[#8A1E3B] text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {/* Quick Delete Panel Button (x) */}
                  <span
                    onClick={(e) => handleDeletePanel(tab.key, e)}
                    className={`ml-1.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition opacity-0 group-hover:opacity-100 ${
                      isActive ? 'text-white/80 dark:text-[#1E1619]/80' : 'text-[#8A7881] hover:text-[#8A1E3B]'
                    }`}
                    title={`Delete / Hide ${tab.label} panel`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
