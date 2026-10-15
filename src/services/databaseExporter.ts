import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DynamicDatabase, Book, EquipmentUser, Loan } from '../types';
import { getStoredSmtpConfig } from './shareUtils';

/**
 * Downloads a genuine Excel (.xlsx) spreadsheet for the dynamic database
 */
export function exportDatabaseToExcel(database: DynamicDatabase) {
  const wb = XLSX.utils.book_new();

  // Prepare metadata header rows
  const metaRows: any[][] = [
    ['Lighthouse Hashi Library - Dynamic Tabular Database (TodoList)'],
    ['Database Name:', database.name],
    ['Author / Creador:', database.author || 'N/A'],
    ['Created Date:', new Date(database.createdAt).toLocaleString()],
    ['Deadline / Fecha Límite:', database.deadline ? new Date(database.deadline).toLocaleString() : 'No deadline'],
    ['Author Contact Email:', database.authorEmail || 'N/A'],
    ['Author Contact Phone:', database.authorPhone || 'N/A'],
    ['Total Columns:', database.columns.length],
    ['Total Rows (Renglones):', database.rows.length],
    [], // empty row separator
  ];

  // Column header row
  const headerRow = database.columns.map(col => col.name || 'Column');
  metaRows.push(headerRow);

  // Data rows
  database.rows.forEach(r => {
    const rowValues = database.columns.map(col => r.cells[col.id] || '');
    metaRows.push(rowValues);
  });

  const ws = XLSX.utils.aoa_to_sheet(metaRows);

  // Set column widths based on contents
  ws['!cols'] = database.columns.map(c => ({
    wch: Math.max((c.name || '').length, 18),
  }));

  const cleanSheetName = (database.name || 'Database')
    .replace(/[\\/?*[\]]/g, '_')
    .substring(0, 31);

  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

  const cleanFileName = `${database.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}

/**
 * Builds the jsPDF instance for a database without auto-downloading
 */
export function buildDatabasePdfDoc(database: DynamicDatabase): jsPDF {
  const doc = new jsPDF({
    orientation: database.columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  let cursorY = margin;

  // Header Banner
  doc.setFillColor(30, 42, 94); // Navy #1E2A5E
  doc.rect(margin, cursorY, pageWidth - margin * 2, 44, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LIGHTHOUSE HASHI LIBRARY - TABULAR DATABASE', margin + 14, cursorY + 26);

  cursorY += 56;

  // Database Info Card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 60, 4, 4, 'F');
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 60, 4, 4, 'D');

  doc.setTextColor(30, 42, 94);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(database.name, margin + 12, cursorY + 20);

  doc.setTextColor(80, 90, 110);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Author: ${database.author || 'N/A'}`, margin + 12, cursorY + 36);
  doc.text(`Email: ${database.authorEmail || 'N/A'}`, margin + 12, cursorY + 48);

  const deadlineText = database.deadline
    ? new Date(database.deadline).toLocaleString()
    : 'None scheduled';
  doc.text(`Deadline: ${deadlineText}`, margin + 260, cursorY + 36);
  doc.text(`Phone: ${database.authorPhone || 'N/A'}`, margin + 260, cursorY + 48);
  doc.text(`Dimensions: ${database.columns.length} Columns x ${database.rows.length} Rows`, margin + 440, cursorY + 36);

  cursorY += 76;

  // Table calculations
  const availableWidth = pageWidth - margin * 2;
  const colCount = Math.max(database.columns.length, 1);
  const colWidth = availableWidth / colCount;

  // Table Header
  doc.setFillColor(0, 151, 178); // Teal #0097B2
  doc.rect(margin, cursorY, availableWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  database.columns.forEach((col, idx) => {
    const x = margin + idx * colWidth + 6;
    const text = (col.name || `Col ${idx + 1}`).substring(0, 24);
    doc.text(text, x, cursorY + 15);
  });

  cursorY += 22;

  // Table Rows
  const rowHeight = 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  database.rows.forEach((row, rIdx) => {
    if (cursorY + rowHeight > pageHeight - margin - 20) {
      doc.addPage();
      cursorY = margin;

      doc.setFillColor(0, 151, 178);
      doc.rect(margin, cursorY, availableWidth, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      database.columns.forEach((col, idx) => {
        const x = margin + idx * colWidth + 6;
        doc.text((col.name || `Col ${idx + 1}`).substring(0, 24), x, cursorY + 15);
      });
      cursorY += 22;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    if (rIdx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, cursorY, availableWidth, rowHeight, 'F');
    doc.setDrawColor(235, 238, 242);
    doc.line(margin, cursorY + rowHeight, margin + availableWidth, cursorY + rowHeight);

    database.columns.forEach((col, cIdx) => {
      const cellVal = String(row.cells[col.id] || '');
      const x = margin + cIdx * colWidth + 6;
      const isUrl =
        cellVal.startsWith('http://') ||
        cellVal.startsWith('https://') ||
        cellVal.startsWith('www.') ||
        col.type === 'url' ||
        (col.name || '').toLowerCase().includes('url');

      if (isUrl && cellVal.trim()) {
        const fullUrl =
          cellVal.startsWith('http://') || cellVal.startsWith('https://')
            ? cellVal.trim()
            : `https://${cellVal.trim()}`;
        doc.setTextColor(0, 151, 178);
        doc.textWithLink(cellVal.substring(0, 32), x, cursorY + 12, { url: fullUrl });
      } else {
        doc.setTextColor(50, 60, 80);
        doc.text(cellVal.substring(0, 32), x, cursorY + 12);
      }
    });

    cursorY += rowHeight;
  });

  cursorY += 16;
  if (cursorY < pageHeight - margin) {
    doc.setTextColor(140, 150, 165);
    doc.setFontSize(7);
    doc.text(
      `Generated by Lighthouse Hashi Library TodoList System • ${new Date().toISOString()}`,
      margin,
      cursorY
    );
  }

  return doc;
}

/**
 * Downloads a styled PDF document of the tabular matrix
 */
export function exportDatabaseToPdf(database: DynamicDatabase) {
  const doc = buildDatabasePdfDoc(database);
  const cleanFileName = `${database.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Returns raw base64 string for Database PDF without triggering browser download
 */
export function getDatabasePdfBase64(database: DynamicDatabase): string {
  const doc = buildDatabasePdfDoc(database);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] || '';
}

/**
 * Returns raw base64 string for Database Excel (.xlsx) without triggering browser download
 */
export function getDatabaseExcelBase64(database: DynamicDatabase): string {
  const wb = XLSX.utils.book_new();
  const metaRows: any[][] = [
    ['Lighthouse Hashi Library - Dynamic Tabular Database (TodoList)'],
    ['Database Name:', database.name],
    ['Author:', database.author || 'N/A'],
    ['Created Date:', new Date(database.createdAt).toLocaleString()],
    ['Deadline:', database.deadline ? new Date(database.deadline).toLocaleString() : 'No deadline'],
    ['Author Contact Email:', database.authorEmail || 'N/A'],
    ['Author Contact Phone:', database.authorPhone || 'N/A'],
    ['Total Columns:', database.columns.length],
    ['Total Rows:', database.rows.length],
    [],
  ];

  metaRows.push(database.columns.map(col => col.name || 'Column'));
  database.rows.forEach(r => {
    metaRows.push(database.columns.map(col => r.cells[col.id] || ''));
  });

  const ws = XLSX.utils.aoa_to_sheet(metaRows);
  ws['!cols'] = database.columns.map(c => ({
    wch: Math.max((c.name || '').length, 18),
  }));

  const cleanSheetName = (database.name || 'Database')
    .replace(/[\\/?*[\]]/g, '_')
    .substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

/**
 * Triggers backend email dispatch with Excel or PDF report
 * Supports multiple comma-separated emails or array of emails
 */
export async function sendDatabaseEmailApi(params: {
  email?: string;
  emails?: string[];
  database: DynamicDatabase;
  format: 'excel' | 'pdf';
  customNote?: string;
  attachFile?: boolean;
}) {
  let base64Attachment: string | undefined = undefined;
  const fileName = `${params.database.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${params.format === 'excel' ? 'xlsx' : 'pdf'}`;

  if (params.attachFile !== false) {
    try {
      if (params.format === 'excel') {
        base64Attachment = getDatabaseExcelBase64(params.database);
      } else {
        base64Attachment = getDatabasePdfBase64(params.database);
      }
    } catch (e) {
      console.warn('Could not generate attachment base64:', e);
    }
  }

  const resp = await fetch('/api/send-database-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      emails: params.emails,
      databaseName: params.database.name,
      author: params.database.author,
      format: params.format,
      columns: params.database.columns,
      rows: params.database.rows,
      deadline: params.database.deadline,
      customNote: params.customNote,
      attachmentBase64: base64Attachment,
      attachmentFilename: fileName,
      smtpConfig: getStoredSmtpConfig(),
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to dispatch email');
  }

  return await resp.json();
}


/**
 * Triggers backend SMS deadline reminder
 */
export async function sendSmsReminderApi(params: {
  phone: string;
  database: DynamicDatabase;
}) {
  const resp = await fetch('/api/send-sms-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: params.phone,
      databaseName: params.database.name,
      author: params.database.author,
      deadline: params.database.deadline,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to dispatch SMS reminder');
  }

  return await resp.json();
}

/**
 * Downloads Excel spreadsheet resume of Library Shelves & Books
 */
export function exportLibraryToExcel(books: Book[], topics: string[]) {
  const wb = XLSX.utils.book_new();

  // Overview Sheet
  const overviewRows: any[][] = [
    ['LIGHTHOUSE HASHI LIBRARY - LIBRARY SHELVES & BOOKS RESUME'],
    ['Generated:', new Date().toLocaleString()],
    ['Total Books:', books.length],
    ['Total Topics / Shelves:', topics.length],
    ['Available for Loan:', books.filter(b => b.status === 'available').length],
    ['Currently On Loan:', books.filter(b => b.status === 'borrowed').length],
    [],
    ['ID', 'Title', 'Author', 'Topic / Shelf', 'Format', 'Status', 'Current Borrower', 'Due Date', 'Folder Path'],
  ];

  books.forEach(b => {
    overviewRows.push([
      b.id,
      b.title,
      b.author,
      b.topic,
      b.fileType?.toUpperCase() || 'PDF',
      b.status,
      b.borrowedByName || 'None',
      b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A',
      b.folderPath || 'Root',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(overviewRows);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 35 },
    { wch: 22 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Library_Shelves');
  XLSX.writeFile(wb, `Lighthouse_Library_Resume_${Date.now()}.xlsx`);
}

/**
 * Downloads PDF resume of Library Shelves & Books
 */
export function exportLibraryToPdf(books: Book[], topics: string[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  });

  const margin = 36;
  let cursorY = margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 42, 94); // #1E2A5E
  doc.rect(margin, cursorY, pageWidth - margin * 2, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LIGHTHOUSE HASHI LIBRARY - LIBRARY SHELVES & BOOKS RESUME', margin + 14, cursorY + 25);

  cursorY += 50;

  // Stats Box
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, cursorY, pageWidth - margin * 2, 35, 'F');
  doc.setTextColor(30, 42, 94);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Books: ${books.length}  |  Shelves/Topics: ${topics.length}  |  Available: ${books.filter(b => b.status === 'available').length}  |  On Loan: ${books.filter(b => b.status === 'borrowed').length}`, margin + 12, cursorY + 22);

  cursorY += 45;

  // Table Headers
  doc.setFillColor(230, 235, 245);
  doc.rect(margin, cursorY, pageWidth - margin * 2, 20, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Title', margin + 6, cursorY + 14);
  doc.text('Author', margin + 200, cursorY + 14);
  doc.text('Topic / Shelf', margin + 340, cursorY + 14);
  doc.text('Format', margin + 470, cursorY + 14);
  doc.text('Status', margin + 530, cursorY + 14);
  doc.text('Borrower / Due', margin + 610, cursorY + 14);

  cursorY += 24;

  doc.setFont('helvetica', 'normal');
  books.slice(0, 30).forEach((b, idx) => {
    if (cursorY > 550) {
      doc.addPage();
      cursorY = margin;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, cursorY - 10, pageWidth - margin * 2, 16, 'F');
    }
    doc.text((b.title || '').substring(0, 32), margin + 6, cursorY);
    doc.text((b.author || '').substring(0, 24), margin + 200, cursorY);
    doc.text((b.topic || '').substring(0, 20), margin + 340, cursorY);
    doc.text((b.fileType || 'pdf').toUpperCase(), margin + 470, cursorY);
    doc.text(b.status === 'borrowed' ? 'On Loan' : 'Available', margin + 530, cursorY);
    doc.text(b.borrowedByName ? `${b.borrowedByName}` : '-', margin + 610, cursorY);
    cursorY += 16;
  });

  doc.save(`Lighthouse_Library_Resume_${Date.now()}.pdf`);
}

/**
 * Downloads Excel spreadsheet resume of Equipment List
 */
export function exportEquipmentToExcel(equipment: EquipmentUser[], loans: Loan[]) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['LIGHTHOUSE HASHI LIBRARY - EQUIPMENT & TEAM ROSTER RESUME'],
    ['Generated:', new Date().toLocaleString()],
    ['Total Equipment Members:', equipment.length],
    ['Active Loans Assigned:', loans.filter(l => l.status !== 'returned').length],
    [],
    ['Equipment ID', 'Name / Unit', 'Role', 'Email', 'Active Borrows', 'Joined Date', 'Notes'],
  ];

  equipment.forEach(e => {
    rows.push([
      e.id,
      e.name,
      e.role.toUpperCase(),
      e.email || 'N/A',
      e.borrowedCount || 0,
      new Date(e.joinedAt).toLocaleDateString(),
      e.notes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 25 },
    { wch: 12 },
    { wch: 28 },
    { wch: 14 },
    { wch: 15 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Equipment_Roster');
  XLSX.writeFile(wb, `Lighthouse_Equipment_Resume_${Date.now()}.xlsx`);
}

/**
 * Downloads PDF resume of Equipment List
 */
export function exportEquipmentToPdf(equipment: EquipmentUser[], loans: Loan[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const margin = 36;
  let cursorY = margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 120, 115); // Teal #107873
  doc.rect(margin, cursorY, pageWidth - margin * 2, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LIGHTHOUSE HASHI LIBRARY - EQUIPMENT & GUNDAM ROSTER RESUME', margin + 14, cursorY + 25);

  cursorY += 52;

  equipment.forEach((eq, idx) => {
    if (cursorY > 700) {
      doc.addPage();
      cursorY = margin;
    }
    doc.setFillColor(idx % 2 === 0 ? 245 : 255, idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 28, 'F');
    doc.setTextColor(30, 42, 94);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${idx + 1}. ${eq.name}`, margin + 10, cursorY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Role: ${eq.role.toUpperCase()} | Email: ${eq.email || 'None'} | Borrows: ${eq.borrowedCount || 0}`, margin + 220, cursorY + 18);

    cursorY += 32;
  });

  doc.save(`Lighthouse_Equipment_Resume_${Date.now()}.pdf`);
}

/**
 * Dispatches an email or SMS resume report for Library Shelves, Equipment List, or TodoLists
 */
export async function sendResumeReportApi(params: {
  target: 'todolist' | 'library' | 'equipment' | 'all';
  channel: 'email' | 'sms';
  email?: string;
  emails?: string[];
  phone?: string;
  format?: 'excel' | 'pdf';
  summaryTitle: string;
  itemCount: number;
  detailsText?: string;
  customNote?: string;
}) {
  const resp = await fetch('/api/send-resume-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      smtpConfig: getStoredSmtpConfig(),
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to dispatch resume report');
  }

  return await resp.json();
}
