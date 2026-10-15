import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  Globe,
  Loader2,
  BookOpen,
  Trash2,
  Zap,
} from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { translations } from '../i18n/translations';

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  initialBookContext?: string;
  initialSearchQuery?: string;
  onOpenBookTitle?: (title: string) => void;
}

type ModelTaskMode = 'fast' | 'general' | 'complex';

export const GeminiChatbotModal: React.FC<GeminiChatbotModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  initialBookContext,
  initialSearchQuery,
}) => {
  const t = translations[currentLang];
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('lighthouse_gemini_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        content:
          currentLang === 'ja'
            ? 'こんにちは！「燈台文庫」AIレファレンス・アーキビストです。技術書のリサーチ、最新版・正誤表のGoogle検索グラウンディング、Gundam端末の割当て、カリキュラム作成など何でもお尋ねください。'
            : currentLang === 'es'
            ? '¡Hola! Soy el Archivista e Investigador de IA de "Lighthouse Hashi Library". Puedo responder preguntas técnicas, buscar información actualizada con Google Search, y recomendar libros del catálogo.'
            : 'Welcome to Lighthouse Hashi Library! I am your AI Reference Archivist. You can ask me technical book questions, search up-to-date documentation with Google Search grounding, or explore reading paths.',
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-3.5-flash',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(false);
  const [taskMode, setTaskMode] = useState<ModelTaskMode>('general');
  const [rolePreset, setRolePreset] = useState<'librarian' | 'architect' | 'tutor'>('librarian');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    try {
      localStorage.setItem('lighthouse_gemini_chat_history', JSON.stringify(messages.slice(-25)));
    } catch (e) {
      // ignore
    }
  }, [messages, isOpen]);

  // Handle incoming query/context from outside
  useEffect(() => {
    if (initialSearchQuery && isOpen) {
      setInput(initialSearchQuery);
      setEnableSearchGrounding(true);
    }
  }, [initialSearchQuery, isOpen]);

  if (!isOpen) return null;

  const roleInstructions: Record<'librarian' | 'architect' | 'tutor', string> = {
    librarian:
      'You are the Chief Reference Archivist at 燈台文庫 (Lighthouse Hashi Library) at LightHouse 橋i. ' +
      'You specialize in recommending relevant literature from Machine Learning, Computer Vision, RAG, CompTIA, Cisco, Active Directory, GCP, Unity, Unreal, and Python. ' +
      'Be concise, polite, structured, and helpful. Format your responses with clear markdown headers, bullet points, and code snippets when helpful.',
    architect:
      'You are the Principal Systems & Software Pipeline Architect at LightHouse 橋i. ' +
      'You analyze deep technical trade-offs, compare libraries and frameworks, review code patterns, and advise Gundam terminal operators on engineering best practices.',
    tutor:
      'You are an expert technical instructor guiding students and junior engineers through technical certifications (CompTIA, Cisco CCNA, Google Cloud PCA) and modern AI/ML workflows.',
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isSubmitting) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSubmitting(true);

    try {
      if (enableSearchGrounding) {
        // Call Google Search Grounding endpoint
        const res = await fetch('/api/search-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            bookContext: initialBookContext || '',
          }),
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: data.answer || 'No grounded response returned.',
          timestamp: new Date().toISOString(),
          groundingSources: data.sources || [],
          modelUsed: data.modelUsed || 'gemini-3.5-flash (Google Search)',
        };

        setMessages(prev => [...prev, modelMsg]);
      } else {
        // Multi-turn conversation endpoint
        const historyForApi = [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyForApi,
            taskType: taskMode,
            roleInstruction: roleInstructions[rolePreset],
          }),
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: data.reply,
          timestamp: new Date().toISOString(),
          modelUsed: data.modelUsed,
        };

        setMessages(prev => [...prev, modelMsg]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Error: ${err.message || 'Unable to connect to Gemini API. Please check server configuration.'}`,
        timestamp: new Date().toISOString(),
        modelUsed: 'Error Fallback',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('lighthouse_gemini_chat_history');
    setMessages([
      {
        id: 'msg-welcome',
        role: 'model',
        content: 'Chat thread cleared. How may I assist you today at 燈台文庫?',
        timestamp: new Date().toISOString(),
        modelUsed: 'gemini-3.5-flash',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] sm:h-[85vh] bg-[#FAF7F0] dark:bg-slate-900 rounded-3xl shadow-2xl border border-[#1E2A5E]/15 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E2A5E]/10 dark:border-slate-800 bg-white dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E2A5E] text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#1E2A5E] dark:text-white flex items-center gap-1.5">
                  <span>Gemini AI Archivist & Search</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F5A623]/20 text-[#1E2A5E] dark:text-[#F5A623] border border-[#F5A623]/30">
                    {enableSearchGrounding ? 'Google Search Grounding' : taskMode === 'complex' ? 'gemini-3.1-pro-preview' : taskMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                LightHouse 橋i • Intelligent Reference Assistant & Live Web Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Clear Conversation"
              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Sub-Bar: Model speed / task selection & Search Grounding Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Persona */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Role:</span>
              <select
                value={rolePreset}
                onChange={e => setRolePreset(e.target.value as any)}
                className="bg-transparent font-bold text-[#1E2A5E] dark:text-slate-200 outline-none cursor-pointer text-xs"
              >
                <option value="librarian">Archivist (Librarian)</option>
                <option value="architect">Systems Architect</option>
                <option value="tutor">Certification Tutor</option>
              </select>
            </div>

            {/* Model Task Mode */}
            {!enableSearchGrounding && (
              <div className="flex items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  onClick={() => setTaskMode('fast')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    taskMode === 'fast'
                      ? 'bg-[#0097B2] text-white shadow-xs'
                      : 'text-slate-500 hover:text-[#1E2A5E] dark:hover:text-white'
                  }`}
                  title="Uses gemini-3.1-flash-lite for rapid responses"
                >
                  ⚡ Fast (Flash-Lite)
                </button>
                <button
                  onClick={() => setTaskMode('general')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    taskMode === 'general'
                      ? 'bg-[#1E2A5E] text-white shadow-xs dark:bg-amber-400 dark:text-[#1E2A5E]'
                      : 'text-slate-500 hover:text-[#1E2A5E] dark:hover:text-white'
                  }`}
                  title="Uses gemini-3.5-flash for balanced tasks"
                >
                  General (3.5-Flash)
                </button>
                <button
                  onClick={() => setTaskMode('complex')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    taskMode === 'complex'
                      ? 'bg-[#DC2626] text-white shadow-xs'
                      : 'text-slate-500 hover:text-[#1E2A5E] dark:hover:text-white'
                  }`}
                  title="Uses gemini-3.1-pro-preview for deep architectural reasoning"
                >
                  ★ Deep (Pro-Preview)
                </button>
              </div>
            )}
          </div>

          {/* Google Search Grounding Switch */}
          <button
            onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition text-xs ${
              enableSearchGrounding
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${enableSearchGrounding ? 'animate-spin' : ''}`} />
            <span>Google Search Grounding</span>
            <span
              className={`w-2 h-2 rounded-full ${
                enableSearchGrounding ? 'bg-amber-300' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-[#0097B2] text-white'
                      : 'bg-[#1E2A5E] text-white dark:bg-amber-400 dark:text-[#1E2A5E]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#1E2A5E] text-white rounded-tr-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-[#1E2A5E]/10 dark:border-slate-700/80 rounded-tl-xs whitespace-pre-wrap font-sans'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Grounding Sources (Google Search results) */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5 animate-in fade-in">
                      <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Search Grounding Sources ({msg.groundingSources.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.groundingSources.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-300 hover:underline max-w-[260px] truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{source.title || source.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata footnote */}
                  <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.modelUsed && <span>• {msg.modelUsed}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {isSubmitting && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-slate-500 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#1E2A5E] text-white flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#F5A623]" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                {enableSearchGrounding
                  ? 'Searching Google & grounding factual references...'
                  : taskMode === 'complex'
                  ? 'Synthesizing with gemini-3.1-pro-preview reasoning...'
                  : 'Gemini is drafting response...'}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-[#1E2A5E]/10 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              enableSearchGrounding
                ? 'Ask Google Search grounded query (e.g. "What are the latest updates to Google Cloud PCA exam 2026?")...'
                : 'Ask Gemini about library books, Gundam loans, or tech topics...'
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[#FAF7F0] dark:bg-slate-900 text-xs sm:text-sm text-[#1E2A5E] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E] dark:focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-[#1E2A5E] hover:bg-[#2A3B82] text-white disabled:opacity-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-[#F5A623]" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
