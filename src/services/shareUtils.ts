import { DynamicDatabase } from '../types';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
  isConfigured: boolean;
}

export function getStoredSmtpConfig(): SmtpConfig {
  if (typeof window === 'undefined') {
    return { host: '', port: 587, user: '', pass: '', isConfigured: false };
  }
  try {
    const raw = localStorage.getItem('lighthouse_smtp_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { host: '', port: 587, user: '', pass: '', isConfigured: false };
}

export function saveStoredSmtpConfig(config: SmtpConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lighthouse_smtp_config', JSON.stringify(config));
}

/**
 * Splits comma (,) or semicolon (;) separated emails, trims each, and validates syntax.
 */
export function parseMultipleEmails(rawInput: string): {
  valid: string[];
  invalid: string[];
  all: string[];
} {
  if (!rawInput) return { valid: [], invalid: [], all: [] };

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const parts = rawInput
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const valid: string[] = [];
  const invalid: string[] = [];

  parts.forEach((email) => {
    if (emailRegex.test(email)) {
      if (!valid.includes(email)) {
        valid.push(email);
      }
    } else {
      if (!invalid.includes(email)) {
        invalid.push(email);
      }
    }
  });

  return { valid, invalid, all: parts };
}

/**
 * Generates formatted text summary of a TodoList matrix for email and messaging
 */
export function formatDatabaseTextSummary(
  db: DynamicDatabase,
  customNote?: string
): string {
  const lines: string[] = [];
  lines.push(`📋 LIGHTHOUSE HASHI LIBRARY - TODOLIST DATABASE MATRIX`);
  lines.push(`Database: ${db.name}`);
  lines.push(`Author: ${db.author || 'User'}`);
  if (db.authorEmail) lines.push(`Contact: ${db.authorEmail}`);
  if (db.deadline) lines.push(`Deadline: ${new Date(db.deadline).toLocaleString()}`);
  lines.push(`Dimensions: ${db.columns.length} Columns x ${db.rows.length} Rows`);
  lines.push('');

  if (customNote && customNote.trim()) {
    lines.push(`Note from Sender:`);
    lines.push(`"${customNote.trim()}"`);
    lines.push('');
  }

  lines.push(`--- TABLE COLUMNS ---`);
  lines.push(db.columns.map((c) => c.name).join(' | '));
  lines.push('');

  lines.push(`--- DATA ROWS (First 15 items) ---`);
  db.rows.slice(0, 15).forEach((row, idx) => {
    const rowVals = db.columns.map((c) => row.cells[c.id] || '-');
    lines.push(`${idx + 1}. ${rowVals.join(' | ')}`);
  });

  if (db.rows.length > 15) {
    lines.push(`... and ${db.rows.length - 15} more rows.`);
  }

  lines.push('');
  lines.push(`Generated via Lighthouse Hashi Library system.`);
  return lines.join('\n');
}

/**
 * Builds direct Gmail Web Compose URL (opens Gmail in browser tab with to, subject, body pre-filled)
 */
export function buildGmailComposeUrl(params: {
  recipients: string[];
  subject: string;
  body: string;
}): string {
  const to = params.recipients.join(',');
  const su = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${su}&body=${body}`;
}

/**
 * Builds mailto: link for native email client (Outlook, Apple Mail, Thunderbird)
 */
export function buildMailtoUrl(params: {
  recipients: string[];
  subject: string;
  body: string;
}): string {
  const to = params.recipients.join(',');
  const su = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${to}?subject=${su}&body=${body}`;
}

/**
 * Builds WhatsApp direct share link
 */
export function buildWhatsAppUrl(params: {
  phone: string;
  message: string;
}): string {
  const cleanPhone = params.phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(params.message);
  if (cleanPhone.length > 5) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Builds SMS direct share link
 */
export function buildSmsUrl(params: {
  phone: string;
  message: string;
}): string {
  const cleanPhone = params.phone.replace(/[^0-9+]/g, '');
  const encodedBody = encodeURIComponent(params.message);
  return `sms:${cleanPhone}?body=${encodedBody}`;
}
