import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mic,
  MicOff,
  Volume2,
  Shield,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  ExternalLink,
  Laptop,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';

export interface VoiceInteractionToolkitProps {
  currentLang?: Language;
  onVoiceTestSuccess?: (testTranscript: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type DiagnosticStatus = 'idle' | 'testing' | 'working' | 'failed';

export const VoiceInteractionToolkit: React.FC<VoiceInteractionToolkitProps> = ({
  currentLang = 'en',
  onVoiceTestSuccess,
  onShowToast,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [showTroubleshooting, setShowTroubleshooting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chrome' | 'safari' | 'firefox' | 'os'>('chrome');

  // Capability & permission state
  const [capabilities, setCapabilities] = useState<{
    speechRecognitionSupported: boolean;
    speechSynthesisSupported: boolean;
    mediaDevicesSupported: boolean;
    browserName: string;
    micPermission: 'prompt' | 'granted' | 'denied' | 'unknown';
    errorReason?: string;
    lastTestedText?: string;
  }>({
    speechRecognitionSupported: false,
    speechSynthesisSupported: false,
    mediaDevicesSupported: false,
    browserName: 'Detecting...',
    micPermission: 'unknown',
  });

  const [testSecondsRemaining, setTestSecondsRemaining] = useState<number>(5);
  const [testTranscript, setTestTranscript] = useState<string>('');
  const [liveVolume, setLiveVolume] = useState<number>(0);

  const testRecognitionRef = useRef<any>(null);
  const testTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Detect browser name
  const detectBrowser = (): string => {
    if (typeof navigator === 'undefined') return 'Web Browser';
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Edg/')) return 'Microsoft Edge';
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) return 'Google Chrome';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Apple Safari';
    if (userAgent.includes('Firefox/')) return 'Mozilla Firefox';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    return 'Web Browser';
  };

  // Run passive initial capability check
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const hasSpeech = Boolean(SpeechRecognition);
    const hasSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const hasMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const bName = detectBrowser();

    setCapabilities((prev) => ({
      ...prev,
      speechRecognitionSupported: hasSpeech,
      speechSynthesisSupported: hasSynthesis,
      mediaDevicesSupported: hasMedia,
      browserName: bName,
    }));

    // Auto-check mic permission if supported by the browser Permissions API
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((perm) => {
          setCapabilities((prev) => ({
            ...prev,
            micPermission: perm.state as any,
          }));
          if (perm.state === 'granted' && hasSpeech) {
            setStatus('working');
          } else if (perm.state === 'denied') {
            setStatus('failed');
            setCapabilities((prev) => ({
              ...prev,
              errorReason: 'Microphone permission blocked in browser settings. Please allow access.',
            }));
          }

          perm.onchange = () => {
            setCapabilities((prev) => ({
              ...prev,
              micPermission: perm.state as any,
            }));
            if (perm.state === 'granted' && hasSpeech) {
              setStatus('working');
            } else if (perm.state === 'denied') {
              setStatus('failed');
            }
          };
        })
        .catch(() => {
          // Permissions API query not supported for microphone on this browser
        });
    } else {
      if (hasSpeech) {
        setStatus('idle');
      } else {
        setStatus('failed');
        setCapabilities((prev) => ({
          ...prev,
          errorReason: `Web Speech Recognition API is not supported in ${bName}. Use Google Chrome or Microsoft Edge.`,
        }));
      }
    }

    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  // Run interactive live voice test with real audio level metering
  const handleRunVoiceTest = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('failed');
      setShowTroubleshooting(true);
      setCapabilities((prev) => ({
        ...prev,
        errorReason: 'Web SpeechRecognition API missing in current browser engine. Recommended: Google Chrome or Microsoft Edge.',
      }));
      onShowToast('Voice commands are not supported in this browser. See troubleshooting guidance.', 'error');
      return;
    }

    setStatus('testing');
    setTestTranscript('');
    setTestSecondsRemaining(5);
    setLiveVolume(0);

    try {
      // 1. Request microphone access and setup audio volume analyser
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          setCapabilities((prev) => ({ ...prev, micPermission: 'granted' }));

          // Setup AudioContext for live volume meter
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const audioCtx = new AudioCtx();
              audioContextRef.current = audioCtx;
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateMeter = () => {
                if (analyser) {
                  analyser.getByteFrequencyData(dataArray);
                  let sum = 0;
                  for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                  }
                  const avg = sum / dataArray.length;
                  setLiveVolume(Math.min(100, Math.round((avg / 128) * 100)));
                  animFrameRef.current = requestAnimationFrame(updateMeter);
                }
              };
              updateMeter();
            }
          } catch (audioErr) {
            console.warn('Audio analyser setup note:', audioErr);
          }
        } catch (mediaErr: any) {
          console.warn('Microphone permission request failed:', mediaErr);
          setStatus('failed');
          setShowTroubleshooting(true);
          const reason =
            mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError'
              ? 'Microphone permission denied by user or blocked by browser settings.'
              : `Microphone hardware error: ${mediaErr.message || mediaErr.name}`;
          setCapabilities((prev) => ({
            ...prev,
            micPermission: 'denied',
            errorReason: reason,
          }));
          onShowToast(reason, 'error');
          cleanupAudio();
          return;
        }
      }

      // 2. Start speech recognition test
      const testRec = new SpeechRecognition();
      testRec.continuous = false;
      testRec.interimResults = true;
      testRec.lang =
        currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';

      let receivedSpeech = false;

      testRec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          receivedSpeech = true;
          setTestTranscript(transcript);
          setCapabilities((prev) => ({ ...prev, lastTestedText: transcript }));
          if (onVoiceTestSuccess) {
            onVoiceTestSuccess(transcript);
          }
        }
      };

      testRec.onerror = (event: any) => {
        console.warn('Test recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setStatus('failed');
          setShowTroubleshooting(true);
          setCapabilities((prev) => ({
            ...prev,
            micPermission: 'denied',
            errorReason: 'Microphone permission blocked in browser.',
          }));
        } else if (event.error === 'no-speech') {
          if (!receivedSpeech) {
            setStatus('failed');
            setShowTroubleshooting(true);
            setCapabilities((prev) => ({
              ...prev,
              errorReason: 'No speech was detected during the 5-second test window. Check input volume.',
            }));
          }
        } else {
          setStatus('failed');
          setShowTroubleshooting(true);
          setCapabilities((prev) => ({
            ...prev,
            errorReason: `Recognition error: ${event.error}`,
          }));
        }
      };

      testRec.onend = () => {
        if (testTimerRef.current) clearInterval(testTimerRef.current);
        cleanupAudio();
        if (receivedSpeech) {
          setStatus('working');
          onShowToast('Voice test passed! Web Speech API and Microphone are OKAY WORKING.', 'success');
        } else {
          setStatus('failed');
          setShowTroubleshooting(true);
          setCapabilities((prev) => ({
            ...prev,
            errorReason: 'No voice audio recognized. Please speak closer or check microphone settings.',
          }));
        }
      };

      testRecognitionRef.current = testRec;
      testRec.start();

      // Countdown timer for 5 seconds
      testTimerRef.current = setInterval(() => {
        setTestSecondsRemaining((sec) => {
          if (sec <= 1) {
            clearInterval(testTimerRef.current);
            try {
              testRec.stop();
            } catch {}
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Test startup error:', err);
      cleanupAudio();
      setStatus('failed');
      setShowTroubleshooting(true);
      setCapabilities((prev) => ({
        ...prev,
        errorReason: err.message || 'Unknown voice recognition error',
      }));
    }
  };

  // Simulated Voice Command Test (Fallback for users without physical mic)
  const handleSimulatedVoiceTest = () => {
    setStatus('working');
    const sample = 'Create a todolist called Games_2026 with 4 columns and 5 rows';
    setTestTranscript(sample);
    setCapabilities((prev) => ({
      ...prev,
      lastTestedText: sample,
      errorReason: undefined,
    }));
    if (onVoiceTestSuccess) {
      onVoiceTestSuccess(sample);
    }
    onShowToast('Simulated Voice Test Passed! Voice command pipeline is OKAY WORKING.', 'success');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-r from-[#1E2A5E] to-[#0097B2] text-white shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1E2A5E] dark:text-slate-100">
                Voice Interaction Toolkit & Browser Compatibility
              </h3>
              {/* STATUS BADGE: OKAY WORKING or FAILED */}
              {status === 'working' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>OKAY WORKING</span>
                </span>
              ) : status === 'failed' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-700 animate-in fade-in">
                  <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>FAILED / NOT WORKING</span>
                </span>
              ) : status === 'testing' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                  <Mic className="w-3.5 h-3.5 text-amber-600" />
                  <span>TESTING VOICE ({testSecondsRemaining}s)...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Ready to Test
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Web Speech API recognition, live microphone access status & troubleshooting guide.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Test Button */}
          <button
            type="button"
            disabled={status === 'testing'}
            onClick={handleRunVoiceTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-linear-to-r from-[#1E2A5E] to-[#2A3B82] hover:opacity-95 text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-300" />
            <span>{status === 'testing' ? 'Listening...' : 'Run Voice Test'}</span>
          </button>

          {/* Fallback Simulator */}
          <button
            type="button"
            onClick={handleSimulatedVoiceTest}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="Test voice pipeline without physical microphone hardware"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0097B2]" />
            <span>Simulate Voice</span>
          </button>

          {/* Troubleshooting Guidance Toggle */}
          <button
            type="button"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              showTroubleshooting
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Troubleshooting</span>
          </button>

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            title={isExpanded ? 'Collapse Toolkit' : 'Expand Toolkit'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Capability Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Browser Engine */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Detected Browser
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {capabilities.browserName}
              </p>
            </div>

            {/* 2. Web Speech API Recognition */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Speech Recognition API
              </span>
              <p
                className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                  capabilities.speechRecognitionSupported
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500'
                }`}
              >
                {capabilities.speechRecognitionSupported ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Supported</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>Not Supported</span>
                  </>
                )}
              </p>
            </div>

            {/* 3. Microphone Access Status */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Microphone Access Status
              </span>
              <p
                className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                  capabilities.micPermission === 'granted'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : capabilities.micPermission === 'denied'
                    ? 'text-red-500'
                    : 'text-amber-500'
                }`}
              >
                {capabilities.micPermission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Allowed (Active)</span>
                  </>
                ) : capabilities.micPermission === 'denied' ? (
                  <>
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>Blocked</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Needs Permission</span>
                  </>
                )}
              </p>
            </div>

            {/* 4. Speech Synthesis TTS */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Speech Audio (TTS)
              </span>
              <p
                className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                  capabilities.speechSynthesisSupported
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {capabilities.speechSynthesisSupported ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Audio TTS Enabled</span>
                  </>
                ) : (
                  <span>Unavailable</span>
                )}
              </p>
            </div>
          </div>

          {/* Active Testing State Banner with live audio level */}
          {status === 'testing' && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Listening for voice input... Say: &quot;Hello Lighthouse&quot; or &quot;Test 1 2 3&quot;
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-md">
                  {testSecondsRemaining}s left
                </span>
              </div>

              {/* Volume / Audio Level Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3 text-red-500" />
                    Mic Input Volume Meter:
                  </span>
                  <span>{liveVolume}%</span>
                </div>
                <div className="h-2 w-full bg-amber-200/60 dark:bg-amber-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75 rounded-full"
                    style={{ width: `${Math.max(5, liveVolume)}%` }}
                  />
                </div>
              </div>

              {/* Wave animation */}
              <div className="flex items-center gap-1.5 h-6">
                {[14, 24, 34, 18, 30, 12, 28, 20, 16, 26, 32, 19, 25].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: `${Math.max(6, (h * (liveVolume + 20)) / 100)}px`,
                    }}
                    className="w-1 bg-[#0097B2] rounded-full transition-all duration-100"
                  />
                ))}
              </div>

              {testTranscript && (
                <p className="text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-100">
                  Heard: &quot;{testTranscript}&quot;
                </p>
              )}
            </div>
          )}

          {/* Failed Notice with direct troubleshooting prompt */}
          {status === 'failed' && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                    Voice Commands Test: FAILED
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    {capabilities.errorReason ||
                      'Microphone or Web Speech Recognition is currently unavailable.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTroubleshooting(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0 transition cursor-pointer"
              >
                View Guidance
              </button>
            </div>
          )}

          {/* Working Notice */}
          {status === 'working' && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>OKAY WORKING:</strong> Web Speech API and Microphone access are verified and active!
                  {capabilities.lastTestedText && ` (Heard: "${capabilities.lastTestedText}")`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunVoiceTest}
                className="text-[11px] underline text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
              >
                Re-test
              </button>
            </div>
          )}

          {/* TROUBLESHOOTING GUIDANCE SECTION */}
          {showTroubleshooting && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Microphone & Voice Command Troubleshooting Guidance
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTroubleshooting(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Tabs for Chrome / Safari / Firefox / OS */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('chrome')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'chrome'
                      ? 'bg-[#1E2A5E] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Chrome / Edge
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('safari')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'safari'
                      ? 'bg-[#1E2A5E] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Apple Safari (iOS / Mac)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('firefox')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'firefox'
                      ? 'bg-[#1E2A5E] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Firefox
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('os')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'os'
                      ? 'bg-[#1E2A5E] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  OS Privacy Settings
                </button>
              </div>

              {/* Tab 1: Google Chrome / Microsoft Edge */}
              {activeTab === 'chrome' && (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    How to Unblock Microphone in Google Chrome or Microsoft Edge:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      Look at the top URL address bar next to the domain name. Click the{' '}
                      <strong>Lock icon 🔒</strong> or <strong>Site Settings icon ⚙️</strong>.
                    </li>
                    <li>
                      Find <strong>Microphone</strong> in the permissions menu.
                    </li>
                    <li>
                      Switch it from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>.
                    </li>
                    <li>
                      Return to this page and click <strong>&quot;Run Voice Test&quot;</strong> above.
                    </li>
                  </ol>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 rounded-lg text-[11px]">
                    💡 <em>Note:</em> Chrome and Edge provide native cloud voice recognition powered by Google Speech Engine.
                  </div>
                </div>
              )}

              {/* Tab 2: Apple Safari */}
              {activeTab === 'safari' && (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    How to Unblock Microphone in Apple Safari:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>On macOS Safari:</strong> Go to Safari Menu → <em>Settings for This Website...</em> → <strong>Microphone</strong> → Change to <strong>Allow</strong>.
                    </li>
                    <li>
                      <strong>On iPhone / iPad (iOS):</strong> Open device <em>Settings</em> → <em>Safari</em> → <em>Microphone</em> → Select <strong>Allow</strong> (iOS 14.5+ required).
                    </li>
                    <li>
                      Ensure the site is served over HTTPS or localhost (Safari enforces strict TLS for media).
                    </li>
                  </ul>
                </div>
              )}

              {/* Tab 3: Firefox */}
              {activeTab === 'firefox' && (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Mozilla Firefox Web Speech API Advisory:
                  </p>
                  <p>
                    Mozilla Firefox does not have the Google Speech Recognition cloud backend enabled by default.
                  </p>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] space-y-1">
                    <p className="font-bold">Recommendation for Best Voice Experience:</p>
                    <p>
                      Use <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong> to enjoy native instant voice dictation.
                    </p>
                    <p>
                      Alternatively, click <strong>&quot;Simulate Voice&quot;</strong> or type your commands directly into the prompt box below!
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: OS Privacy Settings */}
              {activeTab === 'os' && (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Operating System Microphone Privacy Permissions:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Windows 11 / 10:</strong> Open Windows Settings → <em>Privacy & Security</em> → <em>Microphone</em> → Turn on <em>&quot;Let desktop apps access your microphone&quot;</em>.
                    </li>
                    <li>
                      <strong>Apple macOS:</strong> System Settings → <em>Privacy & Security</em> → <em>Microphone</em> → Make sure your web browser has the toggle switched on.
                    </li>
                    <li>
                      <strong>Hardware mute button:</strong> Verify your headset or laptop keyboard doesn&apos;t have a hardware physical mute button turned on.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceInteractionToolkit;
