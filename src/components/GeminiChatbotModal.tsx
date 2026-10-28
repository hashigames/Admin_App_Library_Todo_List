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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] sm:h-[85vh] bg-[#FAF6EE] dark:bg-[#171513] rounded-3xl shadow-2xl border border-[#DECFA9] dark:border-[#38322B] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAE2D2] dark:border-[#38322B] bg-[#FFFFFF] dark:bg-[#201C19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2B2520] text-[#FAF6EE] flex items-center justify-center shadow-2xs">
              <Bot className="w-5 h-5 text-[#C88A35]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 font-serif-jp">
                  <span>Gemini AI Archivist & Search</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#C88A35]/15 text-[#8A5A18] dark:text-[#DECFA9] border border-[#C88A35]/30">
                    {enableSearchGrounding ? 'Google Search Grounding' : taskMode === 'complex' ? 'gemini-3.1-pro-preview' : taskMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-[#736859] dark:text-[#A89D8E]">
                LightHouse 橋i • Intelligent Reference Assistant & Live Web Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Clear Conversation"
              className="p-2 text-[#A89D8E] hover:text-[#BD3A2B] rounded-lg hover:bg-[#F5EFE3] dark:hover:bg-[#2B2520] transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#A89D8E] hover:text-[#2B2520] dark:hover:text-white rounded-lg hover:bg-[#F5EFE3] dark:hover:bg-[#2B2520] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Sub-Bar: Model speed / task selection & Search Grounding Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-[#F5EFE3] dark:bg-[#201C19] border-b border-[#EAE2D2] dark:border-[#38322B] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Persona */}
            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] rounded-lg px-2 py-1">
              <span className="text-[10px] text-[#A89D8E] font-semibold uppercase">Role:</span>
              <select
                value={rolePreset}
                onChange={e => setRolePreset(e.target.value as any)}
                className="bg-transparent font-bold text-[#2B2520] dark:text-[#FAF6EE] outline-none cursor-pointer text-xs"
              >
                <option value="librarian">Archivist (Librarian)</option>
                <option value="architect">Systems Architect</option>
                <option value="tutor">Certification Tutor</option>
              </select>
            </div>

            {/* Model Task Mode */}
            {!enableSearchGrounding && (
              <div className="flex items-center rounded-lg bg-[#FFFFFF] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] p-0.5">
                <button
                  onClick={() => setTaskMode('fast')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    taskMode === 'fast'
                      ? 'bg-[#C88A35] text-white shadow-2xs'
                      : 'text-[#736859] hover:text-[#2B2520] dark:hover:text-white'
                  }`}
                  title="Uses gemini-3.1-flash-lite for rapid responses"
                >
                  ⚡ Fast (Flash-Lite)
                </button>
                <button
                  onClick={() => setTaskMode('general')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    taskMode === 'general'
                      ? 'bg-[#2B2520] text-[#FAF6EE] shadow-2xs dark:bg-[#FAF6EE] dark:text-[#2B2520]'
                      : 'text-[#736859] hover:text-[#2B2520] dark:hover:text-white'
                  }`}
                  title="Uses gemini-3.5-flash for balanced tasks"
                >
                  General (3.5-Flash)
                </button>
                <button
                  onClick={() => setTaskMode('complex')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    taskMode === 'complex'
                      ? 'bg-[#BD3A2B] text-white shadow-2xs'
                      : 'text-[#736859] hover:text-[#2B2520] dark:hover:text-white'
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
                      ? 'bg-[#BD3A2B] text-white shadow-2xs'
                      : 'bg-[#2B2520] text-[#FAF6EE] shadow-2xs dark:bg-[#FAF6EE] dark:text-[#2B2520]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-[#2B2520] text-[#FAF6EE] rounded-tr-xs dark:bg-[#FAF6EE] dark:text-[#2B2520]'
                        : 'bg-[#FFFFFF] dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] border border-[#EAE2D2] dark:border-[#38322B] rounded-tl-xs whitespace-pre-wrap font-sans'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Grounding Sources (Google Search results) */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#F5EFE3] dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B] text-xs space-y-1.5 animate-in fade-in">
                      <p className="font-bold text-[#2B2520] dark:text-[#FAF6EE] flex items-center gap-1.5 text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-[#C88A35]" />
                        <span>Google Search Grounding Sources ({msg.groundingSources.length}):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.groundingSources.map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFFFFF] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] text-[11px] text-[#C88A35] hover:text-[#BD3A2B] hover:underline max-w-[260px] truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{source.title || source.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata footnote */}
                  <div className="flex items-center gap-2 px-1 text-[10px] text-[#A89D8E]">
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
            <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-[#736859] animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#2B2520] text-[#FAF6EE] flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#C88A35]" />
              </div>
              <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#201C19] border border-[#EAE2D2] dark:border-[#38322B] text-xs text-[#2B2520] dark:text-[#FAF6EE]">
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
          className="p-3 sm:p-4 bg-[#FFFFFF] dark:bg-[#201C19] border-t border-[#EAE2D2] dark:border-[#38322B] flex items-center gap-2"
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
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#DECFA9] dark:border-[#38322B] bg-[#FAF6EE] dark:bg-[#171513] text-xs sm:text-sm text-[#2B2520] dark:text-[#FAF6EE] placeholder-[#A89D8E] focus:outline-none focus:ring-2 focus:ring-[#C88A35]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] text-white disabled:opacity-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-[#FAF6EE]" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
