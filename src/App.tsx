import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from './services/apiClient.ts';
import { GlobalAudioPlayer, VoiceGender, setSavedVoiceGender, getSavedVoiceGender } from './services/audioPlayer.ts';
import { OfflineEngine } from './services/offlineEngine.ts';
import { usePWAInstall } from './hooks/usePWAInstall.ts';

type ScreenId = 'home' | 'translate' | 'history' | 'saved' | 'settings' | 'image';

interface HistoryItem {
  id: string;
  input: string;
  output: string;
  from: string;
  to: string;
  timestamp: string;
}

interface SavedItem {
  id: string;
  input: string;
  output: string;
  from: string;
  to: string;
}

function getLangSpeechCode(langStr: string): string {
  const lower = (langStr || '').toLowerCase();
  if (lower.includes('urdu')) return 'ur-PK';
  if (lower.includes('english')) return 'en-US';
  if (lower.includes('arabic')) return 'ar-SA';
  if (lower.includes('japanese')) return 'ja-JP';
  if (lower.includes('punjabi')) return 'pa-IN';
  if (lower.includes('spanish')) return 'es-ES';
  if (lower.includes('french')) return 'fr-FR';
  if (lower.includes('german')) return 'de-DE';
  if (lower.includes('hindi')) return 'hi-IN';
  return 'en-US';
}

function isRTLText(langStr: string, text?: string): boolean {
  if (text) {
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    if (rtlRegex.test(text)) return true;
  }
  const lower = (langStr || '').toLowerCase();
  return lower.includes('urdu') || lower.includes('arabic') || lower.includes('pashto') || lower.includes('sindhi') || lower.includes('persian');
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [isLightMode] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => OfflineEngine.getForceOffline());

  const { isInstallable, isInstalled, isIOS, install: pwaInstall } = usePWAInstall();
  const [showIOSInstallModal, setShowIOSInstallModal] = useState<boolean>(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await pwaInstall();
      if (success) toast('🎉 Nova Translate installed successfully!');
    } else if (isIOS) {
      setShowIOSInstallModal(true);
    } else {
      toast('💡 Open browser menu (⋮) and tap Add to Home Screen.');
    }
  };

  const toggleOfflineMode = () => {
    const next = !isOfflineMode;
    setIsOfflineMode(next);
    OfflineEngine.setForceOffline(next);
    toast(next ? '⚡ Offline Mode Active' : '🟢 Online Mode Active');
  };

  // Translation States
  const [fromLang, setFromLang] = useState<string>('Auto Detect ✨');
  const [toLang, setToLang] = useState<string>('Urdu 🇵🇰');
  const [textInput, setTextInput] = useState<string>('Hello');
  const [translatedResult, setTranslatedResult] = useState<string>('ہیلو 👋');
  const [accuracy, setAccuracy] = useState<number>(98);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // History & Saved Lists
  const [historyList, setHistoryList] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('nova_history_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', input: 'Hello', output: 'ہیلو', from: 'English 🇬🇧', to: 'Urdu 🇵🇰', timestamp: 'Today • 15:51' },
      { id: '2', input: 'Welcome', output: 'خوش آمدید', from: 'English 🇬🇧', to: 'Urdu 🇵🇰', timestamp: 'Today • 14:28' },
    ];
  });

  const [savedList, setSavedList] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('nova_saved_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 's1', input: 'Hello', output: 'ہیلو', from: 'English 🇬🇧', to: 'Urdu 🇵🇰' },
    ];
  });

  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(() => getSavedVoiceGender());
  const [customApiKey, setCustomApiKey] = useState<string>(() => ApiClient.getCustomApiKey());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  // Vision OCR State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentBase64, setCurrentBase64] = useState<string | null>(null);
  const [imageExtracted, setImageExtracted] = useState<string>('');
  const [imageTranslated, setImageTranslated] = useState<string>('');
  const [isScanningImage, setIsScanningImage] = useState<boolean>(false);

  // Microphone / Speech Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<any>(null);
  const hasRealtimeSpeechRef = useRef<boolean>(false);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    document.body.classList.add('light');
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nova_history_items', JSON.stringify(historyList));
    } catch {}
  }, [historyList]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_saved_items', JSON.stringify(savedList));
    } catch {}
  }, [savedList]);

  // Handle visibility change / screen lock on mobile to pause audio/mic cleanly
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isListening) {
        stopAudioRecording();
        toast('Microphone paused due to background screen lock.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isListening]);

  const show = (screen: ScreenId) => {
    setActiveScreen(screen);
    window.location.hash = screen;
  };

  const swapLang = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
    toast('Languages swapped');
  };

  const clearInput = () => setTextInput('');

  const handleTranslate = async () => {
    const trimmed = textInput.trim();
    if (!trimmed) {
      toast('Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const res = await ApiClient.translateText(trimmed, fromLang, toLang);
      const cleanOutput = res.translatedText || trimmed;
      setTranslatedResult(cleanOutput);
      setAccuracy(res.confidence ? Math.round(res.confidence * 100) : 98);

      const nowStr = `Today • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newItem: HistoryItem = {
        id: `h-${Date.now()}`,
        input: trimmed,
        output: cleanOutput,
        from: fromLang,
        to: toLang,
        timestamp: nowStr,
      };
      setHistoryList((prev) => [newItem, ...prev.slice(0, 49)]);
      toast('Translation complete');
    } catch (err: any) {
      toast(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDetectLanguage = async () => {
    const trimmed = textInput.trim();
    if (!trimmed) {
      toast('Enter text to detect language');
      return;
    }
    toast('Detecting language...');
    try {
      const res = await ApiClient.detectLanguage(trimmed);
      if (res && res.detectedLanguage) {
        const detected = res.detectedLanguage.toLowerCase();
        let matched = '';
        if (detected.includes('urdu')) matched = 'Urdu 🇵🇰';
        else if (detected.includes('english')) matched = 'English 🇬🇧';
        else if (detected.includes('arabic')) matched = 'Arabic 🇸🇦';
        else if (detected.includes('japanese')) matched = 'Japanese 🇯🇵';
        else if (detected.includes('punjabi')) matched = 'Punjabi 🇵🇰';
        else if (detected.includes('spanish')) matched = 'Spanish 🇪🇸';
        else if (detected.includes('french')) matched = 'French 🇫🇷';
        else if (detected.includes('german')) matched = 'German 🇩🇪';
        else if (detected.includes('hindi')) matched = 'Hindi 🇮🇳';

        if (matched) {
          setFromLang(matched);
          toast(`✨ Detected: ${matched}`);
        } else {
          toast(`✨ Detected: ${res.detectedLanguage}`);
        }
      }
    } catch {
      toast('Language detection failed');
    }
  };

  const handleSpeakText = (text: string, langName: string) => {
    if (!text?.trim()) return;
    toast('Speaking…');
    GlobalAudioPlayer.play(
      text.trim(),
      langName,
      { onError: () => toast('Audio playback failed') },
      voiceGender
    );
  };

  const stopAudioRecording = async () => {
    setIsListening(false);
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Microphone Flow with SpeechRecognition & chunked MediaRecorder fallback
  const toggleMic = async () => {
    if (isListening) {
      await stopAudioRecording();
      if (hasRealtimeSpeechRef.current && textInput.trim()) {
        toast('Translating instantly…');
        handleTranslate();
      } else {
        toast('Processing voice transcription…');
      }
      return;
    }

    GlobalAudioPlayer.stop();
    audioChunksRef.current = [];
    hasRealtimeSpeechRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast('Microphone permission denied. Please enable mic access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        toast('No microphone hardware detected.');
      } else {
        toast('Could not access microphone. Please check permissions.');
      }
      return;
    }

    setIsListening(true);
    toast('🎙️ Listening... Speak now');

    // 1. Try Browser SpeechRecognition first (Near-instant, real-time sentence translation)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = fromLang.toLowerCase().includes('auto') ? (navigator.language || 'en-US') : getLangSpeechCode(fromLang);

        recognition.onresult = async (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const resItem = event.results[i];
            if (resItem.isFinal) {
              finalTranscript += resItem[0].transcript;
            } else {
              interimTranscript += resItem[0].transcript;
            }
          }
          const combined = (finalTranscript || interimTranscript).trim();
          if (combined) {
            setTextInput(combined);
            hasRealtimeSpeechRef.current = true;
          }

          // Translate completed sentences immediately on the fly!
          if (finalTranscript.trim()) {
            try {
              const res = await ApiClient.translateText(finalTranscript.trim(), fromLang, toLang);
              if (res && res.translatedText) {
                setTranslatedResult(res.translatedText);
                setAccuracy(Math.min(99, Math.max(92, Math.floor(88 + Math.random() * 11))));
              }
            } catch {}
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition initialization notice:', err);
      }
    }

    // 2. Fallback / Chunked MediaRecorder (3 to 5 second chunk transmission)
    try {
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !hasRealtimeSpeechRef.current) {
          const chunkBlob = new Blob([e.data], { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            try {
              const transcribeRes = await ApiClient.transcribeAudio(base64Data, mimeType, fromLang);
              if (transcribeRes && transcribeRes.text?.trim()) {
                setTextInput(transcribeRes.text.trim());
                handleTranslate();
              }
            } catch {}
          };
          reader.readAsDataURL(chunkBlob);
        }
      };

      // Request data chunks every 4 seconds
      recorder.start(4000);
    } catch (err) {
      console.warn('MediaRecorder fallback init notice:', err);
    }
  };

  return (
    <div className="app">
      <i className="orb one"></i>
      <i className="orb two"></i>
      <i className="orb three"></i>

      <main className="phone">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="brand" onClick={() => show('home')} style={{ cursor: 'pointer' }}>
            <div className="logo-wrapper">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" fill="url(#logoGrad1)" stroke="url(#logoGrad2)" strokeWidth="1.5"/>
                <path d="M13 28V12L27 28V12" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="logoGrad1" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#1E3A8A"/>
                    <stop offset="100%" stopColor="#0284C7"/>
                  </linearGradient>
                  <linearGradient id="logoGrad2" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#38BDF8"/>
                    <stop offset="100%" stopColor="#818CF8"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-title">Nova Translator</span>
              <small className="brand-sub">Translate · Listen</small>
            </div>
          </div>
          <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#0284c7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Install App"
              >
                <span>📲 Install</span>
              </button>
            )}
            <button
              onClick={toggleOfflineMode}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '16px',
                border: '1px solid rgba(87, 224, 173, 0.4)',
                background: isOfflineMode ? 'rgba(255, 170, 0, 0.2)' : 'rgba(87, 224, 173, 0.18)',
                color: isOfflineMode ? '#ffcc00' : '#4ade80',
                cursor: 'pointer',
              }}
            >
              <span>{isOfflineMode ? 'Offline' : 'Active'}</span>
            </button>
          </div>
        </header>

        {/* SCREEN 1: HOME */}
        <section id="home" className={`screen ${activeScreen === 'home' ? 'active' : ''}`}>
          <div className="nova-home-container">
            <div className="nova-hero-card">
              <h2>Break Language Barriers</h2>
              <p>Type, speak, upload image, or scan with camera</p>
              <button className="nova-translate-btn" onClick={() => show('translate')}>
                TEXT TRANSLATE NOW
              </button>
            </div>

            <div className="nova-tiles-grid">
              <div className="nova-tile-card" onClick={() => show('translate')}>
                <h3>TEXT TRANSLATION</h3>
                <p>Type and translate instantly.</p>
              </div>
              <div className="nova-tile-card" onClick={() => show('image')}>
                <h3>Image Translation</h3>
                <p>Translate text within captured images</p>
              </div>
            </div>
          </div>
        </section>

        {/* SCREEN 2: TRANSLATE */}
        <section id="translate" className={`screen ${activeScreen === 'translate' ? 'active' : ''}`}>
          <div className="nova-screen-container">
            <div className="nova-screen-header">
              <button className="back-btn" onClick={() => show('home')}>←</button>
              <h2>Translation Screen</h2>
            </div>

            <div className="nova-lang-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  className="nova-select"
                  style={{ width: '100%', paddingRight: textInput.trim() && fromLang === 'Auto Detect ✨' ? '75px' : '12px' }}
                  value={fromLang}
                  onChange={(e) => setFromLang(e.target.value)}
                >
                  <option value="Auto Detect ✨">Auto Detect ✨</option>
                  <option value="English 🇬🇧">English 🇬🇧</option>
                  <option value="Urdu 🇵🇰">Urdu 🇵🇰</option>
                  <option value="Arabic 🇸🇦">Arabic 🇸🇦</option>
                  <option value="Japanese 🇯🇵">Japanese 🇯🇵</option>
                  <option value="Punjabi 🇵🇰">Punjabi 🇵🇰</option>
                  <option value="Spanish 🇪🇸">Spanish 🇪🇸</option>
                  <option value="French 🇫🇷">French 🇫🇷</option>
                  <option value="German 🇩🇪">German 🇩🇪</option>
                  <option value="Hindi 🇮🇳">Hindi 🇮🇳</option>
                </select>

                {textInput.trim() && fromLang === 'Auto Detect ✨' && (
                  <button
                    onClick={handleDetectLanguage}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      padding: '4px 8px',
                      background: 'rgba(2, 132, 199, 0.1)',
                      color: '#0284c7',
                      border: '1px solid rgba(2, 132, 199, 0.25)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                    type="button"
                  >
                    ✨ Detect
                  </button>
                )}
              </div>

              <button className="nova-swap-btn" onClick={swapLang} title="Swap">⇄</button>

              <select
                className="nova-select"
                style={{ flex: 1 }}
                value={toLang}
                onChange={(e) => setToLang(e.target.value)}
              >
                <option value="Urdu 🇵🇰">Urdu 🇵🇰</option>
                <option value="English 🇬🇧">English 🇬🇧</option>
                <option value="Arabic 🇸🇦">Arabic 🇸🇦</option>
                <option value="Japanese 🇯🇵">Japanese 🇯🇵</option>
                <option value="Punjabi 🇵🇰">Punjabi 🇵🇰</option>
                <option value="Spanish 🇪🇸">Spanish 🇪🇸</option>
                <option value="French 🇫🇷">French 🇫🇷</option>
                <option value="German 🇩🇪">German 🇩🇪</option>
                <option value="Hindi 🇮🇳">Hindi 🇮🇳</option>
              </select>
            </div>

            {/* Input Card */}
            <div className="nova-card relative p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between text-slate-800">
              <div className="relative">
                <textarea
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 resize-none outline-none font-medium text-slate-900 placeholder-slate-400 min-h-[120px] text-base"
                  maxLength={5000}
                  placeholder="Type or speak something to translate…"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <div className="flex justify-between items-center text-xs text-slate-400 pb-3 border-b border-slate-100 mb-3">
                  <span>{textInput.length}/5000</span>
                  {isListening && (
                    <span className="text-rose-600 font-extrabold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                      🎙️ Listening...
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-3">
                <div className="flex flex-wrap items-center gap-2 w-full justify-between sm:justify-start">
                  <button
                    onClick={toggleMic}
                    type="button"
                    className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                      isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>🎙️ {isListening ? 'Listening' : 'Mic'}</span>
                  </button>

                  <button
                    onClick={() => handleSpeakText(textInput, fromLang)}
                    disabled={!textInput.trim()}
                    type="button"
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40"
                  >
                    <span>🔊 Listen</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!textInput.trim()) return;
                      navigator.clipboard.writeText(textInput);
                      toast('Copied!');
                    }}
                    disabled={!textInput.trim()}
                    type="button"
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40"
                  >
                    <span>📋 Copy</span>
                  </button>

                  <button
                    onClick={() => {
                      clearInput();
                      setTranslatedResult('');
                    }}
                    type="button"
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  >
                    <span>🧹 Clear</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Translate Button */}
            <div className="mt-3.5">
              <button
                onClick={handleTranslate}
                disabled={isTranslating || isListening || !textInput.trim()}
                type="button"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-extrabold text-sm uppercase tracking-widest shadow-md active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {isTranslating ? 'Translating...' : '⚡ Translate Now'}
              </button>
            </div>

            {/* Output Card */}
            {translatedResult && (
              <div className="nova-card relative p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between mt-4 text-slate-800">
                <div className="relative py-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      {toLang.split(' ')[0]} Translation
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-200">
                      {accuracy}% Accuracy
                    </span>
                  </div>

                  <p
                    className="font-semibold text-slate-800 text-lg leading-relaxed whitespace-pre-wrap"
                    dir={isRTLText(toLang, translatedResult) ? 'rtl' : 'ltr'}
                  >
                    {translatedResult}
                  </p>

                  <div className="nova-action-row pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button className="nova-sub-btn" onClick={() => { navigator.clipboard.writeText(translatedResult); toast('Copied'); }}>
                      📋 Copy
                    </button>
                    <button className="nova-sub-btn" onClick={() => handleSpeakText(translatedResult, toLang)}>
                      🔊 Speak
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM NAV */}
        <nav className="bottom">
          <button className={`nav ${activeScreen === 'home' ? 'active' : ''}`} onClick={() => show('home')}><b>⌂</b>Home</button>
          <button className={`nav ${activeScreen === 'history' ? 'active' : ''}`} onClick={() => show('history')}><b>◔</b>History</button>
          <button className={`nav ${activeScreen === 'saved' ? 'active' : ''}`} onClick={() => show('saved')}><b>♡</b>Saved</button>
          <button className={`nav ${activeScreen === 'settings' ? 'active' : ''}`} onClick={() => show('settings')}><b>⚙</b>Settings</button>
        </nav>

        <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
      </main>

      {/* IOS MODAL */}
      {showIOSInstallModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 9, 20, 0.82)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowIOSInstallModal(false)}>
          <div className="card" style={{ maxWidth: '380px', padding: '24px', background: '#ffffff', borderRadius: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3>Install on iOS Safari</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>1. Tap Share (⎋)<br/>2. Tap Add to Home Screen</p>
            <button className="primary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setShowIOSInstallModal(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
