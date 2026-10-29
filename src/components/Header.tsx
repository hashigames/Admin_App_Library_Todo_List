import React, { useState } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Shield,
  User,
  Database,
  Menu,
  X,
  Laptop,
  Upload,
  PlusCircle,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { LighthouseLogo } from './LighthouseLogo';
import { Language, UserRole, EquipmentUser } from '../types';
import { translations } from '../i18n/translations';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentRole?: UserRole;
  equipmentList: EquipmentUser[];
  activeEquipmentId: string;
  onSelectEquipment: (id: string) => void;
  isFirebaseLive: boolean;
  onOpenFirebaseModal: () => void;
  onOpenCloudShell?: () => void;
  onOpenUploadModal: () => void;
  onOpenLendModal: () => void;
  onOpenChatModal: () => void;
  onOpenHamburger?: () => void;
  firebaseUser: any;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  isDarkMode,
  onToggleDarkMode,
  currentRole = 'admin',
  equipmentList,
  activeEquipmentId,
  onSelectEquipment,
  isFirebaseLive,
  onOpenFirebaseModal,
  onOpenCloudShell,
  onOpenUploadModal,
  onOpenLendModal,
  onOpenChatModal,
  onOpenHamburger,
  firebaseUser,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = translations[currentLang];

  const activeEquipment = equipmentList.find(e => e.id === activeEquipmentId) || equipmentList[0];

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 dark:bg-[#140E12]/95 backdrop-blur-md border-b border-[#F2D5DE] dark:border-[#382631] transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Subtitle */}
          <div className="flex items-center">
            <LighthouseLogo size="md" />
          </div>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Current Active Equipment Switcher */}
            <div
              data-miyu-tip="header-equipment"
              className="relative flex items-center bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#382631] rounded-lg px-2.5 py-1.5 text-xs shadow-2xs"
            >
              <Laptop className="w-3.5 h-3.5 text-[#E8637C] mr-1.5" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8A7881] dark:text-[#E2B8C4] font-medium">
                  {t.activeEquipment}
                </span>
                <select
                  value={activeEquipmentId}
                  onChange={e => onSelectEquipment(e.target.value)}
                  className="bg-transparent font-bold text-[#1E1619] dark:text-[#FDF2F5] outline-none cursor-pointer pr-4"
                >
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id} className="dark:bg-[#21171D] text-[#1E1619] dark:text-white">
                      {eq.name} {eq.role === 'admin' ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Google Sign-in / User Profile */}
            {firebaseUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-[#F2D5DE] dark:border-[#382631]">
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-[#F2D5DE] dark:border-[#382631]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E8637C] text-white flex items-center justify-center text-xs font-bold">
                    {(firebaseUser.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-[#1E1619] dark:text-white leading-tight">
                    {firebaseUser.displayName || 'Google Member'}
                  </span>
                  <button
                    onClick={onSignOut}
                    className="text-[10px] text-[#8A1E3B] dark:text-[#F48FB1] hover:underline text-left leading-tight"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                data-miyu-tip="header-google"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] hover:bg-[#FFF5F7] dark:hover:bg-[#2B1B24] text-[#1E1619] dark:text-[#FDF2F5] shadow-2xs transition active:scale-95"
                title="Sign in with Google"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden xl:inline">Google Login</span>
              </button>
            )}

            {/* Google Cloud Shell Tool Button - Replaces old database icon at top right */}
            <button
              onClick={onOpenCloudShell}
              data-miyu-tip="header-cloud-shell"
              title="Google Cloud Shell: Access InventorySoftware, TodoList, and Equipment via terminal console"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] hover:border-[#E8637C] hover:bg-[#FFF5F7] dark:hover:bg-[#2B1B24] text-[#8A1E3B] dark:text-[#FDF2F5] transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[#E8637C]" />
              <span className="hidden sm:inline">Google Cloud Shell</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Language Switcher */}
            <div className="relative" data-miyu-tip="header-language">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] hover:bg-[#FFF5F7] dark:hover:bg-[#2B1B24] text-[#1E1619] dark:text-[#FDF2F5] transition"
              >
                <Globe className="w-3.5 h-3.5 text-[#E8637C]" />
                <span className="uppercase font-bold tracking-wider">{currentLang}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[#FFFFFF] dark:bg-[#21171D] rounded-lg shadow-xl border border-[#F2D5DE] dark:border-[#38322B] py-1 z-50 animate-in fade-in zoom-in-95">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onLanguageChange(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#FFF5F7] dark:hover:bg-[#2B1B24] ${
                        currentLang === l.code ? 'font-bold text-[#8A1E3B] dark:text-[#F48FB1] bg-[#FDE8EE]' : 'text-[#6B5B63] dark:text-[#E2B8C4]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {currentLang === l.code && <span className="text-[#E8637C]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              data-miyu-tip="header-theme"
              className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] text-[#1E1619] dark:text-[#FDF2F5] hover:text-[#E8637C] transition"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#E8637C]" /> : <Moon className="w-4 h-4 text-[#8A1E3B]" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onOpenCloudShell}
              className="px-2 py-1 text-xs font-bold rounded bg-white dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] text-[#8A1E3B] dark:text-[#FDF2F5] flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5 text-[#E8637C]" />
              <span>Shell</span>
            </button>
            <button
              onClick={() => onLanguageChange(currentLang === 'en' ? 'ja' : currentLang === 'ja' ? 'es' : 'en')}
              className="px-2 py-1 text-xs font-bold rounded bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] uppercase text-[#1E1619] dark:text-[#FDF2F5]"
            >
              {currentLang}
            </button>
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B]"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#E8637C]" /> : <Moon className="w-4 h-4 text-[#8A1E3B]" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#8A1E3B] text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 pt-2 border-t border-[#F2D5DE] dark:border-[#38322B] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (onOpenCloudShell) onOpenCloudShell();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-white dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] text-[#8A1E3B] dark:text-[#FDF2F5]"
              >
                <Terminal className="w-3.5 h-3.5 text-[#E8637C]" />
                <span>Google Cloud Shell Console</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              <button
                onClick={() => {
                  onOpenChatModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[#8A1E3B] text-white"
              >
                <span className="w-2 h-2 rounded-full bg-[#E8637C] animate-ping" />
                <span>AI Archivist</span>
              </button>

              {firebaseUser ? (
                <button
                  onClick={() => {
                    onSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-100 dark:bg-red-950/40 text-red-600"
                >
                  <span>Sign Out ({firebaseUser.displayName?.split(' ')[0] || 'User'})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onGoogleSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] font-semibold text-[#1E1619] dark:text-[#FDF2F5]"
                >
                  <span>Google Login</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenFirebaseModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-[#FFFFFF] dark:bg-[#21171D] border border-[#F2D5DE] dark:border-[#38322B] text-[#1E1619] dark:text-[#FDF2F5]"
              >
                <Database className="w-3.5 h-3.5 text-[#E8637C]" />
                <span>{isFirebaseLive ? t.firebaseCloud : t.localMode}</span>
              </button>
            </div>

            {/* Active Equipment Mobile Selector */}
            <div className="flex items-center gap-2 bg-[#FFFFFF] dark:bg-[#21171D] p-2 rounded-lg border border-[#F2D5DE] dark:border-[#38322B] text-xs">
              <Laptop className="w-4 h-4 text-[#E8637C]" />
              <span className="text-[#6B5B63] font-medium">{t.activeEquipment}:</span>
              <select
                value={activeEquipmentId}
                onChange={e => onSelectEquipment(e.target.value)}
                className="bg-transparent font-bold text-[#1E1619] dark:text-[#FDF2F5] flex-1"
              >
                {equipmentList.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </div>

            {currentRole === 'admin' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onOpenUploadModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded bg-[#8A1E3B] text-white"
                >
                  <Upload className="w-3.5 h-3.5 text-[#E8637C]" />
                  <span>{t.navUpload}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenLendModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded bg-[#FFF5F7] text-[#8A1E3B] border border-[#F2D5DE]"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#E8637C]" />
                  <span>{t.quickLend}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
