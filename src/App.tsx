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
  Headphones,
  RotateCcw,
  Sun,
  Moon,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { ApiClient, LanguageOption, TranslationResult } from './services/apiClient.ts';
import { GlobalAudioPlayer } from './services/audioPlayer.ts';
import { AudioCompressor } from './services/audioCompressor.ts';
import { HistoryItem, SavedItem, AppSettings } from './types.ts';
import { Toast } from './components/Toast.tsx';
import { NovaLogo } from './components/NovaLogo.tsx';

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

const AVAILABLE_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Ultra Fast & Stable)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash Mode' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B (Instant Lightweight)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 1.1 / 3.1 Flash Lite' },
  { id: 'gemini-flash-latest', name: 'Flash Latest' },
];

export default function App() {
  // Navigation Screen State: 1 = Home, 2 = Text, 3 = Voice, 4 = Image, 5 = Camera, 6 = History, 7 = Saved, 8 = Settings
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [navTab, setNavTab] = useState<'home' | 'history' | 'saved' | 'settings'>('home');

  // Language state
  const [languages, setLanguages] = useState<LanguageOption[]>(POPULAR_LANGUAGES);
  const [fromLang, setFromLang] = useState('Urdu 🇵🇰');
  const [toLang, setToLang] = useState('English 🇬🇧');
  const [selectingLangFor, setSelectingLangFor] = useState<'from' | 'to' | null>(null);
  const [langSearch, setLangSearch] = useState('');

  // Text translation state (Screen 2)
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [details, setDetails] = useState('');

  // Audio / Speech state (Screen 3)
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  // Image Translation state (Screen 4)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageOcrExtracted, setImageOcrExtracted] = useState('');
  const [imageOcrTranslated, setImageOcrTranslated] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // Camera Live Scanner state (Screen 5)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraCapturedImage, setCameraCapturedImage] = useState<string | null>(null);
  const [cameraOcrExtracted, setCameraOcrExtracted] = useState('');
  const [cameraOcrTranslated, setCameraOcrTranslated] = useState('');
  const [isProcessingCameraOcr, setIsProcessingCameraOcr] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Custom Gemini API Key management
  const [customApiKey, setCustomApiKey] = useState<string>(() => ApiClient.getCustomApiKey());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [inputApiKey, setInputApiKey] = useState(customApiKey);
  const [showApiKeyPlain, setShowApiKeyPlain] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyFeedback, setApiKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // UI helpers
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [savedTab, setSavedTab] = useState<'all' | 'text' | 'voice' | 'image'>('all');

  // History state - ONLY full list in History tab, 3 recent preview items on Home
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
          time: 'Today 10:30',
        },
      ];
    } catch {
      return [];
    }
  });

  // Saved items state
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('novaSavedItems');
      return saved ? JSON.parse(saved) : [];
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
        selectedModel: 'gemini-3.8-flash',
      };
    } catch {
      return { darkMode: true, autoDetect: true, voiceOutput: false, textSize: 'medium', selectedModel: 'gemini-3.8-flash' };
    }
  });

  // Media recording & camera refs
  const isListeningRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSnapInputRef = useRef<HTMLInputElement | null>(null);

  // Persist storage
  useEffect(() => {
    try { localStorage.setItem('novaHistory', JSON.stringify(history)); } catch {}
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('novaSavedItems', JSON.stringify(savedItems)); } catch {}
  }, [savedItems]);

  useEffect(() => {
    try { localStorage.setItem('novaSettings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  // Load supported languages
  useEffect(() => {
    ApiClient.getSupportedLanguages()
      .then((res) => { if (res && res.length > 0) setLanguages(res); })
      .catch(() => {});
  }, []);

  // Sync theme to document body
  useEffect(() => {
    if (settings.darkMode) {
      document.body.classList.remove('light');
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  }, [settings.darkMode]);

  // Theme Toggle Handlers
  const toggleTheme = () => {
    const nextDark = !settings.darkMode;
    setSettings((s) => ({ ...s, darkMode: nextDark }));
    showToast(nextDark ? 'Switched to Pure Black Dark Theme 🌙' : 'Switched to Light Theme ☀️');
  };

  const setThemeMode = (isDark: boolean) => {
    setSettings((s) => ({ ...s, darkMode: isDark }));
    showToast(isDark ? 'Pure Black Dark Theme activated 🌙' : 'Light Theme activated ☀️');
  };

  const setSelectedModel = (modelId: string) => {
    setSettings((s) => ({ ...s, selectedModel: modelId }));
    showToast(`Model updated to ${modelId} ⚡`);
  };

  // Screen Navigation
  const showScreen = (screenNum: number) => {
    stopListening();
    stopAudio();
    stopCamera();
    setCurrentScreen(screenNum);

    if (screenNum === 1) setNavTab('home');
    else if (screenNum === 6) setNavTab('history');
    else if (screenNum === 7) setNavTab('saved');
    else if (screenNum === 8) setNavTab('settings');
  };

  const handleNavClick = (tab: 'home' | 'history' | 'saved' | 'settings') => {
    setNavTab(tab);
    if (tab === 'home') showScreen(1);
    else if (tab === 'history') showScreen(6);
    else if (tab === 'saved') showScreen(7);
    else if (tab === 'settings') showScreen(8);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // API Key handlers
  const handleOpenApiKeyModal = () => {
    setInputApiKey(customApiKey);
    setApiKeyFeedback(null);
    setIsApiKeyModalOpen(true);
  };

  const handleSaveAndTestApiKey = async () => {
    const cleanKey = inputApiKey.trim();
    setIsTestingApiKey(true);
    setApiKeyFeedback(null);

    try {
      const res = await ApiClient.testApiKey(cleanKey);
      if (res && res.valid) {
        ApiClient.setCustomApiKey(cleanKey);
        setCustomApiKey(cleanKey);
        setApiKeyFeedback({
          type: 'success',
          message: `Google Gemini API Key Verified & Connected on model ${res.model}! Wi-Fi & VPN supported.`,
        });
        showToast('API Key Connected & Active! ✨');
        setTimeout(() => {
          setIsApiKeyModalOpen(false);
        }, 1500);
      } else {
        setApiKeyFeedback({
          type: 'error',
          message: 'API Key verification failed. Please check the key.',
        });
      }
    } catch (err: any) {
      setApiKeyFeedback({
        type: 'error',
        message: err?.message || 'Verification failed. Check network (Wi-Fi/VPN).',
      });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleRemoveApiKey = () => {
    ApiClient.clearCustomApiKey();
    setCustomApiKey('');
    setInputApiKey('');
    setApiKeyFeedback({
      type: 'success',
      message: 'Custom API Key removed. Reverted to standard backend engine.',
    });
    showToast('API Key removed.');
  };

  // Swap languages
  const handleSwapLangs = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    if (textOutput) {
      const tempIn = textInput;
      setTextInput(textOutput);
      setTextOutput(tempIn);
    }
  };

  // Text Translation (Screen 2) - Optimized (2-5s max)
  const translateText = async () => {
    const cleanInput = textInput.trim();
    if (!cleanInput) {
      showToast('Please enter text to translate.');
      return;
    }

    setIsTranslating(true);
    setAlternatives([]);
    setDetails('');

    try {
      const res = await ApiClient.translateText(
        cleanInput,
        fromLang,
        toLang,
        'natural',
        settings.selectedModel
      );
      setTextOutput(res.translatedText);
      setConfidence(res.confidence ?? 0.98);
      setAlternatives(res.alternatives || []);
      setDetails(res.details || '');

      // Add to history
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        from: fromLang,
        to: toLang,
        input: cleanInput,
        output: res.translatedText,
        time: `Today ${timeStr}`,
        confidence: res.confidence,
        details: res.details,
      };

      setHistory((prev) => [newHistoryItem, ...prev.filter((i) => i.input !== cleanInput).slice(0, 49)]);

      if (settings.voiceOutput) {
        playSpeech(res.translatedText, toLang);
      }
    } catch (err: any) {
      showToast(err.message || 'Translation failed. Check Wi-Fi/VPN connection.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Voice Translation (Screen 3)
  const startListening = async () => {
    try {
      stopAudio();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await handleProcessRecordedAudio(audioBlob);
      };

      recorder.start(250);
      setIsListening(true);
      isListeningRef.current = true;
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 20) {
            stopListening();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsListening(false);
      isListeningRef.current = false;
      showToast('Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopListening = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
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

    setIsListening(false);
    isListeningRef.current = false;
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleProcessRecordedAudio = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    showToast('Transcribing audio instantly…');

    try {
      const { base64, mimeType } = await AudioCompressor.compressAudioBlob(audioBlob);
      const res = await ApiClient.transcribeAudio(base64, mimeType, fromLang, settings.selectedModel);
      const transcribed = res.text.trim();

      if (transcribed) {
        setTextInput(transcribed);
        showToast('Transcribed! Translating…');

        const transRes = await ApiClient.translateText(
          transcribed,
          fromLang,
          toLang,
          'natural',
          settings.selectedModel
        );
        setTextOutput(transRes.translatedText);
        setConfidence(transRes.confidence ?? 0.98);
        setAlternatives(transRes.alternatives || []);

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            from: fromLang,
            to: toLang,
            input: transcribed,
            output: transRes.translatedText,
            time: `Today ${timeStr}`,
            type: 'voice',
          },
          ...prev,
        ]);

        if (settings.voiceOutput) {
          playSpeech(transRes.translatedText, toLang);
        }
      } else {
        showToast('Could not hear speech clearly. Please try speaking again.');
      }
    } catch (err: any) {
      showToast(err.message || 'Audio transcription failed. Check Wi-Fi/VPN.');
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Image Translation (Screen 4)
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast('Image file too large (max 20MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setImageOcrExtracted('');
      setImageOcrTranslated('');
      setIsProcessingOcr(true);
      showToast('Analyzing image instantly…');

      try {
        const res = await ApiClient.ocrAndTranslate(
          base64,
          toLang,
          file.type || 'image/jpeg',
          settings.selectedModel
        );
        setImageOcrExtracted(res.extractedText);
        setImageOcrTranslated(res.translatedText);

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            from: res.detectedSourceLanguage || fromLang,
            to: toLang,
            input: res.extractedText || 'Image OCR',
            output: res.translatedText,
            time: `Today ${timeStr}`,
            type: 'image',
          },
          ...prev,
        ]);
        showToast('Image translated successfully! ✨');
      } catch (err: any) {
        showToast(err.message || 'Image translation failed.');
      } finally {
        setIsProcessingOcr(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Camera Live Translation (Screen 5)
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError('Camera access not available or permission denied.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCameraCapturedImage(base64);
      stopCamera();

      setIsProcessingCameraOcr(true);
      showToast('Extracting text and translating…');

      const res = await ApiClient.ocrAndTranslate(
        base64,
        toLang,
        'image/jpeg',
        settings.selectedModel
      );
      setCameraOcrExtracted(res.extractedText);
      setCameraOcrTranslated(res.translatedText);

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          from: res.detectedSourceLanguage || fromLang,
          to: toLang,
          input: res.extractedText || 'Camera Scan',
          output: res.translatedText,
          time: `Today ${timeStr}`,
          type: 'image',
        },
        ...prev,
      ]);
      showToast('Camera scan translated! ✨');
    } catch (err: any) {
      showToast(err.message || 'Camera translation failed.');
    } finally {
      setIsProcessingCameraOcr(false);
    }
  };

  // Play Speech
  const playSpeech = (text: string, language: string) => {
    if (!text) return;
    setSpeakingText(text);
    GlobalAudioPlayer.play(text, language, {
      onEnd: () => setSpeakingText(null),
      onError: () => setSpeakingText(null),
    });
  };

  const stopAudio = () => {
    GlobalAudioPlayer.stop();
    setSpeakingText(null);
  };

  // Copy helpers
  const handleCopyInputText = () => {
    if (!textInput) return;
    navigator.clipboard.writeText(textInput);
    setCopiedInput(true);
    showToast('Input text copied to clipboard!');
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutputText = (customTxt?: string) => {
    const toCopy = customTxt !== undefined ? customTxt : textOutput;
    if (!toCopy) return;
    navigator.clipboard.writeText(toCopy);
    setCopiedOutput(true);
    showToast('Translation copied to clipboard!');
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nova Translate',
          text: text,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard for sharing!');
    }
  };

  // Save Bookmark
  const handleSaveItem = (inText: string, outText: string, type: 'text' | 'voice' | 'image' = 'text') => {
    if (!inText || !outText) {
      showToast('Nothing to save.');
      return;
    }

    const exists = savedItems.some((i) => i.input === inText && i.output === outText);
    if (exists) {
      showToast('Phrase already saved in bookmarks.');
      return;
    }

    const newItem: SavedItem = {
      id: Date.now().toString(),
      from: fromLang,
      to: toLang,
      input: inText,
      output: outText,
      type: type,
      timestamp: 'Today',
      details: details || '',
    };

    setSavedItems((prev) => [newItem, ...prev]);
    showToast('Saved to Bookmarks! 🔖');
  };

  const handleDeleteSaved = (id: string) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Removed from saved items.');
  };

  const handleUseItem = (item: HistoryItem | SavedItem) => {
    setFromLang(item.from);
    setToLang(item.to);
    setTextInput(item.input);
    setTextOutput(item.output);
    showScreen(2);
  };

  // Filter languages
  const filteredLanguages = languages.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.label.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="app-wrapper">
      <div className={`phone-frame ${settings.darkMode ? 'dark' : 'light'}`}>
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFile}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={cameraSnapInputRef}
          onChange={handleImageFile}
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
        />

        {/* Dynamic Scrollable Content Area */}
        <div className="content-area">
          {/* ==================================================== */}
          {/* SCREEN 1: HOME (Default)                             */}
          {/* ==================================================== */}
          <div className={`screen screen-home ${currentScreen === 1 ? 'active' : ''}`}>
            {/* Clean Brand Header with Minimalist Circle Star Logo (40px x 40px) */}
            <div className="brand-header-box">
              <div className="brand-header-left">
                <div className="logo-badge">
                  <NovaLogo size={46} />
                </div>
                <div className="brand-titles">
                  <h1>Nova Translate</h1>
                  <p>Translate · Listen · Understand</p>
                </div>
              </div>

              <div className="header-actions-group">
                {/* Google Gemini API Key Quick Pill */}
                <button
                  type="button"
                  onClick={handleOpenApiKeyModal}
                  className={`api-key-header-btn ${customApiKey ? 'active' : ''}`}
                  title="Configure Google Gemini API Key"
                  aria-label="Google Gemini API Key"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{customApiKey ? 'API Key: Active' : 'API Key'}</span>
                </button>

                {/* Instant Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="theme-toggle-header-btn"
                  title={settings.darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                  aria-label="Toggle Light and Dark Theme"
                >
                  {settings.darkMode ? (
                    <Sun className="w-5 h-5 text-amber-300" />
                  ) : (
                    <Moon className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Hero Banner */}
            <div className="hero-banner">
              <h3>Break Language Barriers</h3>
              <p>Type, speak, upload image, or scan with camera</p>
            </div>

            {/* 4 Dedicated Modality Action Cards */}
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
          </div>

          {/* ==================================================== */}
          {/* SCREEN 2: TEXT TRANSLATION                          */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 2 ? 'active' : ''}`}>
            {/* Minimal Clean Header */}
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Text Translation</h3>
              <div style={{ width: 36 }}></div>
            </div>

            {/* Language Selector */}
            <div className="lang-selector">
              <button type="button" onClick={() => setSelectingLangFor('from')} className="lang-btn">
                <span>{fromLang}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">▼</span>
              </button>
              <button className="swap-langs" onClick={handleSwapLangs} title="Swap Languages">
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setSelectingLangFor('to')} className="lang-btn">
                <span>{toLang}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">▼</span>
              </button>
            </div>

            {/* Text Input Area */}
            <div className="text-input-area">
              <textarea
                placeholder="Type or paste text here to translate…"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                maxLength={5000}
              />
              <div className="char-count">{textInput.length}/5000</div>
            </div>

            {/* Pure Text Action Buttons: Voice | Listening | Copy | Clear */}
            <div className="reconfigured-actions-grid">
              <button
                className={`reconfigured-action-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                title="Speak text into input"
              >
                <Mic className="w-3.5 h-3.5 text-[var(--border-active)]" />
                <span>{isListening ? 'Stop' : 'Voice'}</span>
              </button>

              <button
                className="reconfigured-action-btn"
                onClick={() => playSpeech(textInput, fromLang)}
                title="Listen to original input text"
              >
                <Headphones className="w-3.5 h-3.5 text-[var(--border-active)]" />
                <span>Listening</span>
              </button>

              <button
                className="reconfigured-action-btn"
                onClick={handleCopyInputText}
                title="Copy input text"
              >
                {copiedInput ? <Check className="w-3.5 h-3.5 text-[#00e699]" /> : <Copy className="w-3.5 h-3.5 text-[var(--border-active)]" />}
                <span>{copiedInput ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                className="reconfigured-action-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => { setTextInput(''); setTextOutput(''); }}
                title="Clear text"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Big Translate Button */}
            <button
              className="translate-btn"
              onClick={translateText}
              disabled={isTranslating || !textInput.trim()}
            >
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>{isTranslating ? 'Translating with AI (2-5s)…' : 'Translate'}</span>
            </button>

            {/* Result Section */}
            <div className={`result-section ${textOutput ? 'show' : ''}`}>
              <div className="result-label">
                <span>{toLang} Translation</span>
                <div className="flex items-center gap-2">
                  {confidence !== null && (
                    <span className="text-[10px] bg-emerald-500/20 text-[#00e699] px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                      {Math.round(confidence * 100)}% Accuracy
                    </span>
                  )}
                  <button
                    onClick={() => handleCopyOutputText()}
                    className="p-1 hover:text-[var(--text-primary)] text-[var(--border-active)] transition-colors"
                    title="Quick Copy"
                  >
                    {copiedOutput ? <Check className="w-3.5 h-3.5 text-[#00e699]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="result-text">{textOutput}</div>

              {details && (
                <div className="p-2.5 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-start gap-2 mb-3">
                  <Info className="w-3.5 h-3.5 text-[var(--border-active)] shrink-0 mt-0.5" />
                  <span>{details}</span>
                </div>
              )}

              {alternatives.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[var(--border-active)]" />
                    <span>Alternatives:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {alternatives.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setTextOutput(alt); showToast('Alternative selected'); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[var(--card-subtle)] hover:bg-[var(--card-bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all font-medium"
                      >
                        "{alt}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Save button is BLACK in Light Theme, WHITE in Dark Theme */}
              <div className="result-actions">
                <button className="result-action-btn" onClick={() => playSpeech(textOutput, toLang)}>
                  <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" /> Listen
                </button>
                <button className="result-action-btn" onClick={() => handleCopyOutputText()}>
                  {copiedOutput ? <Check className="w-3.5 h-3.5 text-[#00e699]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedOutput ? 'Copied' : 'Copy'}
                </button>
                <button className="result-action-btn" onClick={() => handleShare(`${textInput} -> ${textOutput}`)}>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button className="result-action-btn result-action-save-btn" onClick={() => handleSaveItem(textInput, textOutput, 'text')}>
                  <Bookmark className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 3: VOICE TRANSLATION                         */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 3 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Voice Translation</h3>
              <div style={{ width: 36 }}></div>
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
                {isListening ? <MicOff className="w-12 h-12 text-[#ff4d6d]" /> : <Mic className="w-12 h-12 text-[var(--border-active)]" />}
              </div>

              <div className="voice-status">
                <h3>{isListening ? `Listening (${recordingSeconds}s)…` : isProcessingAudio ? 'Transcribing with Gemini AI…' : 'Tap to Speak'}</h3>
                <p>{isListening ? 'Speak clearly for accurate translation' : 'Speak naturally in any language for instant audio translation'}</p>
              </div>

              {isListening && (
                <div className="waveform">
                  <div className="wave-bar" style={{ animationDelay: '0s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.3s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}

              {textInput && !isListening && (
                <div className="w-full bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border-color)] space-y-2 mb-4 text-left shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--border-active)]">Transcript:</span>
                    <div className="flex items-center gap-2">
                      <button onClick={handleCopyInputText} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        onClick={() => { setTextInput(''); setTextOutput(''); }}
                        className="text-[11px] text-[#ff4d6d] hover:underline flex items-center gap-1 font-bold"
                        title="Clear voice recording"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{textInput}</div>
                  {textOutput && (
                    <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#00e699]">{toLang} Translation:</span>
                        <button onClick={() => handleCopyOutputText()} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">{textOutput}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <button className="result-action-btn" onClick={() => playSpeech(textOutput, toLang)}>
                          <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" /> Listen
                        </button>
                        <button className="result-action-btn result-action-save-btn" onClick={() => handleSaveItem(textInput, textOutput, 'voice')}>
                          <Bookmark className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
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
          {/* SCREEN 4: IMAGE TRANSLATION (Dedicated Photo Upload & OCR) */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 4 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Image Translation</h3>
              <div style={{ width: 36 }}></div>
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
                <img src={selectedImage} alt="Uploaded preview" className="max-h-[220px] w-auto rounded-xl object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)] p-6 text-center">
                  <Upload className="w-10 h-10 text-[var(--border-active)]" />
                  <div className="font-bold text-[var(--text-primary)] text-sm">Select Image from Gallery</div>
                  <div className="text-xs text-[var(--text-secondary)]">Click to upload photo, document or screenshot</div>
                </div>
              )}
            </div>

            <button
              className="translate-btn mb-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingOcr}
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessingOcr ? 'Extracting & Translating…' : selectedImage ? 'Upload Another Photo' : 'Select Image'}</span>
            </button>

            {imageOcrTranslated && (
              <div className="result-section show">
                <div className="result-label">{toLang} Translation</div>
                <div className="result-text">{imageOcrTranslated}</div>
                {imageOcrExtracted && (
                  <div className="p-2.5 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] mb-3">
                    <span className="font-bold text-[var(--border-active)] block mb-1">Extracted Text:</span>
                    {imageOcrExtracted}
                  </div>
                )}
                <div className="result-actions">
                  <button className="result-action-btn" onClick={() => playSpeech(imageOcrTranslated, toLang)}>
                    <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" /> Listen
                  </button>
                  <button className="result-action-btn" onClick={() => handleCopyOutputText(imageOcrTranslated)}>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button className="result-action-btn result-action-save-btn" onClick={() => handleSaveItem(imageOcrExtracted, imageOcrTranslated, 'image')}>
                    <Bookmark className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 5: CAMERA TRANSLATION                         */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 5 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => { stopCamera(); showScreen(1); }}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Camera Translation</h3>
              <div style={{ width: 36 }}></div>
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

            <div className="camera-preview-box">
              <video ref={videoRef} playsInline autoPlay muted className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} />
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--card-bg)] p-5 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0099FF]/20 to-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center text-[#00D4FF] shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1">Instant Camera Translation</h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-[260px]">Point at signs, menus, documents or books to translate</p>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full max-w-[280px] mt-2">
                    {/* Primary Button: 100% reliable native phone camera */}
                    <button
                      onClick={() => cameraSnapInputRef.current?.click()}
                      type="button"
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-[#070d18] text-xs font-extrabold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo with Camera</span>
                    </button>

                    {/* Secondary Button: Live video scanner */}
                    <button
                      onClick={startCamera}
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--card-bg-hover)] transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#00D4FF]" />
                      <span>Start Live Video Scanner</span>
                    </button>
                  </div>

                  {cameraError && (
                    <div className="text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg max-w-[280px]">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isCameraActive && (
              <div className="flex flex-col items-center gap-3 my-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={captureCameraPhoto}
                    type="button"
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-[#070d18] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                    title="Capture Photo"
                  >
                    <Camera className="w-7 h-7" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cameraSnapInputRef.current?.click()}
                  className="text-xs text-[var(--border-active)] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Camera className="w-3.5 h-3.5" /> Or take photo with native camera
                </button>
              </div>
            )}

            {cameraCapturedImage && (
              <div className="result-section show">
                <div className="result-label">{toLang} Translation</div>
                {isProcessingCameraOcr ? (
                  <div className="text-sm text-[var(--border-active)] animate-pulse py-2 font-bold">
                    Analyzing & translating camera photo…
                  </div>
                ) : (
                  <>
                    <div className="result-text">{cameraOcrTranslated}</div>
                    {cameraOcrExtracted && (
                      <div className="p-2.5 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] mb-3">
                        <span className="font-bold text-[var(--border-active)] block mb-1">Detected Text:</span>
                        {cameraOcrExtracted}
                      </div>
                    )}
                    <div className="result-actions">
                      <button className="result-action-btn" onClick={() => playSpeech(cameraOcrTranslated, toLang)}>
                        <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" /> Listen
                      </button>
                      <button className="result-action-btn" onClick={() => handleCopyOutputText(cameraOcrTranslated)}>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button className="result-action-btn result-action-save-btn" onClick={() => handleSaveItem(cameraOcrExtracted, cameraOcrTranslated, 'image')}>
                        <Bookmark className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              className="translate-btn mt-3"
              onClick={() => { stopCamera(); showScreen(1); }}
            >
              <X className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* ==================================================== */}
          {/* SCREEN 6: HISTORY (Dedicated History Tab)           */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 6 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Full Translation History</h3>
              {history.length > 0 && (
                <button
                  onClick={() => { setHistory([]); showToast('History cleared.'); }}
                  className="back-btn text-[#ff4d6d]"
                  title="Delete All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)] space-y-2">
                <HistoryIcon className="w-10 h-10 mx-auto opacity-40" />
                <div className="font-bold text-[var(--text-primary)]">No history yet</div>
                <div className="text-xs">Your translations will be saved here automatically.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--border-active)]">{item.from} → {item.to}</span>
                      <span className="text-[var(--text-secondary)] text-[11px]">{item.time}</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs text-[var(--text-secondary)] font-medium">{item.input}</div>
                      <div className="text-sm text-[var(--text-primary)] font-bold">{item.output}</div>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => playSpeech(item.output, item.to)} className="p-1.5 bg-[var(--action-btn-bg)] rounded-lg text-[var(--text-primary)] border border-[var(--border-color)]">
                          <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" />
                        </button>
                        <button onClick={() => handleCopyOutputText(item.output)} className="p-1.5 bg-[var(--action-btn-bg)] rounded-lg text-[var(--text-primary)] border border-[var(--border-color)]">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => handleUseItem(item)} className="text-xs font-bold text-[var(--border-active)] flex items-center gap-1 hover:underline">
                        Translate <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 7: SAVED TRANSLATIONS (BOOKMARKS)             */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 7 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Saved Translations</h3>
              <div style={{ width: 36 }}></div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-3 px-1">
              {(['all', 'text', 'voice', 'image'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSavedTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                    savedTab === tab
                      ? 'bg-[var(--border-active)] text-slate-950 border-[var(--border-active)] shadow-sm'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {savedItems.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)] space-y-2">
                <Bookmark className="w-10 h-10 mx-auto opacity-40 text-[var(--save-btn-text)]" />
                <div className="font-bold text-[var(--text-primary)]">No saved phrases</div>
                <div className="text-xs">Click the bookmark (🔖) button on any translation to save favorites.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedItems
                  .filter((i) => savedTab === 'all' || (i.type || 'text') === savedTab)
                  .map((item) => (
                    <div key={item.id} className="p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-2 shadow-sm">
                      <div className="text-sm font-bold text-[var(--text-primary)]">{item.output}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{item.input}</div>
                      <div className="text-[11px] text-[var(--border-active)] flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                        <span>{item.from} → {item.to}</span>
                        <span className="text-[var(--text-secondary)]">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-1.5">
                          <button onClick={() => playSpeech(item.output, item.to)} className="p-1.5 bg-[var(--action-btn-bg)] rounded-lg text-[var(--text-primary)] border border-[var(--border-color)]">
                            <Volume2 className="w-3.5 h-3.5 text-[var(--border-active)]" />
                          </button>
                          <button onClick={() => handleCopyOutputText(item.output)} className="p-1.5 bg-[var(--action-btn-bg)] rounded-lg text-[var(--text-primary)] border border-[var(--border-color)]">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteSaved(item.id)} className="p-1.5 bg-[var(--action-btn-bg)] rounded-lg text-[#ff4d6d] border border-[var(--border-color)]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button onClick={() => handleUseItem(item)} className="text-xs font-bold text-[var(--border-active)] flex items-center gap-1 hover:underline">
                          Translate <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SCREEN 8: SETTINGS                                  */}
          {/* ==================================================== */}
          <div className={`screen screen-text ${currentScreen === 8 ? 'active' : ''}`}>
            <div className="translation-header">
              <button className="back-btn" onClick={() => showScreen(1)}><ArrowLeft className="w-5 h-5" /></button>
              <h3 className="flex-1 text-center font-bold text-sm text-[var(--text-primary)]">Settings</h3>
              <div style={{ width: 36 }}></div>
            </div>

            <div className="space-y-4">
              {/* GOOGLE GEMINI MODEL VERSION SELECTOR */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">AI Model Version & Speed</div>
                <div className="p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[var(--border-active)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Select Flash Engine</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#00e699] bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      2-5s Max ⚡
                    </span>
                  </div>

                  <select
                    value={settings.selectedModel || 'gemini-3.8-flash'}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2.5 bg-[var(--card-subtle)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <div className="text-[10px] text-[var(--text-secondary)] leading-tight">
                    Optimized for 2-5s max response, Wi-Fi/VPN tolerance, and automatic model fallback.
                  </div>
                </div>
              </div>

              {/* GOOGLE GEMINI API KEY Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Google Gemini API Key</div>
                <div className="p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-[var(--border-active)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Custom API Key</span>
                    </div>
                    {customApiKey ? (
                      <span className="text-[10px] font-bold text-[#00e699] bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
                        Default Engine
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Enter your Google Gemini API key to activate voice recording, camera scanner, and photo analysis directly with your account.
                  </p>

                  <button
                    onClick={handleOpenApiKeyModal}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-[#070d18] text-xs font-extrabold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{customApiKey ? 'Manage / Update Gemini API Key' : 'Enter Gemini API Key'}</span>
                  </button>
                </div>
              </div>

              {/* THEME & APPEARANCE Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Appearance & Theme</div>
                <div className="theme-selector-grid">
                  <button
                    type="button"
                    onClick={() => setThemeMode(false)}
                    className={`theme-card-option ${!settings.darkMode ? 'active' : ''}`}
                  >
                    <div className="theme-card-preview light-preview">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-[var(--text-primary)]">Light Mode</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Crisp & Clean</div>
                    </div>
                    {!settings.darkMode && <Check className="w-4 h-4 text-[#0099FF]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode(true)}
                    className={`theme-card-option ${settings.darkMode ? 'active' : ''}`}
                  >
                    <div className="theme-card-preview dark-preview">
                      <Moon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-[var(--text-primary)]">Pure Black (#000000)</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">OLED Dark Mode</div>
                    </div>
                    {settings.darkMode && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>
              </div>

              {/* LANGUAGE Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Language Defaults</div>
                <div className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Input Language</span>
                  <button onClick={() => setSelectingLangFor('from')} className="px-3 py-1.5 bg-[var(--action-btn-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--border-active)]">
                    {fromLang}
                  </button>
                </div>
                <div className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Output Language</span>
                  <button onClick={() => setSelectingLangFor('to')} className="px-3 py-1.5 bg-[var(--action-btn-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--border-active)]">
                    {toLang}
                  </button>
                </div>
              </div>

              {/* VOICE & SPEECH Section */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Voice & Speech</div>
                <div className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Automatic Speech Output</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Play audio automatically after translation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, voiceOutput: !s.voiceOutput }))}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      settings.voiceOutput ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF]' : 'bg-slate-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.voiceOutput ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* APP Section */}
              <div className="space-y-2">
                <div className="p-3.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl space-y-1 text-center text-xs text-[var(--text-secondary)] shadow-sm">
                  <div className="font-extrabold text-[var(--text-primary)]">Nova Translate AI v2.0</div>
                  <div>Powered by Google Gemini AI</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* GOOGLE GEMINI API KEY SETUP MODAL                   */}
        {/* ==================================================== */}
        {isApiKeyModalOpen && (
          <div className="modal-overlay" onClick={() => setIsApiKeyModalOpen(false)}>
            <div className="modal-content max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0099FF] to-[#00D4FF] flex items-center justify-center text-[#070d18]">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Google Gemini API Key</h3>
                    <p className="text-[10px] text-[var(--text-secondary)]">گوگل اے پی آئی کی سیٹ اپ</p>
                  </div>
                </div>
                <button onClick={() => setIsApiKeyModalOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto pr-1">
                <div className="p-3 bg-[var(--card-subtle)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-secondary)] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                    <ShieldCheck className="w-4 h-4 text-[#00e699]" />
                    <span>Optimized for 2-5s Max Speed + Wi-Fi/VPN:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-[var(--text-secondary)]">
                    <li>Flash 3.8, 2.0, 1.5 & Flash Lite 1.1 support</li>
                    <li>Wi-Fi and VPN proxy tolerance with auto-fallback</li>
                    <li>Real-time Microphone voice translation with Clear button</li>
                    <li>Camera scanner & gallery OCR photo translation</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)] block">
                    Paste Google Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKeyPlain ? 'text' : 'password'}
                      placeholder="Paste your key (e.g. AQ..., AIzaSy...)"
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPlain(!showApiKeyPlain)}
                      className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {showApiKeyPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {apiKeyFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      apiKeyFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-[#00e699]'
                        : 'bg-red-500/10 border-red-500/30 text-[#ff4d6d]'
                    }`}
                  >
                    {apiKeyFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{apiKeyFeedback.message}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAndTestApiKey}
                    disabled={isTestingApiKey || !inputApiKey.trim()}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-[#070d18] text-xs font-extrabold shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isTestingApiKey ? 'Testing Connection (2-5s)…' : 'Save & Test API Key'}</span>
                  </button>

                  {customApiKey && (
                    <button
                      type="button"
                      onClick={handleRemoveApiKey}
                      className="py-3 px-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-color)] text-[#ff4d6d] text-xs font-bold hover:bg-[var(--card-bg-hover)] transition-all"
                      title="Remove Custom Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* LANGUAGE SELECTION MODAL                            */}
        {/* ==================================================== */}
        {selectingLangFor && (
          <div className="modal-overlay" onClick={() => setSelectingLangFor(null)}>
            <div className="modal-content max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-3">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Select {selectingLangFor === 'from' ? 'Source' : 'Target'} Language
                </h3>
                <button onClick={() => setSelectingLangFor(null)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search language…"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--card-subtle)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
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
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--border-active)]/10 border-[var(--border-active)] text-[var(--border-active)] font-bold'
                          : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--border-active)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{lang.label}</span>
                        <span className="text-xs text-[var(--text-secondary)] font-normal">({lang.nativeName})</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[var(--border-active)]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* FIXED BOTTOM NAVBAR                                 */}
        {/* ==================================================== */}
        <div className="navbar">
          <button
            className={`nav-btn ${navTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            <HomeIcon />
            <span>Home</span>
          </button>
          <button
            className={`nav-btn ${navTab === 'history' ? 'active' : ''}`}
            onClick={() => handleNavClick('history')}
          >
            <HistoryIcon />
            <span>History</span>
          </button>
          <button
            className={`nav-btn ${navTab === 'saved' ? 'active' : ''}`}
            onClick={() => handleNavClick('saved')}
          >
            <Bookmark />
            <span>Saved</span>
          </button>
          <button
            className={`nav-btn ${navTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <Toast message={toastMessage} />
        )}
      </div>
    </div>
  );
}
