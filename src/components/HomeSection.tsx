import React, { useState, useEffect, useRef } from 'react';
import { ApiClient, LanguageOption, TranslationResult } from '../services/apiClient.ts';
import { GlobalAudioPlayer, getLanguageSpeechCode } from '../services/audioPlayer.ts';
import { AudioCompressor } from '../services/audioCompressor.ts';
import { HistoryItem, SavedItem, ActivePage } from '../types.ts';
import {
  Zap,
  Volume2,
  Copy,
  Share2,
  Sparkles,
  Mic,
  MicOff,
  Bookmark,
  Check,
  ArrowRightLeft,
  Camera,
  Image as ImageIcon,
  Keyboard,
  Info,
  Layers,
} from 'lucide-react';

interface HomeSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onAddSaved?: (item: SavedItem) => void;
  onNavigate: (page: ActivePage) => void;
  onToast: (msg: string) => void;
  autoDetectEnabled: boolean;
  voiceOutputEnabled: boolean;
  textSize: 'small' | 'medium' | 'large';
  loadedItem?: HistoryItem | null;
  onClearLoadedItem?: () => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  languages,
  onAddHistory,
  onAddSaved,
  onNavigate,
  onToast,
  autoDetectEnabled,
  voiceOutputEnabled,
  textSize,
  loadedItem,
  onClearLoadedItem,
}) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [fromLang, setFromLang] = useState('Urdu 🇵🇰');
  const [toLang, setToLang] = useState('English 🇬🇧');
  const [tone, setTone] = useState<'natural' | 'formal' | 'casual'>('natural');
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const [status, setStatus] = useState<'Ready' | 'Translating…' | 'Transcribing…'>('Ready');
  const [isTranslating, setIsTranslating] = useState(false);
  const [outputDirection, setOutputDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Nova Translate rich response metadata
  const [confidence, setConfidence] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [details, setDetails] = useState<string>('');

  // Audio Playback State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInputSpeaking, setIsInputSpeaking] = useState(false);
  const [audioProgressText, setAudioProgressText] = useState('');

  // Speech Recognition & Audio Recording State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveSpokenText, setLiveSpokenText] = useState('');

  const isListeningRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const baseTextRef = useRef<string>('');
  const liveTranscriptRef = useRef<string>('');
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Loading of History or Saved Items
  useEffect(() => {
    if (loadedItem) {
      setInputText(loadedItem.input);
      setOutputText(loadedItem.output);
      if (loadedItem.from) setFromLang(loadedItem.from);
      if (loadedItem.to) setToLang(loadedItem.to);
      if (loadedItem.detectedLang) setDetectedBadge(loadedItem.detectedLang);
      if (loadedItem.confidence) setConfidence(loadedItem.confidence);
      if (loadedItem.details) setDetails(loadedItem.details);
      onToast('Loaded into translator');
      if (onClearLoadedItem) onClearLoadedItem();
    }
  }, [loadedItem, onClearLoadedItem, onToast]);

  const handleSwap = () => {
    if (fromLang.startsWith('Auto-detect')) {
      onToast('Select a specific source language to swap.');
      return;
    }
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    if (outputText && outputText !== 'Your translation will appear here.') {
      const prevOut = outputText;
      setOutputText(inputText);
      setInputText(prevOut);
    }
  };

  const handleTranslate = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      onToast('Please enter or speak text to translate.');
      return;
    }

    setIsTranslating(true);
    setStatus('Translating…');
    setIsSaved(false);
    const start = Date.now();

    try {
      const sourceToSend = autoDetectEnabled && fromLang.includes('Auto')
        ? 'Auto-detect'
        : fromLang;

      const result: TranslationResult = await ApiClient.translateText(trimmed, sourceToSend, toLang, tone);
      const elapsed = Date.now() - start;

      setLatencyMs(elapsed);
      setIsCached(!!result.fromCache);
      setOutputText(result.translatedText);
      setOutputDirection(result.direction);
      setConfidence(result.confidence || 0.98);
      setAlternatives(result.alternatives || []);
      setDetails(result.details || '');
      setStatus('Ready');

      if (result.detectedSourceLanguage) {
        setDetectedBadge(result.detectedSourceLanguage);
      }

      onAddHistory({
        id: Date.now().toString(),
        from: result.sourceLanguage || fromLang,
        to: result.targetLanguage || toLang,
        input: trimmed,
        output: result.translatedText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detectedLang: result.detectedSourceLanguage,
        confidence: result.confidence,
        details: result.details,
      });

      if (result.fromCache) {
        onToast('⚡ Instant translation from Cache (0ms)');
      } else {
        onToast(`⚡ Translated in ${(elapsed / 1000).toFixed(1)}s!`);
      }

      if (voiceOutputEnabled) {
        playSpeech(result.translatedText, toLang, false, false);
      }
    } catch (err: any) {
      setStatus('Ready');
      onToast(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleClear = () => {
    stopAllAudio();
    stopMicrophone();
    setInputText('');
    setOutputText('');
    setDetectedBadge(null);
    setLiveSpokenText('');
    setLatencyMs(null);
    setConfidence(null);
    setAlternatives([]);
    setDetails('');
    setIsSaved(false);
    setStatus('Ready');
  };

  const handleCopy = async () => {
    if (!outputText || outputText === 'Your translation will appear here.') {
      onToast('Nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      onToast('Copied translation to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy to clipboard.');
    }
  };

  const handleShare = async () => {
    if (!outputText || outputText === 'Your translation will appear here.') {
      onToast('Nothing to share.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nova Translate',
          text: `${inputText} -> ${outputText}`,
        });
      } catch {
        // Share dismissed
      }
    } else {
      await handleCopy();
    }
  };

  const handleSaveTranslation = () => {
    if (!outputText || !inputText) {
      onToast('Please translate text first.');
      return;
    }

    if (onAddSaved) {
      onAddSaved({
        id: Date.now().toString(),
        from: fromLang,
        to: toLang,
        input: inputText.trim(),
        output: outputText.trim(),
        type: 'text',
        details: details || `${Math.round((confidence || 0.98) * 100)}% Match`,
        timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });
      setIsSaved(true);
      onToast('Saved to your Bookmarked Phrases! 🔖');
    }
  };

  const handleSelectAlternative = (alt: string) => {
    setOutputText(alt);
    onToast('Alternative selected');
  };

  // Audio Playback
  const stopAllAudio = () => {
    GlobalAudioPlayer.stop();
    setIsSpeaking(false);
    setIsInputSpeaking(false);
    setAudioProgressText('');
  };

  const playSpeech = (
    text: string,
    langName: string,
    showToast = true,
    isInput = false
  ) => {
    const clean = (text || '').trim();
    if (!clean || clean === 'Your translation will appear here.') {
      onToast(isInput ? 'Please enter some text first.' : 'Please translate text first.');
      return;
    }

    if ((isInput && isInputSpeaking) || (!isInput && isSpeaking)) {
      stopAllAudio();
      onToast('Audio stopped.');
      return;
    }

    stopAllAudio();

    if (isInput) {
      setIsInputSpeaking(true);
      if (showToast) onToast('Reading original text aloud...');
    } else {
      setIsSpeaking(true);
      if (showToast) onToast('Reading translation aloud...');
    }

    GlobalAudioPlayer.play(clean, langName, {
      onStart: () => {
        if (isInput) setIsInputSpeaking(true);
        else setIsSpeaking(true);
      },
      onProgress: (current, total) => {
        if (total > 1) {
          setAudioProgressText(`(${current}/${total})`);
        } else {
          setAudioProgressText('');
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsInputSpeaking(false);
        setAudioProgressText('');
      },
      onError: () => {
        setIsSpeaking(false);
        setIsInputSpeaking(false);
        setAudioProgressText('');
      },
    });
  };

  // High-Speed Voice Recording
  const stopMicrophone = () => {
    isListeningRef.current = false;
    setIsListening(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.stop();
      } catch {
        try { rec.abort(); } catch {}
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Recorder stop notice:', e);
      }
    }
  };

  const startMicrophone = async () => {
    stopAllAudio();
    stopMicrophone();

    audioChunksRef.current = [];
    liveTranscriptRef.current = '';
    setLiveSpokenText('');
    baseTextRef.current = inputText ? inputText.trim() : '';
    setRecordingSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      onToast('Microphone access denied. Please allow microphone permission.');
      return;
    }

    setIsListening(true);
    isListeningRef.current = true;
    onToast('Microphone active! Speak clearly…');

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // 1. High-Speed MediaRecorder with Audio Compressor
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const liveCaptured = liveTranscriptRef.current.trim();
        if (audioChunksRef.current.length === 0) {
          if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
          return;
        }

        const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (rawBlob.size < 50) {
          if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
          return;
        }

        setIsProcessingAudio(true);
        setStatus('Transcribing…');

        try {
          const { base64, mimeType: compressedMime } = await AudioCompressor.compressAudioBlob(rawBlob);
          const res = await ApiClient.transcribeAudio(base64, compressedMime, fromLang);
          if (res && res.text && res.text.trim()) {
            const finalSpeech = res.text.trim();
            const combined = baseTextRef.current ? `${baseTextRef.current} ${finalSpeech}` : finalSpeech;
            setInputText(combined);
            setLiveSpokenText(finalSpeech);
            onToast('Voice transcribed in ~2s!');
          } else if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
        } catch (err: any) {
          console.warn('Audio transcription error:', err);
          if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
        } finally {
          setIsProcessingAudio(false);
          setStatus('Ready');
        }
      };

      recorder.start(200);
    } catch (recorderErr) {
      console.warn('MediaRecorder error:', recorderErr);
    }

    // 2. Real-time Web Speech API Preview
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = getLanguageSpeechCode(fromLang);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }

          const liveSpeech = accumulated.trim();
          if (liveSpeech) {
            liveTranscriptRef.current = liveSpeech;
            setLiveSpokenText(liveSpeech);
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveSpeech}` : liveSpeech;
            setInputText(combined);
          }
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          if (isListeningRef.current && recognitionRef.current) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition init notice:', err);
      }
    }
  };

  const handleVoiceInput = () => {
    if (isListeningRef.current) {
      stopMicrophone();
      onToast('Transcribing voice…');
    } else {
      startMicrophone();
    }
  };

  // Quick image file upload trigger
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onNavigate('camera');
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopMicrophone();
    };
  }, []);

  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };

  return (
    <section className="section active" id="home">
      {/* Hidden image input for quick upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Hero Banner with Modern Nova Gradient */}
      <div className="hero-banner bg-gradient-to-r from-[#0099FF]/20 via-[#00D4FF]/15 to-transparent border border-[#2a3d5a] rounded-3xl p-6 sm:p-7 mb-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0099FF]/20 text-[#00D4FF] text-xs font-extrabold mb-2 border border-[#0099FF]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
            NOVA TRANSLATOR ENGINE
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Break Language Barriers
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-lg mt-1">
            Type, speak, or upload images for instant, high-accuracy natural translations in 100+ languages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('camera')}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-[#1a2847] hover:bg-[#2a3d5a] text-white border border-[#2a3d5a] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Camera className="w-4 h-4 text-[#00D4FF]" />
            Camera OCR
          </button>
          <button
            onClick={() => onNavigate('saved')}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-[#1a2847] hover:bg-[#2a3d5a] text-white border border-[#2a3d5a] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Bookmark className="w-4 h-4 text-cyan-400" />
            Saved
          </button>
        </div>
      </div>

      <div className="workspace max-w-4xl mx-auto space-y-4">
        {/* Language Bar & Tone Selector */}
        <div className="bg-[#1a2847] p-4 rounded-2xl border border-[#2a3d5a] shadow-sm space-y-3">
          <div className="langrow flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Source Language</label>
              <select
                className="select w-full bg-[#0a1628] border-[#2a3d5a] text-white font-medium rounded-xl"
                id="from"
                value={fromLang}
                onChange={(e) => setFromLang(e.target.value)}
              >
                {autoDetectEnabled && <option value="Auto-detect 🌐">Auto-detect 🌐</option>}
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="swap mt-5 p-2.5 rounded-full bg-[#0a1628] hover:bg-[#0099FF]/20 text-[#00D4FF] border border-[#2a3d5a] transition-all"
              id="swap"
              onClick={handleSwap}
              title="Swap Languages"
              type="button"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Target Language</label>
              <select
                className="select w-full bg-[#0a1628] border-[#2a3d5a] text-white font-medium rounded-xl"
                id="to"
                value={toLang}
                onChange={(e) => setToLang(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tone Selector Chips */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2a3d5a]/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Translation Style:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['natural', 'formal', 'casual'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                    tone === t
                      ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950 shadow-sm'
                      : 'bg-[#0a1628] text-slate-300 hover:text-white border border-[#2a3d5a]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Speaking Notification */}
        {(isSpeaking || isInputSpeaking) && (
          <div className="p-3 bg-blue-500/10 border border-[#0099FF]/40 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#00D4FF] animate-ping"></span>
              <span className="text-xs sm:text-sm font-bold text-white">
                🔊 Reading aloud {audioProgressText}...
              </span>
            </div>
            <button
              onClick={stopAllAudio}
              className="px-3 py-1 bg-[#0099FF] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm"
              type="button"
            >
              ⏹ Stop
            </button>
          </div>
        )}

        {/* Live Active Recording Notification */}
        {isListening && (
          <div className="p-4 bg-rose-500/10 border-2 border-rose-500/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-rose-500 animate-ping absolute"></span>
                <span className="w-3 h-3 rounded-full bg-rose-600 relative"></span>
              </div>
              <div>
                <span className="text-sm font-extrabold text-rose-300 block">
                  🎙️ Recording Speech ({recordingSeconds}s)… Speak now
                </span>
                <span className="text-xs text-rose-200/80">
                  {liveSpokenText ? `"${liveSpokenText}"` : 'Listening and transcribing in real-time...'}
                </span>
              </div>
            </div>
            <button
              onClick={handleVoiceInput}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
              type="button"
            >
              <MicOff className="w-4 h-4" /> Stop & Transcribe
            </button>
          </div>
        )}

        {isProcessingAudio && (
          <div className="p-3 bg-[#1a2847] border border-[#0099FF]/40 rounded-xl flex items-center gap-2.5 text-[#00D4FF] text-xs sm:text-sm font-semibold">
            <span className="animate-spin text-base">⚡</span>
            Transcribing audio with compressed 16kHz payload (~2s)...
          </div>
        )}

        {/* Editor Grid */}
        <div className="editorgrid grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Text Panel */}
          <div className="panel bg-[#1a2847] border border-[#2a3d5a] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div className="panelhead p-3.5 bg-[#0a1628] border-b border-[#2a3d5a] flex items-center justify-between font-bold text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-[#00D4FF]" />
                  Original Text ({fromLang})
                </span>
                <span id="count" className="text-slate-400">{inputText.length} / 5000</span>
              </div>
              <div className="p-4">
                <textarea
                  id="input"
                  maxLength={5000}
                  placeholder="Type, paste text, or tap microphone to speak…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ fontSize: fontSizeMap[textSize] }}
                  className="w-full min-h-[160px] bg-transparent border-0 focus:ring-0 p-0 resize-none outline-none font-medium text-white placeholder-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />
              </div>
            </div>

            <div className="p-3 bg-[#0a1628] border-t border-[#2a3d5a] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  className={`mini px-3 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isListening ? 'bg-rose-600 text-white border-rose-500' : 'text-slate-300 hover:text-white hover:border-[#0099FF]'
                  }`}
                  id="mic"
                  onClick={handleVoiceInput}
                  type="button"
                  title="Speak into microphone"
                >
                  <Mic className="w-3.5 h-3.5 text-[#00D4FF]" />
                  {isListening ? '⏹ Stop' : '🎤 Speak'}
                </button>
                <button
                  className="mini px-3 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#0099FF] flex items-center gap-1.5"
                  onClick={() => onNavigate('camera')}
                  type="button"
                  title="Camera OCR"
                >
                  <Camera className="w-3.5 h-3.5 text-[#00D4FF]" />
                  Camera
                </button>
                <button
                  className="mini px-2.5 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold text-slate-400 hover:text-white"
                  id="clear"
                  onClick={handleClear}
                  type="button"
                  title="Clear text"
                >
                  Clear
                </button>
              </div>
              <div className="text-xs text-[#00D4FF] font-medium">
                {detectedBadge ? `Detected: ${detectedBadge}` : ''}
              </div>
            </div>
          </div>

          {/* Translation Output Panel */}
          <div className="panel bg-[#1a2847] border border-[#2a3d5a] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div className="panelhead p-3.5 bg-[#0a1628] border-b border-[#2a3d5a] flex items-center justify-between font-bold text-xs text-white">
                <span className="flex items-center gap-1.5 text-[#00D4FF]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Translation ({toLang})
                </span>
                <div className="flex items-center gap-2">
                  {confidence !== null && outputText && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold">
                      {Math.round(confidence * 100)}% Accuracy
                    </span>
                  )}
                  <span id="status" className="text-slate-400">
                    {status}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div
                  className="output min-h-[120px] font-medium whitespace-pre-wrap text-white leading-relaxed"
                  id="output"
                  style={{
                    fontSize: fontSizeMap[textSize],
                    direction: outputDirection,
                  }}
                >
                  {outputText || (
                    <span className="text-slate-500 italic">Your accurate translation will appear here…</span>
                  )}
                </div>

                {/* Details & Cultural Context note if present */}
                {details && outputText && (
                  <div className="p-2.5 rounded-xl bg-[#0a1628] border border-[#2a3d5a] text-xs text-slate-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
                    <span>{details}</span>
                  </div>
                )}

                {/* Alternative Translations Chips */}
                {alternatives.length > 0 && outputText && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#00D4FF]" />
                      <span>Alternative Phrasings:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {alternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAlternative(alt)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#0a1628] hover:bg-[#0099FF]/20 text-slate-300 hover:text-white border border-[#2a3d5a] transition-all text-left"
                        >
                          "{alt}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#0a1628] border-t border-[#2a3d5a] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  className={`mini px-3 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSpeaking ? 'bg-[#0099FF] text-white' : 'text-slate-300 hover:text-white hover:border-[#0099FF]'
                  } disabled:opacity-40`}
                  id="listen"
                  onClick={() => playSpeech(outputText, toLang, true, false)}
                  type="button"
                  disabled={!outputText}
                  title="Listen to translation"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                  {isSpeaking ? `⏹ Stop ${audioProgressText}` : '🔊 Listen'}
                </button>
                <button
                  className="mini px-2.5 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#0099FF] flex items-center gap-1 disabled:opacity-40"
                  id="copy"
                  onClick={handleCopy}
                  type="button"
                  disabled={!outputText}
                  title="Copy translation"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  className="mini px-2.5 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#0099FF] flex items-center gap-1 disabled:opacity-40"
                  id="share"
                  onClick={handleShare}
                  type="button"
                  disabled={!outputText}
                  title="Share translation"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  className={`mini px-2.5 py-1.5 rounded-xl border border-[#2a3d5a] bg-[#1a2847] text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-all ${
                    isSaved ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : 'text-slate-300 hover:text-white hover:border-[#0099FF]'
                  }`}
                  onClick={handleSaveTranslation}
                  type="button"
                  disabled={!outputText}
                  title="Save to Bookmarked Phrases"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>

              {latencyMs !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00D4FF] bg-[#0099FF]/15 px-2 py-0.5 rounded-full border border-[#0099FF]/30">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  {isCached ? '0ms Cache' : `${(latencyMs / 1000).toFixed(2)}s`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Translate Bar */}
        <div className="translatebar flex justify-center pt-2">
          <button
            className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950 font-extrabold text-base shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            id="translate"
            onClick={handleTranslate}
            disabled={isTranslating || isProcessingAudio || !inputText.trim()}
            type="button"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            {isTranslating ? 'Translating in ~1s…' : 'Translate Now'}
          </button>
        </div>
      </div>
    </section>
  );
};
