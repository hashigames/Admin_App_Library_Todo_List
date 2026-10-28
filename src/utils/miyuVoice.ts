/**
 * Miyu Anime Voice Synthesis & Audio Playback Utility
 * Provides dual-engine voice playback:
 * 1. Server-side Gemini 3.8 Flash Lite TTS ('gemini-3.8-flash-lite-tts' with voice 'Kore')
 * 2. Client-side Web Speech API (speechSynthesis) tuned with native female Japanese & English voices
 */

export interface SpeechOptions {
  lang?: 'ja' | 'en' | 'es';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let currentAudio: HTMLAudioElement | null = null;

// Stop any currently playing speech or audio
export function stopMiyuVoice() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Speak using client-side Web Speech API with native female voice
export function speakWithBrowserSynthesis(text: string, options: SpeechOptions = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('Web Speech API is not supported in this browser.'));
    return;
  }

  window.speechSynthesis.cancel();

  // Strip markdown, asterisks, brackets, URLs
  const clean = text
    .replace(/[*#`_~\[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .slice(0, 300);

  const utterance = new SpeechSynthesisUtterance(clean);
  const lang = options.lang || (/[ぁ-んァ-ヶ一-龯]/.test(clean) ? 'ja' : 'en');
  utterance.lang = lang === 'ja' ? 'ja-JP' : lang === 'es' ? 'es-ES' : 'en-US';

  // Anime-style voice tuning: slightly higher pitch and brisk cheerful rate
  utterance.pitch = options.pitch ?? (lang === 'ja' ? 1.25 : 1.15);
  utterance.rate = options.rate ?? (lang === 'ja' ? 1.05 : 1.02);

  // Pick best female voice available
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    if (lang === 'ja') {
      const jaVoice = voices.find(
        v =>
          v.lang.startsWith('ja') &&
          (v.name.includes('Kyoko') ||
            v.name.includes('Nanami') ||
            v.name.includes('Ayumi') ||
            v.name.includes('Google 日本語') ||
            v.name.includes('Female') ||
            !v.name.includes('Ichiro'))
      ) || voices.find(v => v.lang.startsWith('ja'));
      if (jaVoice) utterance.voice = jaVoice;
    } else {
      const enVoice = voices.find(
        v =>
          v.lang.startsWith('en') &&
          (v.name.includes('Samantha') ||
            v.name.includes('Zira') ||
            v.name.includes('Karen') ||
            v.name.includes('Victoria') ||
            v.name.includes('Google US English') ||
            v.name.includes('Female'))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }
  }

  utterance.onstart = () => {
    options.onStart?.();
  };

  utterance.onend = () => {
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    options.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

// Speak using Gemini 3.8 Flash Lite TTS with automatic fallback to Web Speech
export async function speakWithMiyuAI(text: string, options: SpeechOptions = {}) {
  stopMiyuVoice();

  const lang = options.lang || (/[ぁ-んァ-ヶ一-龯]/.test(text) ? 'ja' : 'en');

  try {
    options.onStart?.();

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        currentAudio = audio;

        audio.onended = () => {
          currentAudio = null;
          options.onEnd?.();
        };

        audio.onerror = (e) => {
          currentAudio = null;
          // Fallback to browser synthesis
          speakWithBrowserSynthesis(text, options);
        };

        await audio.play();
        return;
      }
    }

    // Fallback if no audioBase64 returned
    speakWithBrowserSynthesis(text, options);
  } catch (err) {
    console.warn('AI TTS server call failed, using native browser speech synthesis fallback:', err);
    speakWithBrowserSynthesis(text, options);
  }
}
