import React, { useState } from 'react';
import {
  Settings,
  SlidersHorizontal,
  X,
  Plus,
  RotateCcw,
  BookOpen,
  Table2,
  Users,
  Activity,
  UploadCloud,
  Bot,
  Sparkles,
  Check,
} from 'lucide-react';
import { TabKey } from './NavigationTabs';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface BottomPanelsBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  visiblePanels: TabKey[];
  onTogglePanel: (tab: TabKey) => void;
  onResetPanels: () => void;
  currentLang: Language;
}

export const BottomPanelsBar: React.FC<BottomPanelsBarProps> = ({
  activeTab,
  onSelectTab,
  visiblePanels,
  onTogglePanel,
  onResetPanels,
  currentLang,
}) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const t = translations[currentLang];

  const allPanelDefs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      key: 'library',
      label: t.navLibrary || 'Create Inventory Software',
      icon: <BookOpen className="w-4 h-4 text-[#E8637C]" />,
      desc: 'Software Inventory & Document Catalog',
    },
    {
      key: 'todolist',
      label: 'Create TodoList',
      icon: <Table2 className="w-4 h-4 text-[#E8637C]" />,
      desc: 'Dynamic Matrix with Excel Resizing & Zoom',
    },
    {
      key: 'equipment',
      label: t.navEquipment || 'Create Inventory Equipment',
      icon: <Users className="w-4 h-4 text-[#E8637C]" />,
      desc: 'Equipment Inventory & Workstation Allocation',
    },
    {
      key: 'loans',
      label: t.navLoans || 'Active Loans',
      icon: <Activity className="w-4 h-4 text-[#8A1E3B]" />,
      desc: 'Book Circulation & Overdue Tracking',
    },
    {
      key: 'upload',
      label: t.navUpload || 'AI Bulk Upload',
      icon: <UploadCloud className="w-4 h-4 text-[#2E7D5B]" />,
      desc: 'Batch PDF & Word Document Ingestion',
    },
    {
      key: 'chat',
      label: 'AI Archivist & Search',
      icon: <Bot className="w-4 h-4 text-[#E8637C]" />,
      desc: 'Gemini Technical Assistant & Search Grounding',
    },
    {
      key: 'settings',
      label: 'Firebase & Settings',
      icon: <Settings className="w-4 h-4 text-[#6B5B63]" />,
      desc: 'Cloud Database, Persistence & SMTP Config',
    },
  ];

  const hiddenPanels = allPanelDefs.filter(p => !visiblePanels.includes(p.key));

  const handleOpenSettings = () => {
    // If settings was hidden, unhide it first
    if (!visiblePanels.includes('settings')) {
      onTogglePanel('settings');
    }
    onSelectTab('settings');
  };

  return (
    <>
      {/* Bottom Panel Strip - Japanese Sakura Style on Clean White */}
      <section
        aria-label="Bottom Navigation & Workspace Controls"
        className="w-full bg-[#FFF5F7] dark:bg-[#1A1217] border-t border-[#F2D5DE] dark:border-[#382631] py-3 px-4 sm:px-6 relative z-30 transition-colors shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Left / Main Button Group styled with Sakura & White elegance */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 1. "Firebase & Settings" Pill Button */}
            <button
              type="button"
              onClick={handleOpenSettings}
              data-miyu-tip="bottom-firebase-settings"
              className={`rounded-full px-5 py-2 text-sm font-bold flex items-center gap-2.5 transition-all shadow-xs active:scale-95 cursor-pointer border ${
                activeTab === 'settings'
                  ? 'bg-[#8A1E3B] text-white border-[#8A1E3B] ring-2 ring-[#E8637C]/40'
                  : 'bg-white hover:bg-[#FDE8EE] text-[#8A1E3B] dark:bg-[#251820] dark:hover:bg-[#32202B] dark:text-[#FDF2F5] border-[#F2D5DE] dark:border-[#382631]'
              }`}
              title="Open Firebase Cloud & System Settings"
            >
              <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-[#E8637C]'}`} />
              <span>Firebase &amp; Settings</span>
            </button>

            {/* 2. "Manage Panels" Dashed Pill Button with Badge */}
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              data-miyu-tip="bottom-manage-panels"
              className="border border-dashed border-[#E8637C] hover:border-[#D84C74] bg-white dark:bg-[#251820] hover:bg-[#FFF0F3] dark:hover:bg-[#32202B] text-[#8A1E3B] dark:text-[#FDF2F5] rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Manage workspace panels (hide, show or restore panels)"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E8637C]" />
              <span>Manage Panels</span>
              {hiddenPanels.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-[#FDE8EE] dark:bg-[#382631] text-[#8A1E3B] dark:text-[#F48FB1] rounded-full border border-[#F2D5DE] dark:border-[#4D3343]">
                  +{hiddenPanels.length}
                </span>
              )}
            </button>
          </div>

          {/* Right helper summary info */}
          <div className="hidden md:flex items-center gap-3 text-xs text-[#8A7881] dark:text-[#E2B8C4]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E8637C]" />
              <span>Sakura Workspace: {visiblePanels.length} Panels Visible</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-[#E8637C]" />
            <span>Click Manage Panels to toggle views 🌸</span>
          </div>
        </div>
      </section>

      {/* Manage Panels Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#1E141A] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#F2D5DE] dark:border-[#382631] space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F2D5DE] dark:border-[#382631] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#FFF0F3] dark:bg-[#2D1B26] text-[#8A1E3B]">
                  <SlidersHorizontal className="w-5 h-5 text-[#E8637C]" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1E1619] dark:text-[#FDF2F5] font-serif-jp">
                    Manage Workspace Panels 🌸
                  </h3>
                  <p className="text-xs text-[#6B5B63] dark:text-[#E2B8C4]">
                    Show, hide, or restore panels in the navigation bar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 text-[#8A7881] hover:text-[#8A1E3B] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panels List */}
            <div className="space-y-2">
              {allPanelDefs.map(panel => {
                const isVisible = visiblePanels.includes(panel.key);
                return (
                  <div
                    key={panel.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isVisible
                        ? 'bg-[#FFF9FB] dark:bg-[#251820] border-[#F2D5DE] dark:border-[#382631]'
                        : 'bg-stone-50 dark:bg-stone-900/40 border-dashed border-stone-200 dark:border-stone-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#1A1217] border border-[#F2D5DE] dark:border-stone-800">
                        {panel.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#1E1619] dark:text-[#FDF2F5]">
                          {panel.label}
                        </h4>
                        <p className="text-[11px] text-[#6B5B63] dark:text-[#E2B8C4]">
                          {panel.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onTogglePanel(panel.key);
                          if (!isVisible) {
                            onSelectTab(panel.key);
                          }
                        }}
                        disabled={isVisible && visiblePanels.length <= 1}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isVisible
                            ? 'bg-[#8A1E3B] text-white hover:bg-[#A82B4E]'
                            : 'bg-[#E8637C] text-white hover:bg-[#D84C74]'
                        }`}
                      >
                        {isVisible ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F2D5DE] dark:border-[#382631]">
              <button
                type="button"
                onClick={() => {
                  onResetPanels();
                  setIsManageModalOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6B5B63] dark:text-[#E2B8C4] hover:text-[#8A1E3B] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8A1E3B] hover:bg-[#A82B4E] text-white shadow-2xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
