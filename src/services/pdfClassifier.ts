import JSZip from 'jszip';
import { Book } from '../types';

// Topic palette colors for generative cover art
const TOPIC_PALETTES: Record<string, { bg: string; accent: string; text: string; secondary: string }> = {
  'Machine Learning': { bg: '#2B2520', accent: '#C88A35', text: '#FAF6EE', secondary: '#BD3A2B' },
  'Computer Vision': { bg: '#0F4C81', accent: '#38BDF8', text: '#FAF7F0', secondary: '#0284C7' },
  'RAG': { bg: '#183B4E', accent: '#34D399', text: '#FAF7F0', secondary: '#10B981' },
  'CompTIA': { bg: '#991B1B', accent: '#FCA5A5', text: '#FFF1F2', secondary: '#EF4444' },
  'Cisco': { bg: '#065F46', accent: '#6EE7B7', text: '#ECFDF5', secondary: '#059669' },
  'Active Directory': { bg: '#1E3A8A', accent: '#93C5FD', text: '#EFF6FF', secondary: '#2563EB' },
  'Google Cloud': { bg: '#1D4ED8', accent: '#F59E0B', text: '#FFFFFF', secondary: '#4285F4' },
  'Unity': { bg: '#262626', accent: '#E5E7EB', text: '#FFFFFF', secondary: '#6B7280' },
  'Unreal Engine': { bg: '#0A0A0A', accent: '#F59E0B', text: '#FAFAFA', secondary: '#D97706' },
  'Structural Design': { bg: '#4338CA', accent: '#C7D2FE', text: '#EEF2FF', secondary: '#6366F1' },
  'Python': { bg: '#1E3A8A', accent: '#FCD34D', text: '#FFFFFF', secondary: '#38BDF8' },
  'Generative AI': { bg: '#4C1D95', accent: '#F472B6', text: '#FDF4FF', secondary: '#A855F7' },
  'Networking': { bg: '#164E63', accent: '#22D3EE', text: '#ECFEFF', secondary: '#06B6D4' },
  'Cybersecurity': { bg: '#111827', accent: '#EF4444', text: '#FEF2F2', secondary: '#DC2626' },
  'DevOps': { bg: '#155E75', accent: '#38BDF8', text: '#F0F9FF', secondary: '#0284C7' },
  'Other': { bg: '#334155', accent: '#94A3B8', text: '#F8FAFC', secondary: '#64748B' },
};

/**
 * Generate an elegant Japanese Library cover canvas image (Data URL)
 * Supports custom badges for PDF and Word DOCX files.
 */
export function generateCoverThumbnail(
  title: string,
  author: string,
  topic: string,
  subTags: string[] = [],
  fileType: 'pdf' | 'docx' | 'doc' | 'other' = 'pdf'
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const palette = TOPIC_PALETTES[topic] || TOPIC_PALETTES['Other'];

  // Base paper background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle linen texture effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < canvas.height; i += 4) {
    ctx.fillRect(0, i, canvas.width, 1);
  }

  // Book spine accent on left edge
  const spineGradient = ctx.createLinearGradient(0, 0, 36, 0);
  spineGradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  spineGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
  spineGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = spineGradient;
  ctx.fillRect(0, 0, 36, canvas.height);

  // Decorative border in gold/amber
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 28, canvas.width - 76, canvas.height - 56);

  // Inner fine line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(52, 32, canvas.width - 84, canvas.height - 64);

  // Top header: LightHouse 橋i motif
  ctx.fillStyle = palette.accent;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('LIGHTHOUSE 橋i • 燈台文庫', 60, 58);

  // Format Badge (PDF vs WORD DOCX)
  const isWord = fileType === 'docx' || fileType === 'doc';
  ctx.fillStyle = isWord ? '#185ABD' : '#DC2626';
  ctx.beginPath();
  ctx.roundRect(canvas.width - 100, 44, 48, 18, 4);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText(isWord ? 'DOCX' : 'PDF', canvas.width - 92, 56);

  // Topic badge banner
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.roundRect(60, 78, 210, 24, 4);
  ctx.fill();

  ctx.fillStyle = palette.text;
  ctx.font = 'bold 11px sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(topic.toUpperCase(), 70, 94);

  // Title rendering (multiline wrap)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px "Shippori Mincho", "Noto Serif JP", serif';
  const words = (title || 'Untitled Document').split(' ');
  let line = '';
  let y = 160;
  const maxWidth = 270;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, 60, y);
      line = words[n] + ' ';
      y += 32;
      if (y > 340) {
        line += '...';
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 60, y);

  // Author
  ctx.fillStyle = palette.accent;
  ctx.font = 'italic 14px "Shippori Mincho", serif';
  ctx.fillText(`著: ${author || 'Unknown Author'}`, 60, y + 42);

  // Center-bottom decorative seal / lighthouse silhouette
  ctx.save();
  ctx.translate(canvas.width - 80, canvas.height - 90);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(-15, 40);
  ctx.lineTo(15, 40);
  ctx.lineTo(8, -10);
  ctx.lineTo(12, -10);
  ctx.lineTo(12, -22);
  ctx.lineTo(0, -32);
  ctx.lineTo(-12, -22);
  ctx.lineTo(-12, -10);
  ctx.lineTo(-8, -10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sub-tags footer chips
  if (subTags && subTags.length > 0) {
    let chipX = 60;
    const chipY = canvas.height - 60;
    ctx.font = '10px sans-serif';

    subTags.slice(0, 3).forEach(tag => {
      const textWidth = ctx.measureText(tag).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(chipX, chipY - 14, textWidth + 14, 20, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(tag, chipX + 7, chipY);
      chipX += textWidth + 22;
    });
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Extract text from a Word document (.docx) via JSZip XML extraction
 */
export async function extractDocxMetadata(file: File): Promise<{
  textSnippet: string;
  pageCount: number;
  wordCount: number;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Main document text lives in word/document.xml
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('Not a valid docx: missing word/document.xml');
    }

    const xmlText = await docXmlFile.async('text');

    // Extract text from <w:t> tags
    const textMatches = xmlText.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    const extractedWords = textMatches
      .map(tag => tag.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const wordCount = extractedWords.split(/\s+/).filter(Boolean).length;
    // Standard rough estimation: 350 words per page
    const pageCount = Math.max(1, Math.ceil(wordCount / 350));

    return {
      textSnippet: extractedWords.slice(0, 4000),
      pageCount,
      wordCount,
    };
  } catch (err) {
    console.warn('Docx extraction fallback:', err);
    return {
      textSnippet: '',
      pageCount: 1,
      wordCount: 0,
    };
  }
}

/**
 * Extract text and cover preview from PDF file
 */
export async function extractPdfMetadata(file: File): Promise<{
  textSnippet: string;
  pageCount: number;
  coverDataUrl?: string;
}> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    let fullText = '';
    const maxPagesToInspect = Math.min(pageCount, 3);

    for (let i = 1; i <= maxPagesToInspect; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        fullText += `\n--- PAGE ${i} ---\n` + pageText;
      } catch (pageErr) {
        console.warn(`Error reading PDF page ${i}:`, pageErr);
      }
    }

    // Try rendering page 1 to canvas for real cover image
    let coverDataUrl: string | undefined = undefined;
    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await firstPage.render({ canvasContext: ctx, viewport } as any).promise;
        coverDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (coverErr) {
      console.warn('Could not render PDF first page cover, will use dynamic canvas cover:', coverErr);
    }

    return {
      textSnippet: fullText.trim().slice(0, 4000),
      pageCount,
      coverDataUrl,
    };
  } catch (error) {
    console.warn('PDF.js client extraction notice (fallback will run):', error);
    return {
      textSnippet: '',
      pageCount: 1,
      coverDataUrl: undefined,
    };
  }
}

/**
 * Universal document extractor supporting both PDF and Word (.docx, .doc)
 */
export async function extractDocumentMetadata(file: File): Promise<{
  textSnippet: string;
  pageCount: number;
  coverDataUrl?: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'other';
}> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx')) {
    const docxData = await extractDocxMetadata(file);
    return {
      textSnippet: docxData.textSnippet,
      pageCount: docxData.pageCount,
      coverDataUrl: undefined,
      fileType: 'docx',
    };
  } else if (name.endsWith('.doc')) {
    return {
      textSnippet: '',
      pageCount: 1,
      coverDataUrl: undefined,
      fileType: 'doc',
    };
  } else {
    // Default to PDF handler
    const pdfData = await extractPdfMetadata(file);
    return {
      textSnippet: pdfData.textSnippet,
      pageCount: pdfData.pageCount,
      coverDataUrl: pdfData.coverDataUrl,
      fileType: 'pdf',
    };
  }
}

/**
 * Classify a PDF or Word document with Gemini AI via the Express backend /api/classify-book
 * Accepts folderPath / relativePath for contextual topic deduction.
 */
export async function classifyDocumentWithGemini(
  filename: string,
  extractedText: string,
  pageCount: number,
  folderPath?: string,
  fileType: 'pdf' | 'docx' | 'doc' | 'other' = 'pdf',
  existingTopics: string[] = []
): Promise<{
  title: string;
  author: string;
  topic: string;
  subTags: string[];
  confidence: number;
  needsReview: boolean;
  summary: string;
  suggestedFolder?: string;
}> {
  try {
    const res = await fetch('/api/classify-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        extractedText,
        pageCount,
        folderPath,
        fileType,
        existingTopics,
      }),
    });

    if (!res.ok) {
      throw new Error(`Classification server error: ${res.status}`);
    }

    const data = await res.json();
    const cleanExt = filename.replace(/\.(pdf|docx|doc)$/i, '');

    return {
      title: data.title || cleanExt,
      author: data.author || 'Unknown Author',
      topic: data.topic || 'Other',
      subTags: Array.isArray(data.subTags) ? data.subTags : ['Technical'],
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
      needsReview: Boolean(data.needsReview),
      summary: data.summary || `Technical documentation on ${data.topic || 'engineering'}.`,
      suggestedFolder: data.suggestedFolder || folderPath,
    };
  } catch (err) {
    console.error('Gemini classify endpoint failed, using local classifier fallback:', err);
    const cleanTitle = filename.replace(/\.(pdf|docx|doc)$/i, '').replace(/[-_.]+/g, ' ');
    return {
      title: cleanTitle,
      author: 'Unknown Author',
      topic: 'Other',
      subTags: ['Technical', 'Documentation'],
      confidence: 0.6,
      needsReview: true,
      summary: 'Uploaded technical documentation.',
      suggestedFolder: folderPath,
    };
  }
}

// Backwards compatibility export
export const classifyPdfWithGemini = classifyDocumentWithGemini;
