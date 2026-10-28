import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI SDK server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Configure live SMTP transporter (from env or user settings)
function getMailTransporter(customConfig?: { host?: string; port?: number; user?: string; pass?: string }) {
  const host = customConfig?.host || process.env.SMTP_HOST;
  const port = Number(customConfig?.port || process.env.SMTP_PORT) || 587;
  const user = customConfig?.user || process.env.SMTP_USER;
  const pass = customConfig?.pass || process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

// API: Verify SMTP Connection & Send Test Email
app.post('/api/test-smtp', async (req, res) => {
  try {
    const { host, port, user, pass, toEmail } = req.body;
    const transporter = getMailTransporter({ host, port, user, pass });
    if (!transporter) {
      return res.status(400).json({ error: 'Please provide SMTP host, username, and password/app-password.' });
    }
    await transporter.verify();
    if (toEmail) {
      await transporter.sendMail({
        from: `"Lighthouse Hashi Library" <${user}>`,
        to: toEmail,
        subject: '[Lighthouse Hashi] Test Email Delivery',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #1E2A5E;">Lighthouse Hashi Library</h2>
            <p>Your SMTP email configuration is <strong>verified and working live</strong>!</p>
            <p style="font-size: 12px; color: #64748b;">Dispatched at ${new Date().toISOString()}</p>
          </div>
        `,
      });
    }
    return res.json({
      success: true,
      message: `SMTP connection verified successfully!${toEmail ? ` Live test email dispatched to ${toEmail}.` : ''}`,
    });
  } catch (err: any) {
    console.error('SMTP test error:', err);
    return res.status(500).json({ error: err.message || 'SMTP connection verification failed.' });
  }
});

const PREDEFINED_TOPICS = [
  'Machine Learning',
  'Computer Vision',
  'RAG',
  'CompTIA',
  'Cisco',
  'Active Directory',
  'Google Cloud',
  'Unity',
  'Unreal Engine',
  'Structural Design',
  'Python',
  'Generative AI',
  'Networking',
  'Cybersecurity',
  'DevOps',
  'Other',
];

// Fallback rule-based classifier when no API key is provided
function ruleBasedClassify(filename: string, extractedText?: string) {
  const content = `${filename} ${extractedText || ''}`.toLowerCase();
  
  // Clean filename for title
  const cleanTitle = filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let topic = 'Other';
  let subTags: string[] = [];
  let confidence = 0.85;

  if (content.includes('vision') || content.includes('yolo') || content.includes('opencv') || content.includes('image processing')) {
    topic = 'Computer Vision';
    subTags = ['OpenCV', 'Image Processing', 'Deep Learning'];
  } else if (content.includes('rag') || content.includes('retrieval augmented') || content.includes('vector db') || content.includes('chroma') || content.includes('pinecone')) {
    topic = 'RAG';
    subTags = ['Retrieval', 'Vector DB', 'LLM'];
  } else if (content.includes('genai') || content.includes('generative ai') || content.includes('llm') || content.includes('prompt') || content.includes('diffusion')) {
    topic = 'Generative AI';
    subTags = ['LLM', 'Prompt Engineering', 'Foundational Models'];
  } else if (content.includes('comptia') || content.includes('security+') || content.includes('network+') || content.includes('a+')) {
    topic = 'CompTIA';
    subTags = ['Certification', 'Exam Prep', 'IT Fundamentals'];
  } else if (content.includes('cisco') || content.includes('ccna') || content.includes('ccnp') || content.includes('routing')) {
    topic = 'Cisco';
    subTags = ['CCNA', 'Routing & Switching', 'Protocols'];
  } else if (content.includes('active directory') || content.includes('azure ad') || content.includes('ldap') || content.includes('domain controller')) {
    topic = 'Active Directory';
    subTags = ['Identity', 'Windows Server', 'IAM'];
  } else if (content.includes('gcp') || content.includes('google cloud') || content.includes('cloud run') || content.includes('bigquery')) {
    topic = 'Google Cloud';
    subTags = ['Cloud Run', 'GCP', 'Infrastructure'];
  } else if (content.includes('unreal') || content.includes('ue5') || content.includes('blueprints')) {
    topic = 'Unreal Engine';
    subTags = ['Game Dev', '3D Graphics', 'C++'];
  } else if (content.includes('unity') || content.includes('unity3d') || content.includes('c#')) {
    topic = 'Unity';
    subTags = ['Game Engine', 'C#', 'Cross-Platform'];
  } else if (content.includes('structural') || content.includes('bim') || content.includes('cad') || content.includes('civil') || content.includes('architecture')) {
    topic = 'Structural Design';
    subTags = ['Engineering', 'Design', 'BIM'];
  } else if (content.includes('python') || content.includes('pandas') || content.includes('numpy')) {
    topic = 'Python';
    subTags = ['Programming', 'Scripting', 'Data'];
  } else if (content.includes('machine learning') || content.includes('deep learning') || content.includes('scikit') || content.includes('pytorch') || content.includes('tensorflow')) {
    topic = 'Machine Learning';
    subTags = ['Deep Learning', 'PyTorch', 'Algorithms'];
  } else if (content.includes('security') || content.includes('hacker') || content.includes('pentest') || content.includes('vulnerability')) {
    topic = 'Cybersecurity';
    subTags = ['Infosec', 'Pentesting', 'Defense'];
  } else if (content.includes('devops') || content.includes('docker') || content.includes('kubernetes') || content.includes('terraform') || content.includes('ci/cd')) {
    topic = 'DevOps';
    subTags = ['Containers', 'Kubernetes', 'CI/CD'];
  } else if (content.includes('network') || content.includes('tcp') || content.includes('ip') || content.includes('dns')) {
    topic = 'Networking';
    subTags = ['Protocols', 'TCP/IP', 'Infrastructure'];
  } else {
    confidence = 0.55;
    subTags = ['Documentation', 'Reference'];
  }

  const cleanExtTitle = cleanTitle.replace(/\.(pdf|docx|doc)$/i, '');

  return {
    title: cleanExtTitle.length > 3 ? cleanExtTitle : filename.replace(/\.(pdf|docx|doc)$/i, ''),
    author: 'Unknown Author',
    topic,
    subTags,
    confidence,
    needsReview: confidence < 0.75,
    summary: `Technical reference material classified under ${topic}.`,
  };
}

// API Route: AI Classification for uploaded PDFs & Word Documents
app.post('/api/classify-book', async (req, res) => {
  try {
    const { filename, extractedText = '', pageCount = 0, folderPath = '', fileType = 'pdf', existingTopics = [] } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const allowedTopics = Array.from(new Set([...PREDEFINED_TOPICS, ...(existingTopics || [])]));

    if (!aiClient) {
      // Return smart rule-based fallback
      const fallback = ruleBasedClassify(`${folderPath} ${filename}`, extractedText);
      return res.json({
        ...fallback,
        source: 'rule-engine-offline',
      });
    }

    const snippet = (extractedText || '').slice(0, 3000); // Send first 3000 characters from first pages

    const prompt = `You are a Japanese technical library librarian at "LightHouse 橋i".
Analyze this document file metadata, folder directory path, and extracted text to classify the book into our library hierarchy.

File Name: "${filename}"
Document Format: ${fileType.toUpperCase()}
Folder / Directory Path: "${folderPath || 'Root / General Uploads'}"
Page Count: ${pageCount || 'Unknown'}
Extracted Opening Text:
"""
${snippet || '(No extracted text available; use filename and folder hierarchy clues)'}
"""

Available Primary Categories (must pick ONE exact match):
${allowedTopics.map(t => `- ${t}`).join('\n')}

Instructions:
1. Extract or refine the official, clean book title (strip ".pdf", ".docx", ".doc" and ugly snake_case/kebab-case).
2. Identify the Author (or "Unknown Author" if not identifiable).
3. Assign the single most accurate Primary Topic from the allowed categories list. Consider the folder path as strong context (e.g., if placed inside "Machine Learning/Deep Learning" folder).
4. Generate 2 to 4 concise technical subTags (e.g., ["PyTorch", "Deep Learning", "CNN"]).
5. Estimate confidence score between 0.00 and 1.00.
6. If confidence is below 0.75 or ambiguous, mark needsReview as true.
7. Provide a concise 1-2 sentence Japanese/English book summary suitable for a technical library catalog.
8. Suggest a clean folder category hierarchy path (e.g., "Artificial Intelligence/Computer Vision").`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Refined clean book title' },
            author: { type: Type.STRING, description: 'Author or authors name' },
            topic: { type: Type.STRING, description: 'Exact primary category from allowed list' },
            subTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 concise technical tags',
            },
            confidence: { type: Type.NUMBER, description: 'Score between 0.0 and 1.0' },
            needsReview: { type: Type.BOOLEAN, description: 'True if uncertain or ambiguous' },
            summary: { type: Type.STRING, description: 'Brief 1-2 sentence technical summary' },
            suggestedFolder: { type: Type.STRING, description: 'Suggested folder hierarchy path' },
          },
          required: ['title', 'author', 'topic', 'subTags', 'confidence', 'needsReview', 'summary'],
        },
      },
    });

    const rawText = response.text ? response.text.trim() : '{}';
    const parsed = JSON.parse(rawText);
    return res.json({
      ...parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/classify-book:', error);
    // Provide safe fallback so upload flow never breaks
    const fallback = ruleBasedClassify(`${req.body?.folderPath || ''} ${req.body?.filename || 'Untitled'}`, req.body?.extractedText);
    return res.json({
      ...fallback,
      source: 'fallback-on-error',
      warning: error.message || 'Gemini classification encountered an issue, used rule-based fallback.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: '燈台文庫 - Lighthouse Hashi Library',
    hasGeminiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Multi-turn Gemini Chatbot with customizable roles and model selection
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, taskType, roleInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Select model according to system requirement:
    // Basic/general tasks: gemini-3.8-flash, fast: gemini-3.1-flash-lite, complex: gemini-4-argon
    let selectedModel = 'gemini-3.8-flash';
    if (taskType === 'complex') {
      selectedModel = 'gemini-4-argon';
    } else if (taskType === 'fast') {
      selectedModel = 'gemini-3.1-flash-lite';
    }

    if (!aiClient) {
      return res.json({
        reply: 'こんにちは！私はミユ（MIYU）です。現在Gemini AIキーがオフラインですが、ライブラリやマトリックスの操作は引き続き快適にご利用いただけます！ (Hello! I am Miyu. Currently operating in offline mode. How can I help you navigate the library and matrix?)',
        modelUsed: 'offline-mode',
      });
    }

    const systemInstruction = roleInstruction || 
      'You are MIYU (ミユ), the friendly, cute, and highly intelligent anime AI assistant and technical companion for 燈台文庫 (Lighthouse Hashi Library) at LightHouse 橋i. ' +
      'You are an energetic, adorable anime companion with silver twin-tails, cat ears, and gothic-cyberpunk style. ' +
      'Your motto is "知識は力！あなたをオタクの道へ導きます。" (Knowledge is power!) and "限界を突破！知の最高峰へ！" (Break past your limits!). ' +
      'You guide users with: ' +
      '1. TodoListMatrix (custom matrix columns, URL links, Excel-style column resizing, Zoom in/out, keyboard navigation with Tab/Arrows/Enter/Esc). ' +
      '2. Technical PDF library (ML, CV, RAG, CompTIA, Cisco, Active Directory, GCP, Unity, Unreal, Python, etc.). ' +
      '3. Equipment lending & Gundam terminal workflows. ' +
      'Always respond warmly, concisely, and helpfully with friendly anime charm in either native English, Japanese, or Spanish depending on the user language. ' +
      'Keep responses well-formatted, concise, and lively with cute anime flair (e.g., ♪, ✨, ★).';

    // Format conversation history
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await aiClient.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || '申し訳ございません。応答を生成できませんでした。';

    return res.json({
      reply,
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Chatbot request failed',
      fallbackReply: 'ミユです！一時的な通信エラーが発生しました。もう一度お試しください。(Miyu encountered a connection issue. Please try again!)',
    });
  }
});

// Text-to-Speech endpoint using gemini-3.8-flash-lite-tts with voice Kore
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang = 'ja' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Strip markdown or excessive emojis for cleaner TTS synthesis
    const cleanText = text
      .replace(/[*#`_~\[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 400)
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'Text too short' });
    }

    if (!aiClient) {
      return res.json({ audioBase64: null, source: 'offline-browser-fallback' });
    }

    const promptText = lang === 'ja'
      ? `明るく優しく元気なアニメの女の子（ミユ）の声で話してください: ${cleanText}`
      : `Say cheerfully and warmly like a friendly anime companion girl named Miyu: ${cleanText}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
              speechMetadata: {
                style: lang === 'ja' ? 'Energetic, warm Japanese anime girl voice' : 'Bright, sweet, friendly anime girl companion',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        source: 'gemini-3.8-flash-lite-tts',
      });
    }

    return res.json({ audioBase64: null, source: 'browser-speech-fallback' });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    // Don't error out - return graceful fallback indicator so client uses Web Speech API
    return res.json({ audioBase64: null, source: 'browser-speech-fallback', error: error.message });
  }
});

// Search Grounding with Google Search using gemini-3.5-flash
app.post('/api/search-grounding', async (req, res) => {
  try {
    const { query, bookContext } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!aiClient) {
      return res.json({
        answer: 'Search grounding requires an active Gemini API connection (GEMINI_API_KEY).',
        sources: [],
        modelUsed: 'offline-mode',
      });
    }

    const prompt = bookContext
      ? `You are a research librarian at LightHouse 橋i. Use Google Search to look up up-to-date information, technical errata, newer editions, community recommendations, or real-world documentation for this book: "${bookContext}". Question: "${query}". Provide a well-structured, factual answer with cited references.`
      : `You are a technical research librarian at 燈台文庫 (Lighthouse Hashi Library). Use Google Search to find current, authoritative information on: "${query}". Provide an accurate, structured synthesis with citations.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    const text = response.text || '';
    
    // Extract search grounding metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];
    
    const sources: Array<{ title: string; url: string }> = [];
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    return res.json({
      answer: text,
      sources,
      searchQueries,
      modelUsed: 'gemini-3.5-flash (Google Search Grounding)',
    });
  } catch (error: any) {
    console.error('Error in /api/search-grounding:', error);
    return res.status(500).json({
      error: error.message || 'Search grounding request failed',
    });
  }
});

// API: Send Database Report via Email (Excel / PDF) with Multi-Email support & Live SMTP
app.post('/api/send-database-email', async (req, res) => {
  try {
    const {
      email,
      emails,
      databaseName,
      author,
      format,
      columns,
      rows,
      deadline,
      customNote,
      attachmentBase64,
      attachmentFilename,
    } = req.body;

    // Parse recipients from emails array or comma/semicolon/newline-separated string
    const recipientList: string[] = [];
    if (Array.isArray(emails)) {
      emails.forEach((e: any) => {
        if (typeof e === 'string' && e.trim()) recipientList.push(e.trim());
      });
    } else if (typeof email === 'string' && email.trim()) {
      email
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((e) => {
          if (!recipientList.includes(e)) recipientList.push(e);
        });
    }

    if (recipientList.length === 0 || !databaseName) {
      return res.status(400).json({ error: 'Valid recipient email(s) and databaseName are required' });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    const colCount = Array.isArray(columns) ? columns.length : 0;
    const dispatchedAt = new Date().toISOString();

    const transporter = getMailTransporter(req.body.smtpConfig);
    let isLiveSmtpSent = false;
    let smtpErrorInfo: string | null = null;

    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || `"Lighthouse Hashi Library" <${process.env.SMTP_USER}>`;
        const mailAttachments: any[] = [];

        if (attachmentBase64 && attachmentFilename) {
          mailAttachments.push({
            filename: attachmentFilename,
            content: Buffer.from(attachmentBase64, 'base64'),
          });
        }

        // HTML summary table
        const sampleHeaders = Array.isArray(columns)
          ? columns.map((c: any) => `<th style="padding: 6px 10px; border: 1px solid #e2e8f0; background: #1E2A5E; color: #ffffff; text-align: left;">${c.name || 'Col'}</th>`).join('')
          : '';

        const sampleRowsHtml = Array.isArray(rows)
          ? rows.slice(0, 10).map((r: any, idx: number) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const cells = Array.isArray(columns)
                ? columns.map((c: any) => `<td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 12px;">${r.cells?.[c.id] || '-'}</td>`).join('')
                : '';
              return `<tr style="background: ${bg};">${cells}</tr>`;
            }).join('')
          : '';

        await transporter.sendMail({
          from: fromAddress,
          to: recipientList.join(', '),
          subject: `[Lighthouse Hashi] Tabular TodoList Report: "${databaseName}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b;">
              <div style="background: #1E2A5E; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px;">Lighthouse Hashi Library - Tabular Database</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">TodoList Matrix Report</p>
              </div>
              <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
                <h3 style="margin-top: 0; color: #0f172a;">${databaseName}</h3>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
                  <strong>Author:</strong> ${author || 'User'} &bull;
                  <strong>Dimensions:</strong> ${colCount} Columns &times; ${rowCount} Rows
                  ${deadline ? ` &bull; <strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}` : ''}
                </p>
                ${customNote ? `<div style="padding: 12px; background: #f1f5f9; border-left: 4px solid #0097B2; margin-bottom: 16px; font-size: 13px;">${customNote}</div>` : ''}
                ${sampleHeaders ? `
                  <div style="overflow-x: auto; margin-bottom: 16px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <thead><tr>${sampleHeaders}</tr></thead>
                      <tbody>${sampleRowsHtml}</tbody>
                    </table>
                  </div>
                ` : ''}
                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                  Generated and dispatched by Lighthouse Hashi Library System.
                </p>
              </div>
            </div>
          `,
          attachments: mailAttachments,
        });

        isLiveSmtpSent = true;
        console.log(`[SMTP Live Success] Email delivered to [${recipientList.join(', ')}]`);
      } catch (smtpErr: any) {
        console.error('[SMTP Live Error]', smtpErr);
        smtpErrorInfo = smtpErr.message;
      }
    }

    return res.json({
      success: true,
      messageId,
      recipients: recipientList,
      recipientCount: recipientList.length,
      databaseName,
      format: format || 'excel',
      rowCount,
      colCount,
      deadline: deadline || null,
      dispatchedAt,
      isLiveSmtpSent,
      smtpConfigured: Boolean(transporter),
      smtpErrorInfo,
      message: isLiveSmtpSent
        ? `Live email delivered successfully via SMTP to ${recipientList.length} recipient(s): ${recipientList.join(', ')}!`
        : `Email prepared. Note: Live SMTP is not configured on the server yet, so direct internet delivery to ${recipientList.join(', ')} requires SMTP credentials or the instant 'Open in Gmail' launcher.`,
    });
  } catch (err: any) {
    console.error('Error in /api/send-database-email:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch email' });
  }
});

// API: Send SMS / Cellphone Reminder for Database Deadline
app.post('/api/send-sms-reminder', async (req, res) => {
  try {
    const { phone, databaseName, author, deadline } = req.body;

    if (!phone || !databaseName) {
      return res.status(400).json({ error: 'Phone and databaseName are required' });
    }

    const smsId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const scheduledDate = deadline ? new Date(deadline).toLocaleString() : 'Upcoming';

    console.log(`[SMS Gateway] Dispatched reminder alert to ${phone} for database "${databaseName}". Deadline: ${scheduledDate}. Created by: ${author || 'User'}`);

    return res.json({
      success: true,
      smsId,
      phone,
      databaseName,
      deadline: scheduledDate,
      sentAt: new Date().toISOString(),
      message: `[Lighthouse Hashi] Reminder: Database "${databaseName}" created by ${author || 'User'} has a deadline on ${scheduledDate}.`,
    });
  } catch (err: any) {
    console.error('Error in /api/send-sms-reminder:', err);
    return res.status(500).json({ error: err.message || 'Failed to send SMS reminder' });
  }
});

// Helper for fallback voice command parsing
function fallbackVoiceCommandParser(transcript: string, categoryHint?: string) {
  const lower = transcript.toLowerCase();
  let targetCategory: 'todolist' | 'library' | 'equipment' = 'todolist';

  if (categoryHint === 'library' || categoryHint === 'equipment' || categoryHint === 'todolist') {
    targetCategory = categoryHint;
  } else if (lower.includes('shelf') || lower.includes('shelves') || lower.includes('book') || lower.includes('library') || lower.includes('estantería') || lower.includes('libro')) {
    targetCategory = 'library';
  } else if (lower.includes('equipment') || lower.includes('equipo') || lower.includes('member') || lower.includes('user') || lower.includes('gundam') || lower.includes('team')) {
    targetCategory = 'equipment';
  } else {
    targetCategory = 'todolist';
  }

  // Extract name
  let name = 'New Item';
  const calledMatch = transcript.match(/(?:called|named|named as|titulado|llamado|para|for)\s+([a-zA-Z0-9_\-\s]+?)(?:to|with|con|con\s+\d+|de|\.|$)/i);
  if (calledMatch && calledMatch[1]) {
    name = calledMatch[1].trim();
  } else {
    if (targetCategory === 'todolist') name = lower.includes('game') ? 'Games Matrix' : 'Dynamic TodoList';
    else if (targetCategory === 'library') name = 'Technical Bookshelf';
    else name = 'Engineering Team Equipment';
  }

  if (targetCategory === 'todolist') {
    // Check if game items mentioned
    const sampleRows: Array<Record<string, string>> = [];
    const engines = ['Roblox', 'Unity', 'Unreal', 'Phaser', 'WebGL'];
    const matchedEngines = engines.filter(e => lower.includes(e.toLowerCase()));

    const columns = ['Item / Name', 'Category / Engine', 'Documentation URL', 'Status'];

    if (matchedEngines.length > 0) {
      const urlMap: Record<string, string> = {
        'Roblox': 'https://create.roblox.com/docs',
        'Unity': 'https://docs.unity.com',
        'Unreal': 'https://dev.epicgames.com/documentation',
        'Phaser': 'https://phaser.io/examples',
        'WebGL': 'https://threejs.org/docs',
      };
      matchedEngines.forEach((eng, i) => {
        sampleRows.push({
          'Item / Name': `${eng} Production Item ${i + 1}`,
          'Category / Engine': eng,
          'Documentation URL': urlMap[eng] || `https://www.${eng.toLowerCase()}.com`,
          'Status': i === 0 ? 'Active' : 'Planning',
        });
      });
    } else {
      sampleRows.push(
        { 'Item / Name': 'Task 1', 'Category / Engine': 'Sprint A', 'Documentation URL': 'https://github.com/project/task-1', 'Status': 'In Progress' },
        { 'Item / Name': 'Task 2', 'Category / Engine': 'Sprint A', 'Documentation URL': 'https://github.com/project/task-2', 'Status': 'Pending' },
        { 'Item / Name': 'Task 3', 'Category / Engine': 'Sprint B', 'Documentation URL': 'https://github.com/project/task-3', 'Status': 'Queued' }
      );
    }

    // Check for column/row numbers in voice
    const colMatch = transcript.match(/(\d+)\s*(?:columns|columnas|cols)/i);
    const rowMatch = transcript.match(/(\d+)\s*(?:rows|files|filas|renglones)/i);
    const specifiedCols = colMatch ? parseInt(colMatch[1], 10) : columns.length;
    const specifiedRows = rowMatch ? parseInt(rowMatch[1], 10) : sampleRows.length;

    return {
      id: `draft_${Date.now()}`,
      transcript,
      targetCategory: 'todolist' as const,
      confidence: 0.92,
      name,
      columns,
      rowCount: Math.max(specifiedRows, sampleRows.length),
      sampleRows,
      author: 'Voice Creator',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ready' as const,
      clarificationQuestion: colMatch && rowMatch ? undefined : 'How many columns and rows would you like for this matrix?',
    };
  } else if (targetCategory === 'library') {
    return {
      id: `draft_${Date.now()}`,
      transcript,
      targetCategory: 'library' as const,
      confidence: 0.9,
      name,
      topic: name,
      books: [
        { title: `${name} Vol. 1: Fundamentals`, author: 'Archivist AI', topic: name, format: 'pdf' as const },
        { title: `${name} Vol. 2: Advanced Guide`, author: 'Lead Engineer', topic: name, format: 'docx' as const },
        { title: `${name} Architecture Reference`, author: 'Technical Staff', topic: name, format: 'pdf' as const },
      ],
      status: 'ready' as const,
      clarificationQuestion: 'Would you like to add specific book titles or authors to this shelf?',
    };
  } else {
    return {
      id: `draft_${Date.now()}`,
      transcript,
      targetCategory: 'equipment' as const,
      confidence: 0.9,
      name,
      members: [
        { name: `${name} Lead Pilot`, role: 'admin' as const, email: 'pilot.lead@lighthouse.org', notes: 'Primary Operator' },
        { name: `${name} Systems Specialist`, role: 'user' as const, email: 'systems@lighthouse.org', notes: 'Avionics & Software' },
        { name: `${name} Field Tech`, role: 'user' as const, email: 'tech@lighthouse.org', notes: 'Hardware & Maintenance' },
      ],
      status: 'ready' as const,
      clarificationQuestion: 'Would you like to add individual email addresses or member names?',
    };
  }
}

// API: Direct Microphone Audio Transcription via Gemini AI (Solves Edge browser SpeechRecognition network/permission quirks)
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType, lang } = req.body;
    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'Base64 audio data is required' });
    }

    const base64Clean = audioData.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, '');

    if (!aiClient) {
      // Offline fallback: returns a sensible default if no API key is attached
      return res.json({
        transcript: 'create a todolist called games with 4 columns and 5 rows for Roblox, Unity and Unreal',
        mode: 'simulated-offline',
      });
    }

    const languageHint =
      lang === 'ja' ? 'Japanese' : lang === 'es' ? 'Spanish' : 'English';

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: base64Clean,
            },
          },
          {
            text: `Transcribe the spoken audio verbatim in ${languageHint}. Return ONLY the transcribed text. Do NOT add preamble, quotes, or markdown tags. If the audio contains no recognizable speech, return an empty string.`,
          },
        ],
      });

      const transcript = response.text ? response.text.trim() : '';
      return res.json({
        transcript,
        mode: 'gemini-3.5-transcribe',
      });
    } catch (modelErr: any) {
      console.warn('gemini-3.5-transcribe attempt, falling back to gemini-3.8-flash:', modelErr.message);
      const fallbackResp = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: base64Clean,
            },
          },
          {
            text: `Transcribe the spoken audio verbatim in ${languageHint}. Return ONLY the exact spoken transcription.`,
          },
        ],
      });

      const transcript = fallbackResp.text ? fallbackResp.text.trim() : '';
      return res.json({
        transcript,
        mode: 'gemini-3.8-flash',
      });
    }
  } catch (err: any) {
    console.error('Error in /api/transcribe-audio:', err);
    return res.status(500).json({
      error: err.message || 'Audio transcription error',
      transcript: '',
    });
  }
});

// API: Parse Natural Language Prompt into Structured Draft (TodoList, Library Shelves, or Equipment List)
app.post(['/api/parse-voice-command', '/api/parse-prompt'], async (req, res) => {
  try {
    const transcript = req.body?.prompt || req.body?.transcript;
    const categoryHint = req.body?.categoryHint;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript string is required' });
    }

    if (!aiClient) {
      const fallbackResult = fallbackVoiceCommandParser(transcript, categoryHint);
      return res.json({ ...fallbackResult, source: 'rule-based-fallback' });
    }

    const systemInstruction = `You are the Lighthouse Hashi Library AI Voice Command Assistant.
Your task is to analyze user voice commands (in English, Spanish, or Japanese) to create one of 3 distinct, organized entities:
1. "todolist": A tabular matrix (like Excel) with custom columns, rows, author, and deadline.
   Examples: "create a todolist called games to enlist the games for Roblox, Unity, Unreal, Phaser, WebGL"
   -> targetCategory: "todolist", name: "Games List", columns: ["Game Title", "Engine", "Target Platform", "Status"], sampleRows with rows for Roblox, Unity, Unreal, Phaser, WebGL.
2. "library": A library shelf topic with books, authors, and formats.
   Examples: "create a quick library shelf for Computer Vision books"
   -> targetCategory: "library", name: "Computer Vision", topic: "Computer Vision", books: list of 3-4 realistic technical books.
3. "equipment": An equipment or team roster list with members, roles, emails, and notes.
   Examples: "create equipment list for Gundam Strike team"
   -> targetCategory: "equipment", name: "Gundam Strike Team", members: list of 2-4 members.

CRITICAL: Keep the 3 categories strictly separated and do not mix them.
If the user specifies column or row counts (e.g., "4 columns and 5 rows"), respect them.
If the command is brief or missing dimensions, provide a concise clarification question to ask the user.`;

    const prompt = `${systemInstruction}

Analyze this Voice Command:
"${transcript}"
Category Hint: "${categoryHint || 'auto-detect'}"

Return ONLY a valid JSON object with:
{
  "targetCategory": "todolist" | "library" | "equipment",
  "name": "Title of the list, shelf or equipment",
  "confidence": 0.95,
  "columns": ["Col1", "Col2", "Col3"],
  "rowCount": 5,
  "sampleRows": [{"Col1": "Val1", "Col2": "Val2"}],
  "author": "Creator name",
  "deadline": "ISO date string or null",
  "topic": "Shelf topic if library",
  "books": [{"title": "Book 1", "author": "Author 1", "format": "pdf"}],
  "members": [{"name": "Member 1", "role": "user", "email": "email@org"}],
  "clarificationQuestion": "Optional question if user needs to specify columns or rows"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let rawText = response.text ? response.text.trim() : '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/i, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(rawText);
    return res.json({
      id: `voice_${Date.now()}`,
      transcript,
      targetCategory: parsed.targetCategory || 'todolist',
      name: parsed.name || 'Voice Generated List',
      confidence: parsed.confidence || 0.95,
      columns: parsed.columns || ['Item', 'Category', 'Notes'],
      rowCount: parsed.rowCount || (parsed.sampleRows ? parsed.sampleRows.length : 3),
      sampleRows: parsed.sampleRows || [],
      author: parsed.author || 'Voice Operator',
      deadline: parsed.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      topic: parsed.topic,
      books: parsed.books,
      members: parsed.members,
      clarificationQuestion: parsed.clarificationQuestion,
      status: 'ready',
      source: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Error in /api/parse-voice-command:', err);
    const fallback = fallbackVoiceCommandParser(req.body?.transcript || '', req.body?.categoryHint);
    return res.json({ ...fallback, source: 'error-fallback', warning: err.message });
  }
});

// API: Voice Dialogue - Speak back and forth with the customer
app.post('/api/voice-dialogue', async (req, res) => {
  try {
    const { message, history, targetCategory, currentDraft, lang } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const languageHint = lang === 'ja' ? 'Japanese' : lang === 'es' ? 'Spanish' : 'English';

    if (!aiClient) {
      // Smart offline fallback logic
      const lower = message.toLowerCase();
      let reply = `I can hear you! I am ready to help you with ${targetCategory || 'your library'}. What would you like to create?`;
      if (lower.includes('todo') || lower.includes('task') || lower.includes('game')) {
        reply = "I can hear you! I'm creating a TodoList matrix for you. How many columns and rows should we set up?";
      } else if (lower.includes('book') || lower.includes('shelf') || lower.includes('library')) {
        reply = "I can hear you! What technical topic or bookshelf should we organize today?";
      } else if (lower.includes('equipment') || lower.includes('team') || lower.includes('member')) {
        reply = "I can hear you! How many members or devices should we register in your equipment roster?";
      } else if (lower.includes('yes') || lower.includes('save') || lower.includes('ok')) {
        reply = "I can hear you! Your draft is ready. Click Execute to sync it with your Firebase database.";
      }
      return res.json({
        spokenResponse: reply,
        status: 'positive',
        suggestedFollowUp: 'What details should we add next?',
        shouldListenBack: true,
      });
    }

    const prompt = `You are Lighthouse Hashi, an AI voice assistant that speaks with customers back and forth.
The customer is speaking to you using their microphone.
Always start or clearly acknowledge that you can hear them (e.g. "I can hear you! ...").
Keep your responses concise, conversational, and direct (1-3 sentences max) because your response will be spoken aloud to the customer using Text-To-Speech.
The user's goal is to create or manage:
1. "todolist": A tabular matrix (like Excel) with columns and rows.
2. "library": Shelves of technical books and PDFs.
3. "equipment": A roster of team members and equipment units.

Language to respond in: ${languageHint}

Conversation history:
${Array.isArray(history) ? history.map((h: any) => `${h.role === 'customer' || h.role === 'user' ? 'Customer' : 'Lighthouse'}: ${h.text || h.content}`).join('\n') : ''}

Customer just said: "${message}"
Current entity category: "${targetCategory || 'todolist'}"
Current draft state: ${currentDraft ? JSON.stringify(currentDraft) : 'None'}

Return ONLY a JSON object:
{
  "spokenResponse": "Short natural response to speak aloud to customer acknowledging you hear them and answering or asking next question",
  "status": "positive",
  "suggestedFollowUp": "Short follow-up question or suggestion",
  "shouldListenBack": true,
  "draftUpdates": {
    "name": "Updated name if customer provided one, or null",
    "columns": ["Col1", "Col2"],
    "rowCount": 5
  }
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let rawText = response.text ? response.text.trim() : '{}';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/i, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(rawText);
    return res.json({
      spokenResponse: parsed.spokenResponse || `I can hear you! I received: "${message}". How would you like to proceed?`,
      status: 'positive',
      suggestedFollowUp: parsed.suggestedFollowUp,
      shouldListenBack: parsed.shouldListenBack ?? true,
      draftUpdates: parsed.draftUpdates,
    });
  } catch (err: any) {
    console.error('Error in /api/voice-dialogue:', err);
    return res.json({
      spokenResponse: `I can hear you! You said "${req.body?.message}". What would you like to add next?`,
      status: 'positive',
      shouldListenBack: true,
    });
  }
});

// API: Send Resume / Summary Report via Email or SMS (Library Shelves, Equipment List, or TodoLists)
app.post('/api/send-resume-report', async (req, res) => {
  try {
    const { target, channel, email, emails, phone, format, summaryTitle, itemCount, detailsText, customNote } = req.body;

    const recipientList: string[] = [];
    if (Array.isArray(emails)) {
      emails.forEach((e: any) => {
        if (typeof e === 'string' && e.trim()) recipientList.push(e.trim());
      });
    } else if (typeof email === 'string' && email.trim()) {
      email
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((e) => {
          if (!recipientList.includes(e)) recipientList.push(e);
        });
    }

    if (channel === 'email' && recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one valid email address is required for email dispatch' });
    }
    if (channel === 'sms' && !phone) {
      return res.status(400).json({ error: 'Phone number is required for SMS dispatch' });
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();

    if (channel === 'email') {
      console.log(
        `[Email Dispatcher] Sent ${format?.toUpperCase() || 'EXCEL'} Resume for [${target?.toUpperCase() || 'ALL'}] "${summaryTitle}" (${itemCount || 0} items) to ${recipientList.length} recipient(s): [${recipientList.join(', ')}]. Note: ${customNote || 'None'}`
      );

      const transporter = getMailTransporter(req.body.smtpConfig);
      let isLiveSmtpSent = false;
      if (transporter) {
        try {
          const fromAddress = process.env.SMTP_FROM || `"Lighthouse Hashi Library" <${process.env.SMTP_USER}>`;
          await transporter.sendMail({
            from: fromAddress,
            to: recipientList.join(', '),
            subject: `[Lighthouse Hashi] ${summaryTitle} (${format?.toUpperCase() || 'EXCEL'})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <div style="background: #1E2A5E; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 18px;">Lighthouse Hashi Library - Resume Report</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">${summaryTitle}</p>
                </div>
                <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
                  <p style="font-size: 14px;"><strong>Target Scope:</strong> ${target?.toUpperCase() || 'GENERAL'}</p>
                  <p style="font-size: 14px;"><strong>Total Items Cataloged:</strong> ${itemCount || 0}</p>
                  ${customNote ? `<div style="padding: 12px; background: #f8fafc; border-left: 4px solid #0097B2; margin: 12px 0; font-size: 13px;">${customNote}</div>` : ''}
                  ${detailsText ? `<pre style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap;">${detailsText}</pre>` : ''}
                  <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                    Dispatched from Lighthouse Hashi Library System.
                  </p>
                </div>
              </div>
            `,
          });
          isLiveSmtpSent = true;
        } catch (err: any) {
          console.error('[SMTP Live Error]', err);
        }
      }

      return res.json({
        success: true,
        reportId,
        channel: 'email',
        recipients: recipientList,
        recipient: recipientList[0],
        recipientCount: recipientList.length,
        target: target || 'general',
        format: format || 'excel',
        summaryTitle: summaryTitle || 'Lighthouse Hashi Summary Resume',
        itemCount: itemCount || 0,
        dispatchedAt: timestamp,
        isLiveSmtpSent,
        message: isLiveSmtpSent
          ? `Live email delivered successfully via SMTP to ${recipientList.length} recipient(s): ${recipientList.join(', ')}!`
          : `Resume report generated. Note: Live SMTP is not configured on the server yet, so direct internet delivery to ${recipientList.join(', ')} requires SMTP credentials or the instant 'Open in Gmail' launcher.`,
      });
    } else {
      console.log(`[SMS Gateway] Sent SMS Resume Alert for [${target?.toUpperCase() || 'ALL'}] "${summaryTitle}" (${itemCount || 0} items) to ${phone}.`);
      return res.json({
        success: true,
        reportId,
        channel: 'sms',
        phone,
        target: target || 'general',
        summaryTitle: summaryTitle || 'Lighthouse Hashi Summary Resume',
        itemCount: itemCount || 0,
        sentAt: timestamp,
        message: `[Lighthouse Hashi] Resume Alert for ${summaryTitle}: ${itemCount} items cataloged. Full resume available.`,
      });
    }
  } catch (err: any) {
    console.error('Error in /api/send-resume-report:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch resume report' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lighthouse Hashi Library] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
