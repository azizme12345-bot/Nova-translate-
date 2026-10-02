import React, { useState, useEffect, useRef } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface HomeSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onNavigate: (page: 'home' | 'voice' | 'history' | 'camera' | 'settings') => void;
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
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const [status, setStatus] = useState<'Ready' | 'Translating…' | 'Transcribing…'>('Ready');
  const [isTranslating, setIsTranslating] = useState(false);
  const [outputDirection, setOutputDirection] = useState<'ltr' | 'rtl'>('ltr');

  // Audio Playback State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInputSpeaking, setIsInputSpeaking] = useState(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isInputSpeakingRef = useRef<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Speech Recognition & Audio Recording State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const isListeningRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const baseTextRef = useRef<string>('');
  const liveTranscriptRef = useRef<string>('');
  const timerIntervalRef = useRef<any>(null);

  // Handle Loading of History Items
  useEffect(() => {
    if (loadedItem) {
      setInputText(loadedItem.input);
      setOutputText(loadedItem.output);
      if (loadedItem.from) setFromLang(loadedItem.from);
      if (loadedItem.to) setToLang(loadedItem.to);
      if (loadedItem.detectedLang) setDetectedBadge(loadedItem.detectedLang);
      onToast('History item loaded into translator');
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
      setInputText(outputText);
      setOutputText(inputText);
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

    try {
      const sourceToSend = autoDetectEnabled && fromLang.includes('Auto')
        ? 'Auto-detect'
        : fromLang;

      const result = await ApiClient.translateText(trimmed, sourceToSend, toLang);

      setOutputText(result.translatedText);
      setOutputDirection(result.direction);
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
      });

      onToast('Translation completed successfully.');

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
    setInputText('');
    setOutputText('');
    setDetectedBadge(null);
    setStatus('Ready');
  };

  const handleCopy = async () => {
    if (!outputText || outputText === 'Your translation will appear here.') {
      onToast('Nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(outputText);
      onToast('Copied translation to clipboard.');
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
          text: outputText,
        });
      } catch {
        // Share dismissed
      }
    } else {
      await handleCopy();
    }
  };

  // ==========================================
  // AUDIO PLAYBACK (TEXT TO SPEECH)
  // ==========================================
  const stopAllAudio = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    utteranceRef.current = null;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    isInputSpeakingRef.current = false;
    setIsInputSpeaking(false);
  };

  const getLanguageSpeechCode = (langName: string): string => {
    if (!langName) return 'en-US';
    if (langName.includes('Urdu')) return 'ur-PK';
    if (langName.includes('English')) return 'en-US';
    if (langName.includes('Arabic')) return 'ar-SA';
    if (langName.includes('Hindi')) return 'hi-IN';
    if (langName.includes('Punjabi')) return 'pa-IN';
    if (langName.includes('French')) return 'fr-FR';
    if (langName.includes('German')) return 'de-DE';
    if (langName.includes('Spanish')) return 'es-ES';
    if (langName.includes('Turkish')) return 'tr-TR';
    if (langName.includes('Chinese')) return 'zh-CN';
    if (langName.includes('Japanese')) return 'ja-JP';
    if (langName.includes('Russian')) return 'ru-RU';
    return 'en-US';
  };

  const playBrowserSpeechFallback = (cleanText: string, langName: string, isInput: boolean) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = getLanguageSpeechCode(langName);

      utterance.onstart = () => {
        if (isInput) {
          isInputSpeakingRef.current = true;
          setIsInputSpeaking(true);
        } else {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsInputSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsInputSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setIsInputSpeaking(false);
    }
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

    stopAllAudio();

    try {
      const audioUrl = ApiClient.getTtsAudioUrl(clean, langName);
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onplay = () => {
        if (isInput) {
          isInputSpeakingRef.current = true;
          setIsInputSpeaking(true);
          if (showToast) onToast('Playing original text aloud...');
        } else {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          if (showToast) onToast('Playing translation aloud...');
        }
      };

      audio.onended = () => {
        audioPlayerRef.current = null;
        setIsSpeaking(false);
        setIsInputSpeaking(false);
      };

      audio.onerror = () => {
        playBrowserSpeechFallback(clean, langName, isInput);
      };

      audio.play().catch(() => {
        playBrowserSpeechFallback(clean, langName, isInput);
      });
    } catch {
      playBrowserSpeechFallback(clean, langName, isInput);
    }
  };

  const handleListenInput = () => {
    if (isInputSpeakingRef.current || (audioPlayerRef.current && isInputSpeaking)) {
      stopAllAudio();
      onToast('Audio playback stopped.');
      return;
    }
    playSpeech(inputText, fromLang, true, true);
  };

  const handleListen = () => {
    if (isSpeakingRef.current || (audioPlayerRef.current && isSpeaking)) {
      stopAllAudio();
      onToast('Audio playback stopped.');
      return;
    }
    playSpeech(outputText, toLang, true, false);
  };

  // ==========================================
  // REAL-TIME SPEECH-TO-TEXT (MICROPHONE)
  // ==========================================
  const stopMicrophone = () => {
    isListeningRef.current = false;
    setIsListening(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop Web Speech API
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.stop(); } catch { try { rec.abort(); } catch {} }
    }

    // Request final data and stop MediaRecorder
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
    baseTextRef.current = inputText ? inputText.trim() + ' ' : '';
    setRecordingSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      onToast('Microphone access denied. Please allow microphone permission in your browser.');
      return;
    }

    setIsListening(true);
    isListeningRef.current = true;
    onToast('Microphone active! Speak now...');

    // Start timer counter
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // 1. Setup MediaRecorder for universal AI transcription
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio tracks cleanly after recording finalized
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) return;

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 400) return;

        // If Web Speech API already provided full live text, we can use it or verify with Gemini
        setIsProcessingAudio(true);
        setStatus('Transcribing…');

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string) || '';
            try {
              const res = await ApiClient.transcribeAudio(base64Data, blob.type, fromLang);
              if (res && res.text && res.text.trim()) {
                const finalSpeech = res.text.trim();
                setInputText(baseTextRef.current + finalSpeech);
                onToast('Voice transcribed into text successfully!');
              }
            } catch (err: any) {
              console.warn('Backend audio transcription notice:', err);
            } finally {
              setIsProcessingAudio(false);
              setStatus('Ready');
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setIsProcessingAudio(false);
          setStatus('Ready');
        }
      };

      recorder.start(200);
    } catch (recorderErr) {
      console.warn('MediaRecorder error:', recorderErr);
    }

    // 2. Setup Real-time Web Speech API (shows immediate typing while speaking)
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
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript + ' ';
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          const liveSpeech = (finalTranscript + interimTranscript).trim();
          if (liveSpeech) {
            liveTranscriptRef.current = liveSpeech;
            setInputText(baseTextRef.current + liveSpeech);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Live SpeechRecognition notice:', event?.error);
        };

        recognition.onend = () => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch {}
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
      onToast('Microphone stopped. Converting speech to text...');
    } else {
      startMicrophone();
    }
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
      <div className="hero">
        <div>
          <div className="eyebrow">INSTANT NEURAL TRANSLATION</div>
          <h1>Translate text & speech instantly</h1>
          <p className="subtitle">Speak or type in any language with crystal-clear native audio and high accuracy.</p>
        </div>
      </div>

      <div className="workspace">
        <div className="langrow">
          <select
            className="select"
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

          <button className="swap" id="swap" onClick={handleSwap} title="Swap Languages" type="button">
            ⇄
          </button>

          <select
            className="select"
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

        {/* Live Active Recording Banner */}
        {isListening && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-600 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-red-500 animate-ping"></span>
              <div>
                <span className="text-sm font-extrabold text-red-700 dark:text-red-300 block">
                  🎙️ Recording Voice ({recordingSeconds}s)... Speak now!
                </span>
                <span className="text-xs text-red-500 dark:text-red-400">
                  Your spoken words are being converted directly into the text box.
                </span>
              </div>
            </div>
            <button
              onClick={handleVoiceInput}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95"
              type="button"
            >
              ⏹ Done & Transcribe
            </button>
          </div>
        )}

        {isProcessingAudio && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
            <span className="animate-spin text-base">⏳</span>
            Converting your spoken audio to text with Gemini AI...
          </div>
        )}

        <div className="editorgrid">
          {/* Source Text Panel */}
          <div className="panel">
            <div className="panelhead">
              <span>Original Text</span>
              <span id="count">{inputText.length} / 5000</span>
            </div>
            <div className="panelbody">
              <textarea
                id="input"
                maxLength={5000}
                placeholder="Type text here, or click Speak to talk into your microphone…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ fontSize: fontSizeMap[textSize] }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleTranslate();
                  }
                }}
              />
              <div className="tools">
                <div className="toolgroup">
                  <button
                    className={`mini ${isListening ? 'active-pulse' : ''}`}
                    id="mic"
                    onClick={handleVoiceInput}
                    type="button"
                    aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
                    title={isListening ? 'Stop recording voice' : 'Speak into microphone'}
                  >
                    {isListening ? '⏹ Stop Mic' : '🎤 Speak'}
                  </button>
                  <button
                    className={`mini ${isInputSpeaking ? 'active-pulse' : ''}`}
                    id="listen-input"
                    onClick={handleListenInput}
                    type="button"
                    aria-label={isInputSpeaking ? 'Stop speaking' : 'Listen to text'}
                    title={isInputSpeaking ? 'Stop audio' : 'Listen to original text'}
                  >
                    {isInputSpeaking ? '⏹ Stop' : '🔊 Listen'}
                  </button>
                  <button className="mini" id="clear" onClick={handleClear} type="button" title="Clear text">
                    Clear
                  </button>
                </div>
                <div className="muted">
                  {isListening ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      🔴 Recording voice… Speak into mic
                    </span>
                  ) : isProcessingAudio ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⏳ Transcribing voice…</span>
                  ) : isInputSpeaking ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🔊 Playing text…</span>
                  ) : detectedBadge ? (
                    `Detected: ${detectedBadge}`
                  ) : (
                    'Auto-detect available'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Translation Output Panel */}
          <div className="panel">
            <div className="panelhead">
              <span>Translation</span>
              <span id="status" style={{ color: isTranslating ? 'var(--accent)' : 'inherit' }}>
                {status}
              </span>
            </div>
            <div className="panelbody">
              <div
                className="output"
                id="output"
                style={{
                  fontSize: fontSizeMap[textSize],
                  direction: outputDirection,
                  color: outputText ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {outputText || 'Your translation will appear here.'}
              </div>
              <div className="tools">
                <div className="toolgroup">
                  <button
                    className={`mini ${isSpeaking ? 'active-pulse' : ''}`}
                    id="listen"
                    onClick={handleListen}
                    type="button"
                    aria-label={isSpeaking ? 'Stop speaking' : 'Listen to translation'}
                    title={isSpeaking ? 'Stop audio' : 'Listen to translation'}
                  >
                    {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                  </button>
                  <button className="mini" id="copy" onClick={handleCopy} type="button" title="Copy translation">
                    📋 Copy
                  </button>
                  <button className="mini" id="share" onClick={handleShare} type="button" title="Share translation">
                    ↗ Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="translatebar">
          <button
            className="primary"
            id="translate"
            onClick={handleTranslate}
            disabled={isTranslating || isProcessingAudio || !inputText.trim()}
            type="button"
          >
            {isTranslating ? 'Translating…' : 'Translate'}
          </button>
        </div>
      </div>
    </section>
  );
};
