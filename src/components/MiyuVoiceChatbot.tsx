import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Languages,
  HelpCircle,
  Play,
  Square,
  Bot,
  MessageCircle,
} from 'lucide-react';
import { MIYU_IMAGES, MiyuPose } from '../utils/miyuAssets';
import { speakWithMiyuAI, stopMiyuVoice } from '../utils/miyuVoice';
import { Language } from '../types';

interface MiyuVoiceChatbotProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  mouseToolkitEnabled: boolean;
  onToggleMouseToolkit: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'miyu';
  text: string;
  pose?: MiyuPose;
  timestamp: string;
}

export const MiyuVoiceChatbot: React.FC<MiyuVoiceChatbotProps> = ({
  currentLang,
  onLanguageChange,
  mouseToolkitEnabled,
  onToggleMouseToolkit,
  isOpen,
  onToggleOpen,
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const isJa = currentLang === 'ja';
    return [
      {
        id: 'msg-init',
        sender: 'miyu',
        text: isJa
          ? 'こんにちは！AIアシスタントのミユ（MIYU）です♪ 技術書の検索やTodoListMatrixの操作（Excel風リサイズ、Tab移動、URL列など）何でも聞いてね！音声でもお話しできるよ★'
          : 'Hello! I am Miyu (ミユ), your friendly anime AI companion♪ Ask me anything about our technical library, or how to master TodoListMatrix (Excel-style resizing, Tab navigation, and custom columns)! I can talk in native voice too★',
        pose: 'welcome',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPose, setCurrentPose] = useState<MiyuPose>('welcome');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);
  const [activeVoiceMsgId, setActiveVoiceMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setCurrentPose('waving');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          // auto-send voice query
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [currentLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        currentLang === 'ja'
          ? 'お使いのブラウザは音声認識をサポートしていません。テキスト入力をご利用ください。'
          : 'Speech recognition is not supported in this browser. Please type your message.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopMiyuVoice();
      setIsSpeaking(false);
      recognitionRef.current.lang = currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start failed:', e);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText('');
    stopMiyuVoice();
    setIsSpeaking(false);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setCurrentPose('thinking');

    try {
      // Determine pose based on query theme
      let targetPose: MiyuPose = 'talking';
      const qLower = query.toLowerCase();
      if (qLower.includes('matrix') || qLower.includes('todolist') || qLower.includes('excel') || qLower.includes('column') || qLower.includes('zoom')) {
        targetPose = 'excited_jump';
      } else if (qLower.includes('book') || qLower.includes('pdf') || qLower.includes('learn') || qLower.includes('勉強') || qLower.includes('本')) {
        targetPose = 'empowered';
      } else if (qLower.includes('cute') || qLower.includes('かわいい') || qLower.includes('hello') || qLower.includes('こんにちは')) {
        targetPose = 'happy_rawr';
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.slice(-6).map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              content: m.text,
            })),
            { role: 'user', content: query },
          ],
          taskType: 'fast',
        }),
      });

      let replyText = '';
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply || (currentLang === 'ja' ? 'お返事を用意できませんでした。' : 'I could not generate a reply.');
      } else {
        replyText = currentLang === 'ja'
          ? '通信エラーが発生したみたいです。もう一度話しかけてね！'
          : 'A connection hiccup occurred. Please try speaking to me again!';
      }

      const miyuMsg: Message = {
        id: `miyu-${Date.now()}`,
        sender: 'miyu',
        text: replyText,
        pose: targetPose,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, miyuMsg]);
      setCurrentPose(targetPose);

      if (autoVoiceReply) {
        playMessageAudio(replyText, miyuMsg.id);
      }
    } catch (err) {
      console.error('Chat request error:', err);
      const errMsg: Message = {
        id: `miyu-err-${Date.now()}`,
        sender: 'miyu',
        text: currentLang === 'ja'
          ? 'ミユです！一時的なエラーですが、ライブラリやマトリックスはそのまま快適にご利用いただけます！'
          : 'Miyu here! A small connection hiccup occurred, but you can continue using the Library and Matrix smoothly!',
        pose: 'talking',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const playMessageAudio = (text: string, msgId: string) => {
    if (isSpeaking && activeVoiceMsgId === msgId) {
      stopMiyuVoice();
      setIsSpeaking(false);
      setActiveVoiceMsgId(null);
      setCurrentPose('idle');
      return;
    }

    stopMiyuVoice();
    setIsSpeaking(true);
    setActiveVoiceMsgId(msgId);
    setCurrentPose('talking');

    speakWithMiyuAI(text, {
      lang: currentLang === 'ja' ? 'ja' : 'en',
      onStart: () => {
        setIsSpeaking(true);
        setCurrentPose('talking');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActiveVoiceMsgId(null);
        setCurrentPose('idle');
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveVoiceMsgId(null);
        setCurrentPose('idle');
      },
    });
  };

  const quickPrompts = currentLang === 'ja' ? [
    'TodoListMatrixの機能と使い方を教えて！',
    'Excelみたいに列幅を小さく（縮小）する方法は？',
    'マトリックスのズーム（拡大・縮小）とTabキー移動は？',
    'おすすめの機械学習・AI本を教えて！',
  ] : [
    'Explain TodoListMatrix and how it works!',
    'How do I diminish or resize columns like Excel?',
    'How does Matrix Zoom & Tab navigation work?',
    'Recommend technical books in Machine Learning',
  ];

  return (
    <aside aria-label="Miyu AI Assistant" className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* 1. Small Panel Area (when open) */}
      {isOpen && (
        <div className="mb-3 w-[340px] sm:w-[380px] h-[520px] max-h-[80vh] flex flex-col bg-[#FAF6EE]/95 dark:bg-[#1C1815]/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-[#C88A35]/60 dark:border-[#C88A35]/40 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Anime Header Card */}
          <div className="p-3 bg-gradient-to-r from-[#2B2520] via-[#38322B] to-[#2B2520] text-[#FAF6EE] border-b border-[#C88A35]/40 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              {/* Animated Chibi Avatar Badge */}
              <div className="relative">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 ${isSpeaking ? 'border-[#BD3A2B] ring-2 ring-[#BD3A2B]/50 animate-pulse' : 'border-[#C88A35]'} shadow bg-[#FAF6EE]`}>
                  <img
                    src={MIYU_IMAGES[currentPose] || MIYU_IMAGES.welcome}
                    alt="MIYU"
                    className="w-full h-full object-cover object-top scale-125 translate-y-1 transition-all duration-300"
                  />
                </div>
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BD3A2B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#BD3A2B]"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-wide font-serif-jp text-white flex items-center gap-1">
                    <span>MIYU</span>
                    <span className="text-[11px] text-[#DECFA9] font-normal">ミユ</span>
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#BD3A2B] text-white">
                    AI Voice
                  </span>
                </div>
                <p className="text-[10px] text-[#DECFA9]/80 flex items-center gap-1">
                  {isSpeaking ? (
                    <span className="text-[#FF8D80] font-medium flex items-center gap-1 animate-pulse">
                      <span>Speaking...</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF8D80]"></span>
                    </span>
                  ) : isListening ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
                      <span>Listening to mic...</span>
                    </span>
                  ) : (
                    <span>Lighthouse Companion &amp; Matrix Guide</span>
                  )}
                </p>
              </div>
            </div>

            {/* Header controls: Voice, Toolkit toggle, Lang, Close */}
            <div className="flex items-center gap-1">
              {/* Auto-Voice toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) stopMiyuVoice();
                  setAutoVoiceReply(!autoVoiceReply);
                }}
                className={`p-1.5 rounded-lg text-xs transition ${
                  autoVoiceReply
                    ? 'text-[#C88A35] hover:bg-[#FAF6EE]/10'
                    : 'text-stone-400 hover:bg-[#FAF6EE]/10'
                }`}
                title={autoVoiceReply ? 'Auto Voice Speech: ON' : 'Auto Voice Speech: MUTED'}
              >
                {autoVoiceReply ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
              </button>

              {/* Mouse Toolkit guide toggle */}
              <button
                type="button"
                onClick={onToggleMouseToolkit}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  mouseToolkitEnabled
                    ? 'bg-[#C88A35]/30 text-[#DECFA9] border-[#C88A35]'
                    : 'bg-transparent text-stone-400 border-stone-600 hover:text-white'
                }`}
                title="Toggle Miyu Mouse Hover Tooltip Explanations"
              >
                Guide {mouseToolkitEnabled ? 'ON' : 'OFF'}
              </button>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => onLanguageChange(currentLang === 'ja' ? 'en' : 'ja')}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#FAF6EE]/10 text-[#DECFA9] hover:bg-[#FAF6EE]/20 transition"
                title="Switch Language"
              >
                {currentLang === 'ja' ? 'JP' : 'EN'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1 rounded-lg text-[#DECFA9] hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'miyu' && (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-[#C88A35] shrink-0 mt-0.5 bg-[#FAF6EE]">
                    <img
                      src={MIYU_IMAGES[m.pose || 'idle']}
                      alt="Miyu"
                      className="w-full h-full object-cover object-top scale-125"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-2.5 shadow-2xs relative ${
                    m.sender === 'user'
                      ? 'bg-[#BD3A2B] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#201C19] text-[#2B2520] dark:text-[#FAF6EE] border border-[#DECFA9] dark:border-[#38322B] rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5 text-[9px] opacity-75">
                    <span>{m.timestamp}</span>
                    {m.sender === 'miyu' && (
                      <button
                        type="button"
                        onClick={() => playMessageAudio(m.text, m.id)}
                        className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded transition ${
                          activeVoiceMsgId === m.id && isSpeaking
                            ? 'bg-[#BD3A2B] text-white animate-pulse'
                            : 'hover:text-[#BD3A2B] text-[#C88A35]'
                        }`}
                        title="Play in native voice"
                      >
                        {activeVoiceMsgId === m.id && isSpeaking ? (
                          <>
                            <Square className="w-2.5 h-2.5 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-xs text-[#736859] dark:text-[#A89D8E] italic p-1 animate-pulse">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#C88A35] shrink-0 bg-[#FAF6EE]">
                  <img src={MIYU_IMAGES.thinking} alt="Miyu Thinking" className="w-full h-full object-cover object-top scale-125" />
                </div>
                <span>Miyu is thinking... (考え中♪)</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-2 py-1.5 border-t border-[#EAE2D2] dark:border-[#2D2823] bg-[#FAF6EE]/80 dark:bg-[#171513]/80 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap px-2 py-1 rounded-full text-[10px] bg-white dark:bg-[#201C19] border border-[#DECFA9] dark:border-[#38322B] text-[#736859] dark:text-[#DECFA9] hover:border-[#C88A35] hover:text-[#BD3A2B] transition shrink-0"
              >
                ★ {q}
              </button>
            ))}
          </div>

          {/* Input Footer: Voice Mic + Text Input + Send */}
          <div className="p-2.5 bg-white dark:bg-[#201C19] border-t border-[#DECFA9] dark:border-[#38322B] shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Mic Voice-Input Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-[#BD3A2B] text-white animate-bounce shadow-md'
                    : 'bg-[#FAF6EE] dark:bg-[#171513] text-[#736859] dark:text-[#A89D8E] hover:text-[#BD3A2B] border border-[#DECFA9] dark:border-[#38322B]'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Click to talk with your microphone'}
              >
                {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? currentLang === 'ja' ? 'お話し中...' : 'Listening to your voice...'
                    : currentLang === 'ja' ? 'ミユに質問やマトリックスの操作を聞く...' : 'Ask Miyu about TodoListMatrix or books...'
                }
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FAF6EE] dark:bg-[#171513] border border-[#DECFA9] dark:border-[#38322B] text-[#2B2520] dark:text-[#FAF6EE] focus:outline-none focus:ring-1 focus:ring-[#C88A35]"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2 rounded-xl bg-[#BD3A2B] hover:bg-[#A83225] disabled:opacity-40 text-white transition shadow-2xs cursor-pointer shrink-0"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Floating Anime Button (Right Button) */}
      <div className="flex items-center gap-2 group">
        {/* Cute Speech Bubble Prompt when closed */}
        {!isOpen && (
          <div
            onClick={onToggleOpen}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#201C19] border-2 border-[#C88A35]/50 shadow-lg text-[#2B2520] dark:text-[#FAF6EE] text-xs font-bold cursor-pointer hover:scale-105 transition animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C88A35]" />
            <span>{currentLang === 'ja' ? 'ミユに質問する？' : 'Talk with Miyu!'}</span>
          </div>
        )}

        {/* Animated Avatar Button */}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`relative p-1 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer ${
            isOpen
              ? 'bg-[#BD3A2B] ring-4 ring-[#BD3A2B]/30'
              : 'bg-gradient-to-tr from-[#2B2520] via-[#C88A35] to-[#BD3A2B] ring-4 ring-[#C88A35]/40'
          }`}
          title="Open Miyu Voice Chatbot & Matrix Companion"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/80 bg-[#FAF6EE]">
            <img
              src={MIYU_IMAGES.waving}
              alt="MIYU Anime Assistant"
              className="w-full h-full object-cover object-top scale-125 translate-y-1"
            />
          </div>

          {/* Anime Online / Speaking Indicator Badge */}
          <span className="absolute bottom-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white text-[8px] text-white font-bold items-center justify-center">
              ♪
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
};
