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
    'Create TodoListの機能と使い方を教えて！',
    'Excelみたいに列幅を小さく（縮小）する方法は？',
    'マトリックスのズーム（拡大・縮小）とTabキー移動は？',
    'おすすめの機械学習・AI本を教えて！',
  ] : [
    'Explain Create TodoList and how it works!',
    'How do I diminish or resize columns like Excel?',
    'How does Matrix Zoom & Tab navigation work?',
    'Recommend technical books in Machine Learning',
  ];

  return (
    <aside aria-label="Miyu AI Assistant" className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* 1. Small Panel Area (when open) */}
      {isOpen && (
        <div className="mb-3 w-[340px] sm:w-[380px] h-[520px] max-h-[80vh] flex flex-col bg-white dark:bg-[#1E141A] backdrop-blur-md rounded-3xl shadow-2xl border-2 border-[#F2D5DE] dark:border-[#382631] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Anime Header Card */}
          <div className="p-3 bg-gradient-to-r from-[#8A1E3B] via-[#C83761] to-[#E8637C] text-white border-b border-[#F2D5DE]/40 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              {/* Animated Chibi Avatar Badge */}
              <div className="relative">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 ${isSpeaking ? 'border-white ring-2 ring-white/50 animate-pulse' : 'border-pink-200'} shadow bg-[#FFF5F7]`}>
                  <img
                    src={MIYU_IMAGES[currentPose] || MIYU_IMAGES.welcome}
                    alt="MIYU"
                    className="w-full h-full object-cover object-top scale-125 translate-y-1 transition-all duration-300"
                  />
                </div>
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-wide font-serif-jp text-white flex items-center gap-1">
                    <span>MIYU</span>
                    <span className="text-[11px] text-pink-100 font-normal">ミユ 🌸</span>
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                    AI Voice
                  </span>
                </div>
                <p className="text-[10px] text-pink-100/90 flex items-center gap-1">
                  {isSpeaking ? (
                    <span className="text-white font-medium flex items-center gap-1 animate-pulse">
                      <span>Speaking...</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white"></span>
                    </span>
                  ) : isListening ? (
                    <span className="text-amber-200 font-medium flex items-center gap-1 animate-pulse">
                      <span>Listening to mic...</span>
                    </span>
                  ) : (
                    <span>Lighthouse Sakura Companion</span>
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
                    ? 'text-white hover:bg-white/20'
                    : 'text-white/50 hover:bg-white/10'
                }`}
                title={autoVoiceReply ? 'Auto Voice Speech: ON' : 'Auto Voice Speech: MUTED'}
              >
                {autoVoiceReply ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-white/40" />}
              </button>

              {/* Mouse Toolkit guide toggle */}
              <button
                type="button"
                onClick={onToggleMouseToolkit}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  mouseToolkitEnabled
                    ? 'bg-white/25 text-white border-white/50'
                    : 'bg-transparent text-white/60 border-white/30 hover:text-white'
                }`}
                title="Toggle Miyu Mouse Hover Tooltip Explanations"
              >
                Guide {mouseToolkitEnabled ? 'ON' : 'OFF'}
              </button>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => onLanguageChange(currentLang === 'ja' ? 'en' : 'ja')}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/20 text-white hover:bg-white/30 transition"
                title="Switch Language"
              >
                {currentLang === 'ja' ? 'JP' : 'EN'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onToggleOpen}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs bg-white dark:bg-[#1E141A]">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'miyu' && (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E8637C] shrink-0 mt-0.5 bg-[#FFF0F3]">
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
                      ? 'bg-[#E8637C] text-white rounded-tr-none'
                      : 'bg-[#FFF5F7] dark:bg-[#251820] text-[#1E1619] dark:text-[#FDF2F5] border border-[#F2D5DE] dark:border-[#382631] rounded-tl-none'
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
                            ? 'bg-[#8A1E3B] text-white animate-pulse'
                            : 'hover:text-[#8A1E3B] text-[#E8637C]'
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
              <div className="flex gap-2 items-center text-xs text-[#8A7881] italic p-1 animate-pulse">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#E8637C] shrink-0 bg-[#FFF5F7]">
                  <img src={MIYU_IMAGES.thinking} alt="Miyu Thinking" className="w-full h-full object-cover object-top scale-125" />
                </div>
                <span>Miyu is thinking... (考え中🌸)</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-2 py-1.5 border-t border-[#F2D5DE] dark:border-[#382631] bg-[#FFF9FB] dark:bg-[#1A1217] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] bg-white dark:bg-[#251820] border border-[#F2D5DE] dark:border-[#382631] text-[#8A1E3B] dark:text-[#FDF2F5] hover:border-[#E8637C] hover:bg-[#FDE8EE] transition shrink-0 cursor-pointer"
              >
                🌸 {q}
              </button>
            ))}
          </div>

          {/* Input Footer: Voice Mic + Text Input + Send */}
          <div className="p-2.5 bg-white dark:bg-[#1E141A] border-t border-[#F2D5DE] dark:border-[#382631] shrink-0">
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
                    ? 'bg-[#8A1E3B] text-white animate-bounce shadow-md'
                    : 'bg-[#FFF5F7] dark:bg-[#251820] text-[#8A1E3B] dark:text-[#FDF2F5] hover:bg-[#FDE8EE] border border-[#F2D5DE] dark:border-[#382631]'
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
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FFF9FB] dark:bg-[#251820] border border-[#F2D5DE] dark:border-[#382631] text-[#1E1619] dark:text-[#FDF2F5] focus:outline-none focus:ring-1 focus:ring-[#E8637C]"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2 rounded-xl bg-[#8A1E3B] hover:bg-[#A82B4E] disabled:opacity-40 text-white transition shadow-2xs cursor-pointer shrink-0"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E141A] border-2 border-[#E8637C]/60 shadow-lg text-[#8A1E3B] dark:text-[#FDF2F5] text-xs font-bold cursor-pointer hover:scale-105 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8637C]" />
            <span>{currentLang === 'ja' ? 'ミユに質問する？🌸' : 'Talk with Miyu! 🌸'}</span>
          </div>
        )}

        {/* Animated Avatar Button */}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`relative p-1 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer ${
            isOpen
              ? 'bg-[#8A1E3B] ring-4 ring-[#E8637C]/40'
              : 'bg-gradient-to-tr from-[#8A1E3B] via-[#E8637C] to-[#FCE0E7] ring-4 ring-[#E8637C]/40'
          }`}
          title="Open Miyu Voice Chatbot & Matrix Companion"
        >
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/90 bg-[#FFF5F7]">
            <img
              src={MIYU_IMAGES.waving}
              alt="MIYU Anime Assistant"
              className="w-full h-full object-cover object-top scale-125 translate-y-1"
            />
          </div>

          {/* Anime Online / Speaking Indicator Badge */}
          <span className="absolute bottom-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8637C] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#E8637C] border-2 border-white text-[8px] text-white font-bold items-center justify-center">
              🌸
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
};
