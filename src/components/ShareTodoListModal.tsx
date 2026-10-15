import React, { useState } from 'react';
import {
  X,
  Share2,
  Mail,
  Smartphone,
  FileSpreadsheet,
  FileText,
  Send,
  Download,
  CheckCircle2,
  Table2,
  Calendar,
  Sparkles,
  Loader2,
  ExternalLink,
  MessageSquare,
  Copy,
  AlertCircle,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
} from 'lucide-react';
import { DynamicDatabase } from '../types';
import {
  exportDatabaseToExcel,
  exportDatabaseToPdf,
  sendDatabaseEmailApi,
  sendSmsReminderApi,
} from '../services/databaseExporter';
import { CountryPhoneInput, CountryOption, COUNTRIES } from './CountryPhoneInput';
import {
  parseMultipleEmails,
  formatDatabaseTextSummary,
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildWhatsAppUrl,
  buildSmsUrl,
  getStoredSmtpConfig,
  saveStoredSmtpConfig,
  SmtpConfig,
} from '../services/shareUtils';

interface ShareTodoListModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: DynamicDatabase | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUserEmail?: string;
}

export const ShareTodoListModal: React.FC<ShareTodoListModalProps> = ({
  isOpen,
  onClose,
  database,
  onShowToast,
  currentUserEmail,
}) => {
  if (!isOpen || !database) return null;

  const [shareMethod, setShareMethod] = useState<'email' | 'cellphone' | 'both'>('email');
  const [recipientEmail, setRecipientEmail] = useState<string>(
    database.authorEmail || currentUserEmail || 'andreramiers@gmail.com'
  );
  const [recipientPhone, setRecipientPhone] = useState<string>(
    database.authorPhone || '+57 310 456 7890'
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [reportFormat, setReportFormat] = useState<'excel' | 'pdf'>('excel');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [alsoDownloadCopy, setAlsoDownloadCopy] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Delivery status details
  const [deliveryResult, setDeliveryResult] = useState<{
    success: boolean;
    isLiveSmtpSent: boolean;
    smtpConfigured: boolean;
    recipients: string[];
    summary: string;
    notice?: string;
  } | null>(null);

  // In-modal SMTP Settings Drawer
  const [showSmtpDrawer, setShowSmtpDrawer] = useState<boolean>(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const stored = getStoredSmtpConfig();
    return {
      host: stored.host || 'smtp.gmail.com',
      port: stored.port || 587,
      user: stored.user || currentUserEmail || 'andreramiers@gmail.com',
      pass: stored.pass || '',
      isConfigured: stored.isConfigured || false,
    };
  });
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [smtpStatusMsg, setSmtpStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Parse multi-emails separated by comma or semicolon
  const emailParsing = parseMultipleEmails(recipientEmail);

  const handleDownload = () => {
    try {
      if (reportFormat === 'excel') {
        exportDatabaseToExcel(database);
        onShowToast(`Downloaded "${database.name}.xlsx" to your computer.`, 'success');
      } else {
        exportDatabaseToPdf(database);
        onShowToast(`Downloaded "${database.name}.pdf" to your computer.`, 'success');
      }
    } catch (e: any) {
      onShowToast(`Download failed: ${e.message}`, 'error');
    }
  };

  const handleSaveAndTestSmtp = async () => {
    if (!smtpConfig.user || !smtpConfig.pass) {
      setSmtpStatusMsg({ text: 'Please enter both your Email/User and App Password.', type: 'error' });
      return;
    }

    setIsTestingSmtp(true);
    setSmtpStatusMsg(null);

    try {
      const cfgToSave: SmtpConfig = {
        ...smtpConfig,
        isConfigured: true,
      };
      saveStoredSmtpConfig(cfgToSave);

      const targetTestRecipient = emailParsing.valid[0] || smtpConfig.user;
      const resp = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpConfig.host || 'smtp.gmail.com',
          port: Number(smtpConfig.port) || 587,
          user: smtpConfig.user.trim(),
          pass: smtpConfig.pass.trim(),
          toEmail: targetTestRecipient,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'SMTP verification failed');
      }

      setSmtpStatusMsg({
        text: `✅ Verified! Live test email dispatched to ${targetTestRecipient}. Live background sending is now active.`,
        type: 'success',
      });
      onShowToast(`SMTP verified! Test email dispatched to ${targetTestRecipient}.`, 'success');
    } catch (err: any) {
      setSmtpStatusMsg({
        text: `❌ Connection error: ${err.message}. Make sure to generate a 16-character App Password in Google Account settings.`,
        type: 'error',
      });
      onShowToast(`SMTP Test Error: ${err.message}`, 'error');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setDeliveryResult(null);

    try {
      let isLiveSmtp = false;
      let smtpConfigured = false;

      // 1. Send via Email if selected
      if (shareMethod === 'email' || shareMethod === 'both') {
        if (emailParsing.valid.length === 0) {
          throw new Error('Please enter at least one valid email address (e.g., andreramiers@gmail.com). Separate multiple with a comma (,).');
        }
        if (emailParsing.invalid.length > 0) {
          throw new Error(
            `Invalid email format detected: "${emailParsing.invalid.join(', ')}". Please separate multiple emails with a comma (,)`
          );
        }

        const emailResp = await sendDatabaseEmailApi({
          email: emailParsing.valid.join(', '),
          emails: emailParsing.valid,
          database,
          format: reportFormat,
          customNote: customMessage,
          attachFile: true,
        });

        isLiveSmtp = Boolean(emailResp?.isLiveSmtpSent);
        smtpConfigured = Boolean(emailResp?.smtpConfigured);
      }

      // 2. Send via Cellphone / SMS if selected
      if (shareMethod === 'cellphone' || shareMethod === 'both') {
        if (!recipientPhone || recipientPhone.length < 8) {
          throw new Error('Please enter a valid cellphone number with country code');
        }
        await sendSmsReminderApi({
          phone: recipientPhone.trim(),
          database,
        });
      }

      // 3. Only download locally IF user explicitly checked the box!
      if (alsoDownloadCopy) {
        if (reportFormat === 'excel') {
          exportDatabaseToExcel(database);
        } else {
          exportDatabaseToPdf(database);
        }
      }

      const count = emailParsing.valid.length;
      const recipientsStr = emailParsing.valid.join(', ');

      if (shareMethod === 'cellphone') {
        setDeliveryResult({
          success: true,
          isLiveSmtpSent: false,
          smtpConfigured: false,
          recipients: [],
          summary: `Dispatched SMS reminder alert to ${selectedCountry.name} (${recipientPhone})!`,
        });
        onShowToast(`SMS notification dispatched to ${recipientPhone}!`, 'success');
      } else if (isLiveSmtp) {
        const summary = `✅ Live Email delivered via SMTP to ${count} recipient(s): [${recipientsStr}] with ${reportFormat.toUpperCase()} report attached! Check your inbox.`;
        setDeliveryResult({
          success: true,
          isLiveSmtpSent: true,
          smtpConfigured: true,
          recipients: emailParsing.valid,
          summary,
        });
        onShowToast(summary, 'success');
      } else {
        // SMTP not configured on server
        const summary = `Report prepared for ${count} recipient(s): [${recipientsStr}].`;
        const notice = `⚠️ Live SMTP is not configured yet on the server, so no automated email could reach your inbox. Click "Open in Gmail" below to send live instantly in 1 click, or configure your SMTP App Password.`;
        setDeliveryResult({
          success: true,
          isLiveSmtpSent: false,
          smtpConfigured: false,
          recipients: emailParsing.valid,
          summary,
          notice,
        });
        onShowToast(`Report prepared. Use 'Open in Gmail' to send live immediately!`, 'info');
      }
    } catch (err: any) {
      console.error('Share error:', err);
      onShowToast(err.message || 'Failed to share TodoList', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Direct Live External Launchers
  const handleOpenGmail = () => {
    const textSummary = formatDatabaseTextSummary(database, customMessage);
    const recipients = emailParsing.valid.length > 0 ? emailParsing.valid : [recipientEmail.trim()];
    const url = buildGmailComposeUrl({
      recipients,
      subject: `[TodoList Matrix] ${database.name} - Lighthouse Hashi Library`,
      body: textSummary,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    onShowToast(`Opened Gmail web composer with ${recipients.length} recipient(s)! Ready to send.`, 'info');
  };

  const handleOpenMailto = () => {
    const textSummary = formatDatabaseTextSummary(database, customMessage);
    const recipients = emailParsing.valid.length > 0 ? emailParsing.valid : [recipientEmail.trim()];
    const url = buildMailtoUrl({
      recipients,
      subject: `[TodoList Matrix] ${database.name}`,
      body: textSummary,
    });
    window.location.href = url;
    onShowToast(`Opened default mail client with ${recipients.length} recipient(s)!`, 'info');
  };

  const handleOpenWhatsApp = () => {
    const textSummary = formatDatabaseTextSummary(database, customMessage);
    const url = buildWhatsAppUrl({
      phone: recipientPhone,
      message: textSummary,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    onShowToast(`Opened WhatsApp with TodoList summary!`, 'info');
  };

  const handleOpenSms = () => {
    const textSummary = `[Lighthouse Hashi] TodoList Matrix: "${database.name}" (${database.columns.length} cols x ${database.rows.length} rows). Deadline: ${database.deadline || 'None'}. Full table sent to your email.`;
    const url = buildSmsUrl({
      phone: recipientPhone,
      message: textSummary,
    });
    window.location.href = url;
    onShowToast(`Opened SMS messenger with prefilled alert!`, 'info');
  };

  const handleCopySummary = async () => {
    try {
      const summary = formatDatabaseTextSummary(database, customMessage);
      await navigator.clipboard.writeText(summary);
      onShowToast('Copied full formatted TodoList matrix summary to clipboard!', 'success');
    } catch (err) {
      onShowToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-linear-to-r from-[#1E2A5E] to-[#0097B2] text-white shadow-xs">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Share Matrix to Customer / Team</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0097B2]/10 text-[#0097B2] border border-[#0097B2]/30">
                  Live Dispatch
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send by Email (multi-recipient, comma-separated) or Cellphone SMS / WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Database Summary Banner */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#0097B2]" />
              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                {database.name}
              </strong>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Author: {database.author || 'User'} • {database.columns.length} columns × {database.rows.length} rows
            </p>
          </div>
          {database.deadline && (
            <div className="text-right text-[11px] text-amber-700 dark:text-amber-400 font-mono">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {new Date(database.deadline).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Share Channel Method Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            1. Choose Sharing Channel
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShareMethod('email')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition cursor-pointer ${
                shareMethod === 'email'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Email</span>
            </button>

            <button
              type="button"
              onClick={() => setShareMethod('cellphone')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition cursor-pointer ${
                shareMethod === 'cellphone'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Cellphone / SMS</span>
            </button>

            <button
              type="button"
              onClick={() => setShareMethod('both')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition cursor-pointer ${
                shareMethod === 'both'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Email + SMS</span>
            </button>
          </div>
        </div>

        {/* Input Fields Form */}
        <form onSubmit={handleShareSubmit} className="space-y-3.5">
          {/* Multiple Email Input */}
          {(shareMethod === 'email' || shareMethod === 'both') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Customer Email Address(es) (Multiple allowed, separated by comma):
                </label>
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  e.g., andreramiers@gmail.com, team@company.com
                </span>
              </div>
              <textarea
                rows={2}
                required={shareMethod === 'email' || shareMethod === 'both'}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="andreramiers@gmail.com, colleague@company.com, boss@enterprise.com"
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {/* Multi-email badges indicator */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {emailParsing.valid.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{email}</span>
                  </span>
                ))}
                {emailParsing.invalid.map((invalidToken, idx) => (
                  <span
                    key={`inv-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-700"
                    title="Please fix this email format"
                  >
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <span>Invalid: {invalidToken}</span>
                  </span>
                ))}
                {emailParsing.valid.length > 1 && (
                  <span className="text-[11px] font-bold text-slate-500">
                    ({emailParsing.valid.length} recipients)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cellphone Input with Country Code Indicator */}
          {(shareMethod === 'cellphone' || shareMethod === 'both') && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Customer Cellphone (Indicate Country):</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  SMS & WhatsApp Alert
                </span>
              </label>
              <CountryPhoneInput
                value={recipientPhone}
                onChange={(fullNumber, country) => {
                  setRecipientPhone(fullNumber);
                  setSelectedCountry(country);
                }}
                placeholder="310 456 7890"
                required={shareMethod === 'cellphone' || shareMethod === 'both'}
              />
            </div>
          )}

          {/* Report Format Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Attach Report Format:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportFormat('excel')}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  reportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel (.xlsx) Table</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportFormat('pdf')}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  reportFormat === 'pdf'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 font-bold ring-2 ring-red-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>PDF Document</span>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Optional Message to Customer:
            </label>
            <textarea
              rows={2}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Here is the requested dynamic tabular matrix report."
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0097B2]"
            />
          </div>

          {/* Local Download Checkbox */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="checkbox"
              id="alsoDownloadCopy"
              checked={alsoDownloadCopy}
              onChange={(e) => setAlsoDownloadCopy(e.target.checked)}
              className="rounded border-slate-300 text-[#0097B2] focus:ring-[#0097B2] cursor-pointer"
            />
            <label
              htmlFor="alsoDownloadCopy"
              className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none"
            >
              Also download a local copy ({reportFormat.toUpperCase()}) to this computer (Leave unchecked to share directly without downloading)
            </label>
          </div>

          {/* Delivery Result Status Card */}
          {deliveryResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                deliveryResult.isLiveSmtpSent
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {deliveryResult.isLiveSmtpSent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{deliveryResult.summary}</p>
                  {deliveryResult.notice && (
                    <p className="text-[11px] mt-1 text-slate-700 dark:text-slate-300">
                      {deliveryResult.notice}
                    </p>
                  )}
                </div>
              </div>

              {/* If SMTP was not configured, offer direct 1-click launcher right in the banner */}
              {!deliveryResult.isLiveSmtpSent && (shareMethod === 'email' || shareMethod === 'both') && (
                <div className="pt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Gmail (Send Live Now)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSmtpDrawer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition cursor-pointer dark:bg-slate-700"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configure Live SMTP Password</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Direct Live Share Launchers */}
          <div className="p-3 bg-linear-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-900 dark:to-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Instant 1-Click Launchers (Always Works Live):
              </span>
              <button
                type="button"
                onClick={handleCopySummary}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy Table Text
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenGmail}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 shadow-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                title="Opens Gmail in browser with all comma-separated emails and table prefilled"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Gmail</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMailto}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                title="Opens default email client (Outlook, Apple Mail, Thunderbird)"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Default Mail App</span>
              </button>

              {(shareMethod === 'cellphone' || shareMethod === 'both') && (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                  title="Opens WhatsApp with full matrix summary"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              )}

              {(shareMethod === 'cellphone' || shareMethod === 'both') && (
                <button
                  type="button"
                  onClick={handleOpenSms}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 shadow-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Send via SMS App</span>
                </button>
              )}
            </div>
          </div>

          {/* Toggleable Live SMTP Configuration Drawer */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSmtpDrawer(!showSmtpDrawer)}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                <span>Direct Live SMTP Configuration (Background Sending)</span>
                {smtpConfig.isConfigured ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    Not configured
                  </span>
                )}
              </div>
              {showSmtpDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSmtpDrawer && (
              <div className="p-3 bg-white dark:bg-[#0B1120] space-y-3 text-xs border-t border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500">
                  Enter your Gmail (or custom SMTP) credentials to send emails with attachments directly from the app server into any recipient inbox without launching webmail.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Port (587 or 465)
                    </label>
                    <input
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                      placeholder="587"
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      User Email
                    </label>
                    <input
                      type="email"
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      placeholder="andreramiers@gmail.com"
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Password / Gmail App Password
                    </label>
                    <input
                      type="password"
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      placeholder="16-character app password"
                      className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {smtpStatusMsg && (
                  <div
                    className={`p-2 rounded-lg text-[11px] font-medium ${
                      smtpStatusMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {smtpStatusMsg.text}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Stored securely in your browser session for this applet.
                  </span>
                  <button
                    type="button"
                    disabled={isTestingSmtp}
                    onClick={handleSaveAndTestSmtp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E2A5E] hover:bg-[#162047] text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isTestingSmtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Save & Test SMTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {reportFormat.toUpperCase()}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-linear-to-r from-[#1E2A5E] to-[#0097B2] text-white hover:opacity-95 rounded-xl shadow-md transition disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch to Customer(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareTodoListModal;
