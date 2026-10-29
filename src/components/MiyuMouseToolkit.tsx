import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, X, HelpCircle } from 'lucide-react';
import { MIYU_BUTTON_EXPLANATIONS, MIYU_IMAGES, MiyuPose } from '../utils/miyuAssets';
import { speakWithMiyuAI, stopMiyuVoice } from '../utils/miyuVoice';
import { Language } from '../types';

interface MiyuMouseToolkitProps {
  currentLang: Language;
  enabled: boolean;
  onToggleEnabled: () => void;
  autoSpeakHover?: boolean;
}

interface ActiveTip {
  title: string;
  text: string;
  pose: MiyuPose;
  badge?: string;
  x: number;
  y: number;
}

export const MiyuMouseToolkit: React.FC<MiyuMouseToolkitProps> = ({
  currentLang,
  enabled,
  onToggleEnabled,
  autoSpeakHover = false,
}) => {
  const [activeTip, setActiveTip] = useState<ActiveTip | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTargetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActiveTip(null);
      stopMiyuVoice();
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-miyu-tip]') as HTMLElement | null;
      if (!target) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        return;
      }

      const tipKey = target.getAttribute('data-miyu-tip');
      if (!tipKey || tipKey === lastTargetKeyRef.current) return;

      const guide = MIYU_BUTTON_EXPLANATIONS[tipKey];
      if (!guide) return;

      lastTargetKeyRef.current = tipKey;

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Small 150ms debounce for natural feel
      hoverTimeoutRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Position tooltip nicely near the element
        let x = rect.left + rect.width / 2;
        let y = rect.bottom + 12;

        // Adjust if overflowing horizontally or vertically
        const tooltipWidth = 320;
        const tooltipHeight = 160;

        if (x + tooltipWidth / 2 > viewportWidth - 20) {
          x = viewportWidth - tooltipWidth / 2 - 20;
        }
        if (x - tooltipWidth / 2 < 20) {
          x = tooltipWidth / 2 + 20;
        }

        if (y + tooltipHeight > viewportHeight - 20) {
          y = rect.top - tooltipHeight - 12;
        }

        const isJa = currentLang === 'ja';
        const title = isJa ? guide.titleJa : guide.title;
        const text = isJa ? guide.ja : guide.en;

        setActiveTip({
          title,
          text,
          pose: guide.pose,
          badge: guide.badge,
          x,
          y,
        });

        if (autoSpeakHover) {
          setIsSpeaking(true);
          speakWithMiyuAI(text, {
            lang: isJa ? 'ja' : 'en',
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        }
      }, 180);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-miyu-tip]') as HTMLElement | null;
      if (target) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        lastTargetKeyRef.current = null;
        setActiveTip(null);
        if (autoSpeakHover) {
          stopMiyuVoice();
          setIsSpeaking(false);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [enabled, currentLang, autoSpeakHover]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTip) return;

    if (isSpeaking) {
      stopMiyuVoice();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    speakWithMiyuAI(activeTip.text, {
      lang: currentLang === 'ja' ? 'ja' : 'en',
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  if (!enabled || !activeTip) return null;

  return (
    <div
      style={{
        left: `${activeTip.x}px`,
        top: `${activeTip.y}px`,
        transform: 'translateX(-50%)',
      }}
      className="fixed z-50 pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      <div className="w-[320px] sm:w-[350px] bg-white/98 dark:bg-[#1E141A]/98 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border-2 border-[#E8637C]/60 dark:border-[#E8637C]/50 text-[#1E1619] dark:text-[#FDF2F5] relative">
        {/* Glow indicator & Arrow pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1E141A] rotate-45 border-t-2 border-l-2 border-[#E8637C]/60" />

        <div className="relative flex items-start gap-3">
          {/* Miyu Chibi Avatar with animated frame */}
          <div className="relative shrink-0">
            <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isSpeaking ? 'border-[#8A1E3B] ring-2 ring-[#E8637C]/50 animate-pulse' : 'border-[#E8637C]'} shadow-md bg-[#FFF5F7] dark:bg-[#140E12]`}>
              <img
                src={MIYU_IMAGES[activeTip.pose] || MIYU_IMAGES.welcome}
                alt="MIYU"
                className="w-full h-full object-cover object-top scale-125 translate-y-1"
              />
            </div>
            {isSpeaking && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8637C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#8A1E3B] text-[8px] text-white items-center justify-center font-bold">🌸</span>
              </span>
            )}
          </div>

          {/* Miyu Speech Bubble */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-[#FFF0F3] text-[#8A1E3B] dark:bg-[#321B27] dark:text-[#F48FB1] border border-[#F2D5DE] dark:border-[#4D3343]">
                  🌸 MIYU GUIDE
                </span>
                {activeTip.badge && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#FDE8EE] text-[#8A1E3B] dark:text-[#F48FB1]">
                    {activeTip.badge}
                  </span>
                )}
              </div>

              {/* Voice button */}
              <button
                type="button"
                onClick={handleSpeak}
                className={`p-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isSpeaking
                    ? 'bg-[#8A1E3B] text-white animate-pulse'
                    : 'bg-[#FFF0F3] dark:bg-[#251820] text-[#8A1E3B] dark:text-[#FDF2F5] hover:bg-[#FDE8EE] dark:hover:bg-[#32202B] border border-[#F2D5DE] dark:border-[#4D3343]'
                }`}
                title="Hear Miyu explain in native voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">{isSpeaking ? 'Playing...' : 'Voice'}</span>
              </button>
            </div>

            <h4 className="text-xs font-bold text-[#1E1619] dark:text-[#FDF2F5] font-serif-jp flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-[#E8637C]" />
              <span>{activeTip.title}</span>
            </h4>

            <p className="text-[11px] leading-relaxed text-[#57474E] dark:text-[#E2B8C4] font-sans">
              {activeTip.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
