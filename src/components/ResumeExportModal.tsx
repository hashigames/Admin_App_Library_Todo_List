import React, { useState } from 'react';
import {
  X,
  Mail,
  Smartphone,
  FileSpreadsheet,
  FileText,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  BookOpen,
  Users,
  Table2,
} from 'lucide-react';
import { Book, EquipmentUser, Loan, DynamicDatabase } from '../types';
import {
  exportDatabaseToExcel,
  exportDatabaseToPdf,
  exportLibraryToExcel,
  exportLibraryToPdf,
  exportEquipmentToExcel,
  exportEquipmentToPdf,
  sendResumeReportApi,
} from '../services/databaseExporter';
import { CountryPhoneInput } from './CountryPhoneInput';
import {
  parseMultipleEmails,
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildWhatsAppUrl,
  buildSmsUrl,
} from '../services/shareUtils';

interface ResumeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: 'todolist' | 'library' | 'equipment' | 'all';
  books: Book[];
  topics: string[];
  equipmentList: EquipmentUser[];
  loans: Loan[];
  databases: DynamicDatabase[];
  selectedDatabase?: DynamicDatabase | null;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUserEmail?: string;
}

export const ResumeExportModal: React.FC<ResumeExportModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'todolist',
  books,
  topics,
  equipmentList,
  loans,
  databases,
  selectedDatabase,
  onShowToast,
  currentUserEmail,
}) => {
  const [target, setTarget] = useState<'todolist' | 'library' | 'equipment' | 'all'>(defaultTarget);
  const [selectedDbId, setSelectedDbId] = useState<string>(
    selectedDatabase ? selectedDatabase.id : databases[0]?.id || ''
  );
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState<string>(currentUserEmail || '');
  const [phone, setPhone] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDb = databases.find(d => d.id === selectedDbId) || selectedDatabase || databases[0];

  const getItemCount = () => {
    switch (target) {
      case 'todolist':
        return currentDb ? currentDb.rows.length : 0;
      case 'library':
        return books.length;
      case 'equipment':
        return equipmentList.length;
      case 'all':
        return books.length + equipmentList.length + databases.length;
    }
  };

  const getTargetTitle = () => {
    switch (target) {
      case 'todolist':
        return currentDb ? `TodoList: ${currentDb.name}` : 'All TodoLists Resume';
      case 'library':
        return 'Library Shelves & Books Catalog Resume';
      case 'equipment':
        return 'Equipment & Gundam Team Roster Resume';
      case 'all':
        return 'Lighthouse Hashi Full System Master Resume';
    }
  };

  const handleDownload = () => {
    try {
      if (target === 'todolist') {
        if (!currentDb) {
          onShowToast('Please create or select a TodoList database first.', 'error');
          return;
        }
        if (format === 'excel') exportDatabaseToExcel(currentDb);
        else exportDatabaseToPdf(currentDb);
        onShowToast(`Downloaded ${currentDb.name} as ${format.toUpperCase()}`);
      } else if (target === 'library') {
        if (format === 'excel') exportLibraryToExcel(books, topics);
        else exportLibraryToPdf(books, topics);
        onShowToast(`Downloaded Library Shelves resume as ${format.toUpperCase()}`);
      } else if (target === 'equipment') {
        if (format === 'excel') exportEquipmentToExcel(equipmentList, loans);
        else exportEquipmentToPdf(equipmentList, loans);
        onShowToast(`Downloaded Equipment Roster resume as ${format.toUpperCase()}`);
      } else {
        // All: export library as primary + show toast
        if (format === 'excel') {
          exportLibraryToExcel(books, topics);
          if (currentDb) exportDatabaseToExcel(currentDb);
        } else {
          exportLibraryToPdf(books, topics);
        }
        onShowToast(`Exported full system resume as ${format.toUpperCase()}`);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      onShowToast(`Export failed: ${err.message}`, 'error');
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsing = parseMultipleEmails(email);

    if (channel === 'email') {
      if (emailParsing.valid.length === 0) {
        onShowToast('Please enter at least one valid recipient email address.', 'error');
        return;
      }
      if (emailParsing.invalid.length > 0) {
        onShowToast(
          `Invalid email format: ${emailParsing.invalid.join(', ')}. Separate multiple emails with a comma (,).`,
          'error'
        );
        return;
      }
    }
    if (channel === 'sms' && !phone.trim()) {
      onShowToast('Please enter a cellphone number for SMS dispatch.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSuccessStatus(null);

    try {
      const summaryTitle = getTargetTitle();
      const itemCount = getItemCount();

      const res = await sendResumeReportApi({
        target,
        channel,
        email: channel === 'email' ? emailParsing.valid.join(', ') : undefined,
        emails: channel === 'email' ? emailParsing.valid : undefined,
        phone: channel === 'sms' ? phone.trim() : undefined,
        format,
        summaryTitle,
        itemCount,
        customNote: customNote.trim() || undefined,
      });

      const count = emailParsing.valid.length;
      if (channel === 'email') {
        if (res.isLiveSmtpSent) {
          setSuccessStatus(
            `✅ Live Email delivered via SMTP to ${count} recipient(s): [${emailParsing.valid.join(', ')}] with ${format.toUpperCase()} report attached! Check your inbox.`
          );
        } else {
          setSuccessStatus(
            `⚠️ Report generated for ${count} recipient(s): [${emailParsing.valid.join(', ')}]. Note: Live SMTP is not configured on the server yet. Click "Open in Gmail" above to send live immediately with 1 click!`
          );
        }
      } else {
        setSuccessStatus(`Sent SMS alert notification to ${phone} successfully!`);
      }
      onShowToast(res.message || 'Report dispatched successfully!', 'success');
    } catch (err: any) {
      console.error('Dispatch error:', err);
      onShowToast(`Dispatch failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#EAE2D2] dark:border-[#38322B] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#2B2520] text-[#FAF6EE] flex items-center justify-between border-b border-[#38322B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="w-5 h-5 text-[#C88A35]" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif-jp">Export & Dispatch Resume Reports</h2>
              <p className="text-xs text-[#DECFA9]">
                Send Excel or PDF summaries via Email or Cellphone SMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Select Category (Kept Strictly Separated) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E] mb-2">
              1. Select Resume Scope (Organized & Separated)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTarget('todolist')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  target === 'todolist'
                    ? 'border-[#BD3A2B] bg-[#BD3A2B]/10 text-[#BD3A2B] font-bold shadow-xs'
                    : 'border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE]'
                }`}
              >
                <Table2 className="w-5 h-5 mb-1" />
                <span className="text-xs">TodoList Matrix</span>
                <span className="text-[10px] text-[#736859]">{databases.length} Lists</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget('library')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  target === 'library'
                    ? 'border-[#C88A35] bg-[#C88A35]/10 text-[#C88A35] font-bold shadow-xs'
                    : 'border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE]'
                }`}
              >
                <BookOpen className="w-5 h-5 mb-1 text-[#C88A35]" />
                <span className="text-xs">Library Shelves</span>
                <span className="text-[10px] text-slate-400">{books.length} Books</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget('equipment')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  target === 'equipment'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-5 h-5 mb-1 text-emerald-600" />
                <span className="text-xs">Equipment Roster</span>
                <span className="text-[10px] text-slate-400">{equipmentList.length} Units</span>
              </button>
            </div>
          </div>

          {/* Specific TodoList Selector if target is TodoList */}
          {target === 'todolist' && databases.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Target TodoList Database:</span>
                <span className="text-[11px] text-[#C88A35] font-mono">
                  {currentDb?.columns.length} cols × {currentDb?.rows.length} rows
                </span>
              </label>
              <select
                value={selectedDbId}
                onChange={e => setSelectedDbId(e.target.value)}
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 outline-none"
              >
                {databases.map(db => (
                  <option key={db.id} value={db.id}>
                    {db.name} (by {db.author || 'User'} - {db.rows.length} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Format & Download option */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Document Format & Instant Download
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Excel Spreadsheet (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                  format === 'pdf'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>PDF Document (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                title="Direct Download to device"
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FFFFFF] dark:bg-[#201C19] hover:bg-[#F5EFE3] text-[#2B2520] dark:text-[#FAF6EE] text-xs font-bold border border-[#EAE2D2] dark:border-[#38322B] transition active:scale-95 shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#C88A35]" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Step 3: Remote Dispatch (Email or SMS) */}
          <form onSubmit={handleDispatch} className="space-y-4 pt-2 border-t border-[#EAE2D2] dark:border-[#38322B]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#736859] dark:text-[#A89D8E]">
                3. Send Via Email or Cellphone Alert
              </label>
              <div className="flex rounded-lg bg-[#FAF6EE] dark:bg-[#201C19] p-0.5 border border-[#EAE2D2] dark:border-[#38322B] text-xs">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition ${
                    channel === 'email'
                      ? 'bg-[#FFFFFF] dark:bg-[#2B2520] text-[#2B2520] dark:text-[#FAF6EE] shadow-2xs'
                      : 'text-[#736859] hover:text-[#2B2520]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-[#C88A35]" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition ${
                    channel === 'sms'
                      ? 'bg-[#FFFFFF] dark:bg-[#2B2520] text-[#2B2520] dark:text-[#FAF6EE] shadow-2xs'
                      : 'text-[#736859] hover:text-[#2B2520]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#BD3A2B]" />
                  <span>SMS Cellphone</span>
                </button>
              </div>
            </div>

            {channel === 'email' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2B2520] dark:text-[#FAF6EE]">
                    Recipient Email Address(es):
                  </label>
                  <span className="text-[11px] text-[#C88A35] font-medium">
                    Separate multiple emails with comma (,)
                  </span>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. lead.architect@company.com, engineer@domain.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] rounded-lg p-2.5 text-[#2B2520] dark:text-[#FAF6EE] outline-none focus:ring-2 focus:ring-[#C88A35]"
                />
                {/* Email parsed tags */}
                {(() => {
                  const p = parseMultipleEmails(email);
                  if (p.valid.length === 0 && p.invalid.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {p.valid.map((em, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{em}</span>
                        </span>
                      ))}
                      {p.invalid.map((inv, idx) => (
                        <span
                          key={`inv-${idx}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-700"
                        >
                          <span>Invalid: {inv}</span>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recipient Cellphone (Indicate Country):
                </label>
                <CountryPhoneInput
                  value={phone}
                  onChange={(fullPhone) => setPhone(fullPhone)}
                  required
                  placeholder="300 123 4567"
                />
              </div>
            )}

            {/* Quick Live Actions for Instant Dispatch */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Live One-Click Launchers:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = parseMultipleEmails(email);
                    const to = p.valid.length > 0 ? p.valid : [email.trim()];
                    const url = buildGmailComposeUrl({
                      recipients: to,
                      subject: `[Lighthouse Hashi] ${getTargetTitle()}`,
                      body: `Resume Report: ${getTargetTitle()}\nItems: ${getItemCount()}\nNote: ${customNote || 'None'}\n\nGenerated via Lighthouse Hashi Library.`,
                    });
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 shadow-xs hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Open in Gmail
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = parseMultipleEmails(email);
                    const to = p.valid.length > 0 ? p.valid : [email.trim()];
                    const url = buildMailtoUrl({
                      recipients: to,
                      subject: `[Lighthouse Hashi] ${getTargetTitle()}`,
                      body: `Resume Report: ${getTargetTitle()}\nItems: ${getItemCount()}\nNote: ${customNote || 'None'}`,
                    });
                    window.location.href = url;
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  Default Mail App
                </button>

                {channel === 'sms' && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = buildWhatsAppUrl({
                        phone,
                        message: `[Lighthouse Hashi Alert] Resume: ${getTargetTitle()} (${getItemCount()} items). Note: ${customNote || 'None'}`,
                      });
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    Send via WhatsApp
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custom Message / Notes (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Weekly status report resume attached for review"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            {successStatus && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successStatus}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#BD3A2B] hover:bg-[#A83225] shadow-xs transition disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send {channel === 'email' ? 'Email' : 'SMS Alert'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
