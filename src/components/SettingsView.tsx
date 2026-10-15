import React, { useState } from 'react';
import {
  Database,
  Shield,
  Key,
  Copy,
  Check,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  Server,
  Sparkles,
  Info,
  Mail,
  Send,
  Loader2,
  HelpCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Language, FirebaseConfigState } from '../types';
import { translations } from '../i18n/translations';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
} from '../firebase/config';
import {
  resetDemoState,
  exportLibraryJson,
  importLibraryJson,
} from '../firebase/dataService';
import {
  getStoredSmtpConfig,
  saveStoredSmtpConfig,
  SmtpConfig,
} from '../services/shareUtils';

interface SettingsViewProps {
  currentLang: Language;
  onRefreshData: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang,
  onRefreshData,
  onShowToast,
}) => {
  const t = translations[currentLang];
  const [config, setConfig] = useState<FirebaseConfigState>(getStoredFirebaseConfig());
  const [copiedRules, setCopiedRules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const stored = getStoredSmtpConfig();
    return {
      host: stored.host || 'smtp.gmail.com',
      port: stored.port || 587,
      user: stored.user || 'andreramiers@gmail.com',
      pass: stored.pass || '',
      isConfigured: stored.isConfigured || false,
    };
  });
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('andreramiers@gmail.com');

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isAdmin() {
      return isAuthenticated() && (request.auth.token.role == 'admin' || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    match /books/{bookId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    match /users/{userId} {
      allow read: if true;
      allow write: if isAdmin() || (isAuthenticated() && request.auth.uid == userId);
    }
    match /loans/{loanId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}`;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    saveStoredFirebaseConfig(config);
    onShowToast('Firebase configuration saved. Reloading storage pipeline...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    onShowToast(t.rulesCopied);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleResetData = async () => {
    if (confirm(t.resetConfirm)) {
      resetDemoState();
      await onRefreshData();
      onShowToast('Library database reset to initial demo state.');
    }
  };

  const handleExportData = () => {
    const jsonStr = exportLibraryJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lighthouse_library_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    onShowToast('Library dataset exported successfully.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        importLibraryJson(text);
        await onRefreshData();
        onShowToast('Library data imported successfully.');
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#1E2A5E]/10 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-[#F5A623] text-[#1E2A5E]">
            <Database className="w-4 h-4" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E2A5E] dark:text-white font-serif-jp">
            {t.firebaseTitle}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t.firebaseSubtitle}
        </p>
      </div>

      {/* Firebase Status Alert */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[#1E2A5E] dark:text-amber-300">
            Persistent Hybrid Storage Architecture
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            The application operates with zero friction: by default, all books, equipment, and loans
            persist reliably in local browser storage. When you paste your Firebase project credentials
            below, the system automatically routes all catalog updates to Cloud Firestore and Firebase Storage.
          </p>
        </div>
      </div>

      {/* Firebase Credentials Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
        <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-[#0097B2]" />
          <span>Firebase Project Keys (Placeholders / Custom Keys)</span>
        </h2>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              {t.apiKeyLabel}
            </label>
            <input
              type="text"
              value={config.apiKey}
              onChange={e => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              {t.projectIdLabel}
            </label>
            <input
              type="text"
              value={config.projectId}
              onChange={e => setConfig({ ...config, projectId: e.target.value })}
              placeholder="lighthouse-hashi-app"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              {t.storageBucketLabel}
            </label>
            <input
              type="text"
              value={config.storageBucket}
              onChange={e => setConfig({ ...config, storageBucket: e.target.value })}
              placeholder="lighthouse-hashi-app.appspot.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              App ID
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={e => setConfig({ ...config, appId: e.target.value })}
              placeholder="1:123456789:web:abcdef"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Changes will save to browser memory and switch active SDK mode.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white text-xs font-bold shadow-md transition"
            >
              {isSaving ? t.loading : t.saveConfig}
            </button>
          </div>
        </form>
      </div>

      {/* Firestore Security Rules Display */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white">
              {t.firestoreRulesTitle}
            </h2>
          </div>
          <button
            onClick={handleCopyRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRules ? 'Copied!' : t.copyRules}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
          {FIRESTORE_RULES_SNIPPET}
        </pre>
      </div>

      {/* Backup / Export / Reset Controls */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
        <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-[#F5A623]" />
          <span>Data Management & Backup</span>
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportData}</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{t.importData}</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-[#DC2626] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDemoData}</span>
          </button>
        </div>
      </div>

      {/* Live Email & SMTP Dispatch Configuration Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-linear-to-r from-[#1E2A5E] to-[#0097B2] text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2A5E] dark:text-white flex items-center gap-2">
                <span>Live Email & SMTP Dispatch Settings</span>
                {smtpConfig.isConfigured ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Not configured
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure live server-side email delivery with Excel and PDF attachments
              </p>
            </div>
          </div>
        </div>

        {/* Informative FAQ Q&A addressing user questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#0097B2]" />
              <span>Why did the email not arrive previously?</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              In any cloud application, sending a direct email into a personal Gmail or Outlook inbox requires an authenticated SMTP mail gateway (such as a 16-character Google App Password or SendGrid). Without SMTP credentials, automated emails cannot be transmitted across the internet.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Do I have to publish to allow this feature to work?</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <strong>No, you do NOT have to publish!</strong> Live emails work directly inside the preview as soon as you enter your SMTP App Password below, OR you can always use the instant 1-click &quot;Open in Gmail&quot; button to send directly from your personal Gmail right away!
            </p>
          </div>
        </div>

        {/* SMTP Configuration Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const isConfigured = Boolean(smtpConfig.user && smtpConfig.pass);
            saveStoredSmtpConfig({ ...smtpConfig, isConfigured });
            onShowToast('SMTP email credentials saved.');
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Host Server:
              </label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
              <span className="text-[10px] text-slate-400">Use smtp.gmail.com for Gmail accounts</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                SMTP Port:
              </label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                placeholder="587"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
              <span className="text-[10px] text-slate-400">Standard: 587 (TLS/STARTTLS) or 465 (SSL)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sender User Email:
              </label>
              <input
                type="email"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                placeholder="andreramiers@gmail.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Google 16-Character App Password:
              </label>
              <input
                type="password"
                value={smtpConfig.pass}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                placeholder="abcd efgh ijkl mnop"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0097B2]"
              />
              <span className="text-[10px] text-slate-400">
                Created at Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords
              </span>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 space-y-2.5">
            <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-indigo-600" />
              <span>Verify & Send Real Test Email to Your Inbox</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="andreramiers@gmail.com"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                disabled={isTestingSmtp}
                onClick={async () => {
                  if (!smtpConfig.user || !smtpConfig.pass) {
                    setSmtpTestResult({
                      text: 'Please enter both User Email and Google App Password above before testing.',
                      type: 'error',
                    });
                    return;
                  }
                  setIsTestingSmtp(true);
                  setSmtpTestResult(null);
                  try {
                    saveStoredSmtpConfig({ ...smtpConfig, isConfigured: true });
                    const res = await fetch('/api/test-smtp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        host: smtpConfig.host || 'smtp.gmail.com',
                        port: Number(smtpConfig.port) || 587,
                        user: smtpConfig.user.trim(),
                        pass: smtpConfig.pass.trim(),
                        toEmail: testEmailTo.trim() || smtpConfig.user.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'SMTP verification failed');
                    setSmtpTestResult({
                      text: `✅ Verified! Real test email was delivered to ${testEmailTo || smtpConfig.user}.`,
                      type: 'success',
                    });
                    onShowToast(`Live test email delivered to ${testEmailTo || smtpConfig.user}!`);
                  } catch (err: any) {
                    setSmtpTestResult({
                      text: `❌ Connection failed: ${err.message}. Hint: Ensure 2-Step Verification is on, then generate an App Password in your Google Account.`,
                      type: 'error',
                    });
                    onShowToast(`SMTP Error: ${err.message}`);
                  } finally {
                    setIsTestingSmtp(false);
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isTestingSmtp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {smtpTestResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-medium ${
                  smtpTestResult.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-700'
                }`}
              >
                {smtpTestResult.text}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E2A5E] hover:bg-[#162047] text-white dark:bg-amber-400 dark:text-[#1E2A5E] shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save SMTP Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
