import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Keyboard,
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera,
  ArrowLeft,
  ArrowRightLeft,
  ArrowRight,
  Volume2,
  Copy,
  Share2,
  Bookmark,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Search,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  X,
  Upload,
  Zap,
} from 'lucide-react';
import { ApiClient, LanguageOption, TranslationResult } from './services/apiClient.ts';
import { GlobalAudioPlayer, getLanguageSpeechCode } from './services/audioPlayer.ts';
import { AudioCompressor } from './services/audioCompressor.ts';
import { HistoryItem, SavedItem, AppSettings } from './types.ts';
import { Toast } from './components/Toast.tsx';

const POPULAR_LANGUAGES: LanguageOption[] = [
  { code: 'ur', name: 'Urdu', label: 'Urdu 🇵🇰', nativeName: 'اردو', direction: 'rtl' },
  { code: 'en', name: 'English', label: 'English 🇬🇧', nativeName: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', label: 'Arabic 🇸🇦', nativeName: 'العربية', direction: 'rtl' },
  { code: 'pa', name: 'Punjabi', label: 'Punjabi 🇵🇰', nativeName: 'پنجابی / ਪੰਜਾਬੀ', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', label: 'Hindi 🇮🇳', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', label: 'Japanese 🇯🇵', nativeName: '日本語', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', label: 'Chinese 🇨🇳', nativeName: '中文 (简体)', direction: 'ltr' },
  { code: 'fr', name: 'French', label: 'French 🇫🇷', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', label: 'German 🇩🇪', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'es', name: 'Spanish', label: 'Spanish 🇪🇸', nativeName: 'Español', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', label: 'Portuguese 🇵🇹', nativeName: 'Português', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', label: 'Turkish 🇹🇷', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'ru', name: 'Russian', label: 'Russian 🇷🇺', nativeName: 'Русский', direction: 'ltr' },
  { code: 'fa', name: 'Persian', label: 'Persian 🇮🇷', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ko', name: 'Korean', label: 'Korean 🇰🇷', nativeName: '한국어', direction: 'ltr' },
  { code: 'it', name: 'Italian', label: 'Italian 🇮🇹', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', label: 'Bengali 🇧🇩', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', label: 'Indonesian 🇮🇩', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', label: 'Dutch 🇳🇱', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'ps', name: 'Pashto', label: 'Pashto 🇦🇫', nativeName: 'پښتو', direction: 'rtl' },
  { code: 'sd', name: 'Sindhi', label: 'Sindhi 🇵🇰', nativeName: 'سنڌي', direction: 'rtl' },
];

export default function App() {
  // Navigation Screen State: 1 = Home, 2 = Text, 3 = Voice, 4 = Image, 5 = Camera, 7 = History, 8 = Saved, 9 = Settings
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [navTab, setNavTab] = useState<'home' | 'history' | 'saved' | 'settings'>('home');

  // Language state
  const [languages, setLanguages] = useState<LanguageOption[]>(POPULAR_LANGUAGES);
  const [fromLang, setFromLang] = useState('Urdu 🇵🇰');
  const [toLang, setToLang] = useState('English 🇬🇧');
  const [selectingLangFor, setSelectingLangFor] = useState<'from' | 'to' | null>(null);
  const [langSearch, setLangSearch] = useState('');

  // Text translation state
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  // Audio / Speech state
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  // Image & Camera OCR state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageOcrExtracted, setImageOcrExtracted] = useState('');
  const [imageOcrTranslated, setImageOcrTranslated] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Saved items tab filter
  const [savedTab, setSavedTab] = useState<'all' | 'text' | 'image' | 'voice'>('all');
  const [savedSearch, setSavedSearch] = useState('');

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : currentScreen === 0 ? null : c === msg ? null : c));
    }, 2400);
  }, [currentScreen]);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('novaHistory');
      return saved ? JSON.parse(saved) : [
        {
          id: '1',
          from: 'Urdu 🇵🇰',
          to: 'English 🇬🇧',
          input: 'السلام علیکم آپ کیسے ہیں؟',
          output: 'Hello, how are you?',
          time: 'Today 10:30 AM',
        },
        {
          id: '2',
          from: 'Urdu 🇵🇰',
          to: 'English 🇬🇧',
          input: 'خوش آمدید',
          output: 'Welcome',
          time: 'Yesterday 08:12 PM',
        },
        {
          id: '3',
          from: 'English 🇬🇧',
          to: 'Urdu 🇵🇰',
          input: 'Thank you very much',
          output: 'بہت بہت شکریہ',
          time: 'Yesterday 05:40 PM',
        },
      ];
    } catch {
      return [];
    }
  });

  // Saved / Bookmarked items
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('novaSavedItems');
      return saved ? JSON.parse(saved) : [
        {
          id: '1',
          from: 'Urdu 🇵🇰',
          to: 'English 🇬🇧',
          input: 'السلام علیکم آپ کیسے ہیں؟',
          output: 'Hello, how are you?',
          type: 'text',
          timestamp: 'Yesterday 17:20',
          details: 'Formal greeting in Urdu',
        },
        {
          id: '2',
          from: 'Urdu 🇵🇰',
          to: 'English 🇬🇧',
          input: 'خوش آمدید',
          output: 'Welcome',
          type: 'text',
          timestamp: 'Yesterday 08:12',
          details: 'Warm hospitality greeting',
        },
        {
          id: '3',
          from: 'English 🇬🇧',
          to: 'Urdu 🇵🇰',
          input: 'Book',
          output: 'کتاب',
          type: 'text',
          timestamp: 'Yesterday 08:10',
          details: 'Common vocabulary',
        },
      ];
    } catch {
      return [];
    }
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('novaSettings');
      return saved ? JSON.parse(saved) : {
        darkMode: true,
        autoDetect: true,
        voiceOutput: false,
        textSize: 'medium',
      };
    } catch {
      return { darkMode: true, autoDetect: true, voiceOutput: false, textSize: 'medium' };
    }
  });

  // Refs for media recording & camera
  const isListeningRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist storage
  useEffect(() => {
    try { localStorage.setItem('novaHistory', JSON.stringify(history)); } catch {}
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('novaSavedItems', JSON.stringify(savedItems)); } catch {}
  }, [savedItems]);

  useEffect(() => {
    try { localStorage.setItem('novaSettings', JSON.stringify(settings)); } catch {}
    if (settings.darkMode) {
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
    }
  }, [settings]);

  // Load backend languages
  useEffect(() => {
    ApiClient.getSupportedLanguages()
      .then((res) => { if (res && res.length > 0) setLanguages(res); })
      .catch(() => {});
  }, []);

  // Screen Navigation helper
  const showScreen = (screenNum: number) => {
    stopListening();
    stopAudio();
    stopCamera();
    setCurrentScreen(screenNum);

    if (screenNum === 1 || screenNum === 2 || screenNum === 3 || screenNum === 4 || screenNum === 5) {
      setNavTab('home');
    } else if (screenNum === 7) {
      setNavTab('history');
    } else if (screenNum === 8) {
      setNavTab('saved');
    } else if (screenNum === 9) {
      setNavTab('settings');
    }
  };

  // Language Swap
  const handleSwapLangs = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    if (textOutput) {
      const prevOut = textOutput;
      setTextOutput(textInput);
      setTextInput(prevOut);
    }
  };

  // Audio Playback
  const stopAudio = () => {
    GlobalAudioPlayer.stop();
    setSpeakingText(null);
  };

  const playSpeech = (text: string, langName: string) => {
    const clean = (text || '').trim();
    if (!clean) return;

    if (speakingText === clean) {
      stopAudio();
      return;
    }

    stopAudio();
    setSpeakingText(clean);
    showToast(`Playing audio (${langName})…`);

    GlobalAudioPlayer.play(clean, langName, {
      onStart: () => setSpeakingText(clean),
      onEnd: () => setSpeakingText(null),
      onError: () => setSpeakingText(null),
    });
  };

  // Text Translation
  const translateText = async () => {
    const trimmed = textInput.trim();
    if (!trimmed) {
      showToast('Please enter text to translate.');
      return;
    }

    setIsTranslating(true);
    try {
      const res: TranslationResult = await ApiClient.translateText(trimmed, fromLang, toLang);
      setTextOutput(res.translatedText);
      setConfidence(res.confidence || 0.98);
      setAlternatives(res.alternatives || []);
      setDetails(res.details || '');
      if (res.detectedSourceLanguage) setDetectedBadge(res.detectedSourceLanguage);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        from: fromLang,
        to: toLang,
        input: trimmed,
        output: res.translatedText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: res.confidence,
        details: res.details,
      };
      setHistory((prev) => [newItem, ...prev].slice(0, 50));
      showToast('Translation completed!');

      if (settings.voiceOutput) {
        playSpeech(res.translatedText, toLang);
      }
    } catch (err: any) {
      showToast(err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Microphone Recording & Compression
  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const startListening = async () => {
    stopAudio();
    stopListening();
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
    } catch {
      showToast('Microphone access denied. Please allow microphone permission.');
      return;
    }

    setIsListening(true);
    isListeningRef.current = true;
    showToast('Microphone active! Speak now…');

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((p) => p + 1);
    }, 1000);

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 50) return;

        setIsProcessingAudio(true);
        try {
          const { base64, mimeType: compressedMime } = await AudioCompressor.compressAudioBlob(blob);
          const res = await ApiClient.transcribeAudio(base64, compressedMime, fromLang);
          if (res && res.text) {
            setTextInput(res.text);
            showToast('Voice transcribed!');
            // Auto translate if in Voice screen
            if (currentScreen === 3) {
              const transRes = await ApiClient.translateText(res.text, fromLang, toLang);
              setTextOutput(transRes.translatedText);
              setConfidence(transRes.confidence || 0.98);
              setAlternatives(transRes.alternatives || []);
              setDetails(transRes.details || '');
              playSpeech(transRes.translatedText, toLang);
            }
          }
        } catch {
          showToast('Voice transcription failed.');
        } finally {
          setIsProcessingAudio(false);
        }
      };

      recorder.start(200);
    } catch {}
  };

  const toggleListening = () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Image Upload & OCR
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setIsProcessingOcr(true);
      showToast('Extracting & translating image…');

      try {
        const ocrRes = await ApiClient.ocrAndTranslate(base64, toLang, file.type || 'image/jpeg');
        setImageOcrExtracted(ocrRes.extractedText);
        setImageOcrTranslated(ocrRes.translatedText);
        showToast('Image translated successfully!');

        // Add to history
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            from: fromLang,
            to: toLang,
            input: ocrRes.extractedText,
            output: ocrRes.translatedText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
      } catch (err: any) {
        showToast(err.message || 'Image OCR failed.');
      } finally {
        setIsProcessingOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera Live Scanner
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      showToast('Camera permission denied or camera not available.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    setSelectedImage(base64);
    showScreen(4); // Switch to Image preview with results
    setIsProcessingOcr(true);
    showToast('Analyzing captured photo…');

    try {
      const ocrRes = await ApiClient.ocrAndTranslate(base64, toLang, 'image/jpeg');
      setImageOcrExtracted(ocrRes.extractedText);
      setImageOcrTranslated(ocrRes.translatedText);
      showToast('Photo translated!');
    } catch {
      showToast('Failed to translate photo.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Copy & Share utilities
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!');
  };

  const handleShare = async (title: string, text: string) => {
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nova Translate', text });
      } catch {}
    } else {
      handleCopy(text);
    }
  };

  const handleSaveItem = (input: string, output: string, type: 'text' | 'voice' | 'image' = 'text', customDetails?: string) => {
    if (!output || !input) return;
    const newSaved: SavedItem = {
      id: Date.now().toString(),
      from: fromLang,
      to: toLang,
      input,
      output,
      type,
      timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      details: customDetails || details || 'Saved phrase',
    };
    setSavedItems((prev) => [newSaved, ...prev.filter((i) => i.input !== input)].slice(0, 100));
    showToast('Translation saved! 🔖');
  };

  const handleUseHistoryOrSaved = (item: any) => {
    setTextInput(item.input);
    setTextOutput(item.output);
    if (item.from) setFromLang(item.from);
    if (item.to) setToLang(item.to);
    showScreen(2);
    showToast('Loaded into Text Translation');
  };

  // Filtered Languages
  const filteredLanguages = languages.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.label.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="app-wrapper">
      <div className="phone-frame">
        {/* Hidden file input for gallery upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFile}
          accept="image/*"
          className="hidden"
        />

        {/* STATUS BAR */}
        <div className="status-bar">
          <div className="font-bold text-xs tracking-wider">9:41</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#00D4FF] font-semibold">Nova AI</span>
            <div className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse"></div>
          </div>
        </div>

        {/* SCREEN CONTAINER */}
        <div className="screen-container">
          {/* ==================================================== */}
          {/* SCREEN 1: HOME PAGE */}
          {/* ==================================================== */}
          <div className={`screen screen-home ${currentScreen === 1 ? 'active' : ''}`} id="screen-1">
            <div className="header">
              <div className="logo-badge">✨</div>
              <div className="header-text">
                <h2>Nova Translate</h2>
                <p>Translate · Listen · Understand</p>
              </div>
            </div>

            <div className="hero-banner">
              <h3>Break Language Barriers</h3>
              <p>Type, speak, or upload an image and get instant translation</p>
            </div>

            <div className="action-grid">
              <div className="action-btn" onClick={() => showScreen(2)}>
                <div className="action-btn-icon"><Keyboard /></div>
                <span>Text Translation</span>
              </div>
              <div className="action-btn" onClick={() => showScreen(3)}>
                <div className="action-btn-icon"><Mic /></div>
                <span>Voice Translation</span>
              </div>
              <div className="action-btn" onClick={() => { showScreen(4); fileInputRef.current?.click(); }}>
                <div className="action-btn-icon"><ImageIcon /></div>
                <span>Image Translation</span>
              </div>
              <div className="action-btn" onClick={() => { showScreen(5); startCamera(); }}>
                <div className="action-btn-icon"><Camera /></div>
                <span>Camera Translation</span>
              </div>
            </div>

            {/* Quick Recent Snippet */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                <span>Recent Translations</span>
                <button onClick={() => showScreen(7)} className="text-[#00D4FF] hover:underline">
                  View all
                </button>
              </div>

              {history.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleUseHistoryOrSaved(item)}
                  className="p-3 bg-[#1a2847] hover:bg-[#22355c] border border-[#2a3d5a] rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="text-[11px] font-bold text-[#00D4FF] truncate">{item.from} → {item.to}</div>
                    <div className="text-xs font-semibold text-white truncate">{item.input}</div>
                    <div className="text-xs text-slate-400 truncate">{item.output}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 2: TEXT TRANSLATION */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 2 ? 'active' : ''}`} id="screen-2">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Text Translation</h3>
              <div style={{ width: 24 }}></div>
            </div>

            <div className="lang-selector">
              <button
                type="button"
                onClick={() => setSelectingLangFor('from')}
                className="lang-btn"
              >
                <span>{fromLang}</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>
              <button className="swap-langs" onClick={handleSwapLangs} title="Swap Languages">
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectingLangFor('to')}
                className="lang-btn"
              >
                <span>{toLang}</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>
            </div>

            <div className="text-input-area">
              <textarea
                placeholder="السلام علیکم آپ کیسے ہیں؟"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                maxLength={5000}
              />
              <div className="char-count">{textInput.length}/5000</div>
            </div>

            <div className="input-actions">
              <button
                className="input-action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Gallery Upload"
              >
                <ImageIcon className="w-4 h-4 text-[#00D4FF]" />
                <span>Gallery</span>
              </button>
              <button
                className="input-action-btn"
                onClick={() => { showScreen(5); startCamera(); }}
                title="Camera"
              >
                <Camera className="w-4 h-4 text-[#00D4FF]" />
                <span>Camera</span>
              </button>
              <button
                className={`input-action-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                title="Microphone"
              >
                <Mic className="w-4 h-4 text-[#00D4FF]" />
                <span>{isListening ? 'Stop' : 'Voice'}</span>
              </button>
            </div>

            <button
              className="translate-btn"
              onClick={translateText}
              disabled={isTranslating || !textInput.trim()}
            >
              <Zap className="w-4 h-4 fill-[#051326]" />
              <span>{isTranslating ? 'Translating in ~1s…' : 'Translate'}</span>
            </button>

            {/* Translation Output Result Section */}
            <div className={`result-section ${textOutput ? 'show' : ''}`}>
              <div className="result-label">
                <span>{toLang} Translation</span>
                {confidence !== null && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    {Math.round(confidence * 100)}% Accuracy
                  </span>
                )}
              </div>
              <div className="result-text">{textOutput}</div>

              {/* Cultural Context / Details Note */}
              {details && (
                <div className="p-2.5 rounded-xl bg-[#0a1628] border border-[#2a3d5a] text-xs text-slate-300 flex items-start gap-2 mb-3">
                  <Info className="w-3.5 h-3.5 text-[#00D4FF] shrink-0 mt-0.5" />
                  <span>{details}</span>
                </div>
              )}

              {/* Alternative Translations */}
              {alternatives.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#00D4FF]" />
                    <span>Alternatives:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {alternatives.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setTextOutput(alt); showToast('Alternative selected'); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#0a1628] hover:bg-[#0099FF]/20 text-slate-300 hover:text-white border border-[#2a3d5a] transition-all"
                      >
                        "{alt}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-actions">
                <button
                  className="result-action-btn"
                  onClick={() => playSpeech(textOutput, toLang)}
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" /> Listen
                </button>
                <button
                  className="result-action-btn"
                  onClick={() => handleCopy(textOutput)}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  className="result-action-btn"
                  onClick={() => handleShare('Translation', `${textInput} -> ${textOutput}`)}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button
                  className="result-action-btn"
                  onClick={() => handleSaveItem(textInput, textOutput, 'text')}
                >
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" /> Save
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 3: VOICE TRANSLATION */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 3 ? 'active' : ''}`} id="screen-3">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Voice Translation</h3>
              <div style={{ width: 24 }}></div>
            </div>

            <div className="lang-selector">
              <button type="button" onClick={() => setSelectingLangFor('from')} className="lang-btn">
                <span>{fromLang}</span>
              </button>
              <button className="swap-langs" onClick={handleSwapLangs}>
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setSelectingLangFor('to')} className="lang-btn">
                <span>{toLang}</span>
              </button>
            </div>

            <div className="screen-voice-wrapper">
              <div
                className={`voice-circle ${isListening ? 'recording' : ''}`}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="w-12 h-12 text-red-400 animate-pulse" /> : <Mic className="w-12 h-12 text-[#00D4FF]" />}
              </div>

              <div className="voice-status">
                <h3>{isListening ? `Listening (${recordingSeconds}s)…` : isProcessingAudio ? 'Transcribing with AI…' : 'Tap Mic to Speak'}</h3>
                <p>{isListening ? 'Speak clearly into your microphone' : 'Speak naturally in any language for instant audio translation'}</p>
              </div>

              {isListening && (
                <div className="waveform">
                  <div className="wave-bar" style={{ animationDelay: '0s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.3s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.4s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.25s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.15s' }}></div>
                </div>
              )}

              {textInput && !isListening && (
                <div className="w-full bg-[#1a2847] p-3.5 rounded-2xl border border-[#2a3d5a] space-y-2 mb-4 text-left">
                  <div className="text-[11px] font-bold text-[#00D4FF]">You said:</div>
                  <div className="text-sm font-semibold text-white">{textInput}</div>
                  {textOutput && (
                    <div className="pt-2 border-t border-[#2a3d5a] space-y-1">
                      <div className="text-[11px] font-bold text-emerald-400">{toLang} Translation:</div>
                      <div className="text-sm font-bold text-white">{textOutput}</div>
                    </div>
                  )}
                </div>
              )}

              <button
                className="translate-btn"
                onClick={toggleListening}
                style={{ width: '220px' }}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? 'Stop & Translate' : 'Start Speaking'}</span>
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 4: IMAGE TRANSLATION */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 4 ? 'active' : ''}`} id="screen-4">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Image Translation</h3>
              <div style={{ width: 24 }}></div>
            </div>

            <div className="lang-selector">
              <button type="button" onClick={() => setSelectingLangFor('from')} className="lang-btn">
                <span>{fromLang}</span>
              </button>
              <button className="swap-langs" onClick={handleSwapLangs}>
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setSelectingLangFor('to')} className="lang-btn">
                <span>{toLang}</span>
              </button>
            </div>

            <div
              className="image-preview-box"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Uploaded preview"
                  className="max-h-[200px] w-auto rounded-xl object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                  <Upload className="w-10 h-10 text-[#00D4FF]" />
                  <div className="font-bold text-white text-sm">Upload Image</div>
                  <div className="text-xs text-slate-400">Click to select photo or document from gallery</div>
                </div>
              )}
            </div>

            <button
              className="translate-btn mb-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingOcr}
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessingOcr ? 'Analyzing OCR…' : selectedImage ? 'Upload Another Image' : 'Select Image'}</span>
            </button>

            {imageOcrTranslated && (
              <div className="result-section show">
                <div className="result-label">{toLang} Translation</div>
                <div className="result-text">{imageOcrTranslated}</div>
                {imageOcrExtracted && (
                  <div className="p-2.5 rounded-xl bg-[#0a1628] border border-[#2a3d5a] text-xs text-slate-300 mb-3">
                    <span className="font-bold text-[#00D4FF] block mb-1">Extracted Text:</span>
                    {imageOcrExtracted}
                  </div>
                )}
                <div className="result-actions">
                  <button className="result-action-btn" onClick={() => playSpeech(imageOcrTranslated, toLang)}>
                    <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" /> Listen
                  </button>
                  <button className="result-action-btn" onClick={() => handleCopy(imageOcrTranslated)}>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button className="result-action-btn" onClick={() => handleSaveItem(imageOcrExtracted, imageOcrTranslated, 'image')}>
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 5: CAMERA TRANSLATION */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 5 ? 'active' : ''}`} id="screen-5">
            <div className="translation-header">
              <button className="back-btn" onClick={() => { stopCamera(); showScreen(1); }}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Camera Translation</h3>
              <div style={{ width: 24 }}></div>
            </div>

            <div className="camera-preview-box">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a1628] p-4 text-center">
                  <Camera className="w-12 h-12 text-[#00D4FF]" />
                  <p className="text-xs text-slate-300">Point camera at signs, menus, books or text to translate</p>
                  <button
                    onClick={startCamera}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950 text-xs font-bold"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 my-3">
              <button
                onClick={captureCameraPhoto}
                type="button"
                className="w-16 h-16 rounded-full bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                title="Capture Photo"
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>

            <button
              className="translate-btn"
              onClick={() => { stopCamera(); showScreen(1); }}
            >
              <X className="w-4 h-4" />
              <span>Close Camera</span>
            </button>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 7: HISTORY */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 7 ? 'active' : ''}`} id="screen-7">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Translation History</h3>
              {history.length > 0 && (
                <button
                  onClick={() => { setHistory([]); showToast('History cleared.'); }}
                  className="back-btn text-red-400"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <HistoryIcon className="w-10 h-10 mx-auto text-slate-500" />
                <div className="font-bold text-white">No history yet</div>
                <div className="text-xs">Your translations will appear here automatically.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#00D4FF]">{item.from} → {item.to}</span>
                      <span className="text-slate-400 text-[11px]">{item.time}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-300 font-medium">{item.input}</div>
                      <div className="text-sm text-white font-bold">{item.output}</div>
                    </div>

                    <div className="pt-2 border-t border-[#2a3d5a] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => playSpeech(item.output, item.to)}
                          className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          title="Listen"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                        </button>
                        <button
                          onClick={() => handleCopy(item.output)}
                          className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          title="Copy"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShare('History Item', `${item.input} -> ${item.output}`)}
                          className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSaveItem(item.input, item.output, 'text')}
                          className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          title="Save"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleUseHistoryOrSaved(item)}
                        className="text-xs font-bold text-[#00D4FF] flex items-center gap-1 hover:underline"
                      >
                        Translate <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 8: SAVED */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 8 ? 'active' : ''}`} id="screen-8">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Saved Phrases</h3>
              {savedItems.length > 0 && (
                <button
                  onClick={() => { setSavedItems([]); showToast('All saved phrases cleared.'); }}
                  className="back-btn text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Saved Tabs */}
            <div className="flex gap-2 mb-3">
              {(['all', 'text', 'image', 'voice'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSavedTab(tab)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    savedTab === tab
                      ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950'
                      : 'bg-[#1a2847] text-slate-300 border border-[#2a3d5a]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {savedItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bookmark className="w-10 h-10 mx-auto text-slate-500" />
                <div className="font-bold text-white">No saved phrases</div>
                <div className="text-xs">Click the bookmark (🔖) icon to save favorite phrases.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedItems
                  .filter((i) => savedTab === 'all' || (i.type || 'text') === savedTab)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl space-y-2 shadow-sm"
                    >
                      <div className="text-sm font-bold text-white">{item.output}</div>
                      <div className="text-xs text-slate-400">{item.input}</div>
                      <div className="text-[11px] text-[#00D4FF] flex items-center justify-between pt-1 border-t border-[#2a3d5a]">
                        <span>{item.from} → {item.to}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => playSpeech(item.output, item.to)}
                            className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                          </button>
                          <button
                            onClick={() => handleCopy(item.output)}
                            className="p-1.5 bg-[#0a1628] rounded-lg text-slate-300 hover:text-white border border-[#2a3d5a]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleUseHistoryOrSaved(item)}
                          className="text-xs font-bold text-[#00D4FF] flex items-center gap-1 hover:underline"
                        >
                          Translate <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 9: SETTINGS */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 9 ? 'active' : ''}`} id="screen-9">
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-white">Settings</h3>
              <div style={{ width: 24 }}></div>
            </div>

            <div className="space-y-4">
              {/* Language Preferences */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Language</div>
                <div className="p-3 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Input Language</span>
                  <button
                    onClick={() => setSelectingLangFor('from')}
                    className="px-3 py-1.5 bg-[#0a1628] border border-[#2a3d5a] rounded-xl text-xs font-bold text-[#00D4FF]"
                  >
                    {fromLang}
                  </button>
                </div>
                <div className="p-3 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Output Language</span>
                  <button
                    onClick={() => setSelectingLangFor('to')}
                    className="px-3 py-1.5 bg-[#0a1628] border border-[#2a3d5a] rounded-xl text-xs font-bold text-[#00D4FF]"
                  >
                    {toLang}
                  </button>
                </div>
              </div>

              {/* Voice & Speech */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Voice & Speech</div>
                <div className="p-3 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Automatic Speech Output</div>
                    <div className="text-[10px] text-slate-400">Play audio immediately after translation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, voiceOutput: !s.voiceOutput }))}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      settings.voiceOutput ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF]' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.voiceOutput ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Theme & App */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">App Preferences</div>
                <div className="p-3 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Dark Mode</div>
                    <div className="text-[10px] text-slate-400">Midnight deep blue theme</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, darkMode: !s.darkMode }))}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      settings.darkMode ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF]' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-3 bg-[#1a2847] border border-[#2a3d5a] rounded-2xl space-y-1 text-center text-xs text-slate-400">
                  <div className="font-bold text-white">Nova Translate AI v2.0</div>
                  <div>Powered by Google AI Studio & Gemini Flash</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* LANGUAGE SELECTION MODAL */}
        {/* ==================================================== */}
        {selectingLangFor && (
          <div className="modal-overlay">
            <div className="modal-content max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#2a3d5a] mb-3">
                <h3 className="font-bold text-sm text-white">
                  Select {selectingLangFor === 'from' ? 'Source' : 'Target'} Language
                </h3>
                <button
                  onClick={() => setSelectingLangFor(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search language…"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a1628] border border-[#2a3d5a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0099FF]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredLanguages.map((lang) => {
                  const isSelected = selectingLangFor === 'from' ? fromLang === lang.label : toLang === lang.label;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => {
                        if (selectingLangFor === 'from') setFromLang(lang.label);
                        else setToLang(lang.label);
                        setSelectingLangFor(null);
                        setLangSearch('');
                      }}
                      className={`p-3 rounded-xl cursor-pointer flex items-center justify-between text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0099FF]/20 to-[#00D4FF]/20 text-[#00D4FF] border border-[#0099FF]/40'
                          : 'bg-[#0a1628] hover:bg-[#22355c] text-white border border-[#2a3d5a]'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#00D4FF]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* BOTTOM NAVBAR */}
        {/* ==================================================== */}
        <div className="navbar">
          <div
            className={`nav-item ${navTab === 'home' ? 'active' : ''}`}
            onClick={() => showScreen(1)}
          >
            <HomeIcon className="w-5 h-5" />
            <span>Home</span>
          </div>
          <div
            className={`nav-item ${navTab === 'history' ? 'active' : ''}`}
            onClick={() => showScreen(7)}
          >
            <HistoryIcon className="w-5 h-5" />
            <span>History</span>
          </div>
          <div
            className={`nav-item ${navTab === 'saved' ? 'active' : ''}`}
            onClick={() => showScreen(8)}
          >
            <Bookmark className="w-5 h-5" />
            <span>Saved</span>
          </div>
          <div
            className={`nav-item ${navTab === 'settings' ? 'active' : ''}`}
            onClick={() => showScreen(9)}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </div>
        </div>
      </div>

      <Toast message={toastMessage} />
    </div>
  );
}
