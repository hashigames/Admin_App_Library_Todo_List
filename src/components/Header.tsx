import React, { useState } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Shield,
  User,
  Database,
  Upload,
  PlusCircle,
  Menu,
  X,
  Laptop,
  Mic,
} from 'lucide-react';
import { LighthouseLogo } from './LighthouseLogo';
import { Language, UserRole, EquipmentUser } from '../types';
import { translations } from '../i18n/translations';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentRole: UserRole;
  onToggleRole: () => void;
  equipmentList: EquipmentUser[];
  activeEquipmentId: string;
  onSelectEquipment: (id: string) => void;
  isFirebaseLive: boolean;
  onOpenFirebaseModal: () => void;
  onOpenUploadModal: () => void;
  onOpenLendModal: () => void;
  onOpenChatModal: () => void;
  onOpenVoiceTab?: () => void;
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
  currentRole,
  onToggleRole,
  equipmentList,
  activeEquipmentId,
  onSelectEquipment,
  isFirebaseLive,
  onOpenFirebaseModal,
  onOpenUploadModal,
  onOpenLendModal,
  onOpenChatModal,
  onOpenVoiceTab,
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
    <header className="sticky top-0 z-40 bg-[#FAF7F0]/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#1E2A5E]/10 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Subtitle */}
          <div className="flex items-center">
            <LighthouseLogo size="md" />
          </div>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Quick Actions */}
            {currentRole === 'admin' ? (
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={onOpenUploadModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1E2A5E] hover:bg-[#2A3B82] text-white shadow-sm transition active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{t.navUpload}</span>
                </button>

                <button
                  onClick={onOpenLendModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#F5A623] hover:bg-[#E59716] text-[#1E2A5E] shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#1E2A5E]" />
                  <span>{t.quickLend}</span>
                </button>
              </div>
            ) : null}

            {/* Current Active Equipment Switcher */}
            <div className="relative flex items-center bg-white dark:bg-slate-800 border border-[#1E2A5E]/15 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs shadow-xs">
              <Laptop className="w-3.5 h-3.5 text-[#0097B2] mr-1.5" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.activeEquipment}
                </span>
                <select
                  value={activeEquipmentId}
                  onChange={e => onSelectEquipment(e.target.value)}
                  className="bg-transparent font-bold text-[#1E2A5E] dark:text-slate-200 outline-none cursor-pointer pr-4"
                >
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id} className="dark:bg-slate-800 text-[#1E2A5E] dark:text-white">
                      {eq.name} {eq.role === 'admin' ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode Switcher (Admin / Equipment Reader) */}
            <button
              onClick={onToggleRole}
              title={t.switchMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                currentRole === 'admin'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              {currentRole === 'admin' ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>{t.adminMode}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-[#0097B2]" />
                  <span>{t.userMode}</span>
                </>
              )}
            </button>

            {/* Voice Commands Quick Button */}
            {onOpenVoiceTab && (
              <button
                onClick={onOpenVoiceTab}
                title="Voice Commands Quick Creation (Microphone)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs border border-red-500 transition active:scale-95"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span>Voice Commands</span>
              </button>
            )}

            {/* Gemini AI Archivist Chat & Grounding Button */}
            <button
              onClick={onOpenChatModal}
              title="Gemini AI Archivist & Search"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-linear-to-r from-[#1E2A5E] to-[#2A3B82] hover:from-[#2A3B82] hover:to-[#384DA5] text-white shadow-xs border border-white/20 transition active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-ping" />
              <span>AI Archivist</span>
            </button>

            {/* Google Sign-in / User Profile */}
            {firebaseUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1E2A5E] text-white flex items-center justify-center text-xs font-bold">
                    {(firebaseUser.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-[#1E2A5E] dark:text-white leading-tight">
                    {firebaseUser.displayName || 'Google Member'}
                  </span>
                  <button
                    onClick={onSignOut}
                    className="text-[10px] text-red-500 hover:underline text-left leading-tight"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-[#1E2A5E]/20 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#1E2A5E] dark:text-slate-200 shadow-xs transition active:scale-95"
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

            {/* Firebase Status Pill */}
            <button
              onClick={onOpenFirebaseModal}
              title="Firebase Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-[#1E2A5E]/15 dark:border-slate-700 hover:border-[#F5A623] transition"
            >
              <Database className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden xl:inline text-slate-600 dark:text-slate-300">
                {isFirebaseLive ? t.firebaseCloud : t.localMode}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isFirebaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-[#1E2A5E]/15 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#1E2A5E] dark:text-slate-200 transition"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="uppercase font-bold tracking-wider">{currentLang}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onLanguageChange(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-amber-50 dark:hover:bg-slate-700 ${
                        currentLang === l.code ? 'font-bold text-[#1E2A5E] dark:text-amber-300 bg-amber-50/50' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {currentLang === l.code && <span className="text-[#DC2626]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-[#1E2A5E]/15 dark:border-slate-700 text-[#1E2A5E] dark:text-slate-200 hover:text-[#F5A623] transition"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F5A623]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => onLanguageChange(currentLang === 'en' ? 'ja' : currentLang === 'ja' ? 'es' : 'en')}
              className="px-2 py-1 text-xs font-bold rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 uppercase"
            >
              {currentLang}
            </button>
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F5A623]" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#1E2A5E] text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 pt-2 border-t border-[#1E2A5E]/10 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  onToggleRole();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-amber-100 dark:bg-slate-800 text-[#1E2A5E] dark:text-amber-300"
              >
                <Shield className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>{currentRole === 'admin' ? t.adminMode : t.userMode}</span>
              </button>

              {onOpenVoiceTab && (
                <button
                  onClick={() => {
                    onOpenVoiceTab();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-red-600 text-white"
                >
                  <Mic className="w-3.5 h-3.5 animate-pulse" />
                  <span>Voice Commands</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenChatModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded bg-[#1E2A5E] text-white"
              >
                <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-ping" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  <span>Google Login</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenFirebaseModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-slate-100 dark:bg-slate-800"
              >
                <Database className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>{isFirebaseLive ? t.firebaseCloud : t.localMode}</span>
              </button>
            </div>

            {/* Active Equipment Mobile Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <Laptop className="w-4 h-4 text-[#0097B2]" />
              <span className="text-slate-500 font-medium">{t.activeEquipment}:</span>
              <select
                value={activeEquipmentId}
                onChange={e => onSelectEquipment(e.target.value)}
                className="bg-transparent font-bold text-[#1E2A5E] dark:text-white flex-1"
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
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded bg-[#1E2A5E] text-white"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{t.navUpload}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenLendModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded bg-[#F5A623] text-[#1E2A5E]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
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
