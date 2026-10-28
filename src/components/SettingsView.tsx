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
      <div className="p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-[#2B2520] text-[#FAF6EE]">
            <Database className="w-4 h-4 text-[#C88A35]" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2B2520] dark:text-[#FAF6EE] font-serif-jp">
            {t.firebaseTitle}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#736859] dark:text-[#A89D8E]">
          {t.firebaseSubtitle}
        </p>
      </div>

      {/* Firebase Status Alert */}
      <div className="p-4 rounded-2xl bg-[#F5EFE3] dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#C88A35] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[#2B2520] dark:text-[#FAF6EE]">
            Persistent Hybrid Storage Architecture
          </p>
          <p className="text-[#5C5348] dark:text-[#DECFA9] leading-relaxed">
            The application operates with zero friction: by default, all books, equipment, and loans
            persist reliably in local browser storage. When you paste your Firebase project credentials
            below, the system automatically routes all catalog updates to Cloud Firestore and Firebase Storage.
          </p>
        </div>
      </div>

      {/* Firebase Credentials Form */}
      <div className="p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] space-y-5">
        <h2 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#C88A35]" />
          <span>Firebase Project Keys (Placeholders / Custom Keys)</span>
        </h2>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase block mb-1">
              {t.apiKeyLabel}
            </label>
            <input
              type="text"
              value={config.apiKey}
              onChange={e => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] font-mono outline-none focus:ring-1 focus:ring-[#C88A35]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase block mb-1">
              {t.projectIdLabel}
            </label>
            <input
              type="text"
              value={config.projectId}
              onChange={e => setConfig({ ...config, projectId: e.target.value })}
              placeholder="lighthouse-hashi-app"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] font-mono outline-none focus:ring-1 focus:ring-[#C88A35]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase block mb-1">
              {t.storageBucketLabel}
            </label>
            <input
              type="text"
              value={config.storageBucket}
              onChange={e => setConfig({ ...config, storageBucket: e.target.value })}
              placeholder="lighthouse-hashi-app.appspot.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] font-mono outline-none focus:ring-1 focus:ring-[#C88A35]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#736859] dark:text-[#A89D8E] uppercase block mb-1">
              App ID
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={e => setConfig({ ...config, appId: e.target.value })}
              placeholder="1:123456789:web:abcdef"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] font-mono outline-none focus:ring-1 focus:ring-[#C88A35]"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex items-center justify-between">
            <span className="text-xs text-[#A89D8E]">
              Changes will save to browser memory and switch active SDK mode.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#2B2520] hover:bg-[#3D352E] text-[#FAF6EE] text-xs font-bold shadow-sm transition cursor-pointer"
            >
              {isSaving ? t.loading : t.saveConfig}
            </button>
          </div>
        </form>
      </div>

      {/* Firestore Security Rules Display */}
      <div className="p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4A6B53]" />
            <h2 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE]">
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
      <div className="p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] space-y-4">
        <h2 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-2">
          <Server className="w-4 h-4 text-[#C88A35]" />
          <span>Data Management & Backup</span>
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5EFE3] dark:bg-[#2B2520] text-[#2B2520] dark:text-[#FAF6EE] hover:bg-[#EAE2D2] text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportData}</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5EFE3] dark:bg-[#2B2520] text-[#2B2520] dark:text-[#FAF6EE] hover:bg-[#EAE2D2] text-xs font-bold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>{t.importData}</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#BD3A2B]/30 text-[#BD3A2B] hover:bg-[#BD3A2B]/10 text-xs font-bold ml-auto cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDemoData}</span>
          </button>
        </div>
      </div>

      {/* Live Email & SMTP Dispatch Configuration Card */}
      <div className="p-6 rounded-3xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE2D2] dark:border-[#38322B] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#2B2520] text-[#FAF6EE]">
              <Mail className="w-5 h-5 text-[#C88A35]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-2 font-serif-jp">
                <span>Live Email & SMTP Dispatch Settings</span>
                {smtpConfig.isConfigured ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#4A6B53]/15 text-[#324D3B] dark:bg-[#4A6B53]/30 dark:text-[#7EB38B] border border-[#4A6B53]/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C88A35]/15 text-[#8A5A18] dark:text-[#DECFA9] border border-[#C88A35]/30">
                    Not configured
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#736859] dark:text-[#A89D8E]">
                Configure live server-side email delivery with Excel and PDF attachments
              </p>
            </div>
          </div>
        </div>

        {/* Informative FAQ Q&A addressing user questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F5EFE3] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] space-y-1">
            <h3 className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#C88A35]" />
              <span>Why did the email not arrive previously?</span>
            </h3>
            <p className="text-[#5C5348] dark:text-[#DECFA9] text-[11px] leading-relaxed">
              In any cloud application, sending a direct email into a personal Gmail or Outlook inbox requires an authenticated SMTP mail gateway (such as a 16-character Google App Password or SendGrid). Without SMTP credentials, automated emails cannot be transmitted across the internet.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F5EFE3] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] space-y-1">
            <h3 className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#4A6B53]" />
              <span>Do I have to publish to allow this feature to work?</span>
            </h3>
            <p className="text-[#5C5348] dark:text-[#DECFA9] text-[11px] leading-relaxed">
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
              <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] mb-1">
                SMTP Host Server:
              </label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />
              <span className="text-[10px] text-[#A89D8E]">Use smtp.gmail.com for Gmail accounts</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] mb-1">
                SMTP Port:
              </label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                placeholder="587"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />
              <span className="text-[10px] text-[#A89D8E]">Standard: 587 (TLS/STARTTLS) or 465 (SSL)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] mb-1">
                Sender User Email:
              </label>
              <input
                type="email"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                placeholder="andreramiers@gmail.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#736859] dark:text-[#A89D8E] mb-1">
                Google 16-Character App Password:
              </label>
              <input
                type="password"
                value={smtpConfig.pass}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                placeholder="abcd efgh ijkl mnop"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />
              <span className="text-[10px] text-[#A89D8E]">
                Created at Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords
              </span>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="p-4 rounded-2xl bg-[#F5EFE3] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] space-y-2.5">
            <h3 className="text-xs font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 font-serif-jp">
              <Send className="w-3.5 h-3.5 text-[#C88A35]" />
              <span>Verify & Send Real Test Email to Your Inbox</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="andreramiers@gmail.com"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE]"
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
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#BD3A2B] hover:bg-[#A83225] text-white shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                {isTestingSmtp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#FAF6EE]" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {smtpTestResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-medium ${
                  smtpTestResult.type === 'success'
                    ? 'bg-[#4A6B53]/15 text-[#324D3B] dark:bg-[#4A6B53]/30 dark:text-[#7EB38B] border border-[#4A6B53]/40'
                    : 'bg-[#BD3A2B]/15 text-[#BD3A2B] dark:text-[#FF8D80] border border-[#BD3A2B]/30'
                }`}
              >
                {smtpTestResult.text}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#2B2520] hover:bg-[#3D352E] text-[#FAF6EE] shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#C88A35]" />
              <span>Save SMTP Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
