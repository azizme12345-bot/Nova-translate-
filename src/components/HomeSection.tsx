import React, { useState, useEffect, useRef } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { GlobalAudioPlayer, getLanguageSpeechCode } from '../services/audioPlayer.ts';
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

  // Audio Playback State with Long-Text Progress
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
    stopAllAudio();
    stopMicrophone();
    setInputText('');
    setOutputText('');
    setDetectedBadge(null);
    setLiveSpokenText('');
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
  // UNLIMITED LONG-TEXT AUDIO PLAYBACK (TTS)
  // ==========================================
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

  const handleListenInput = () => {
    playSpeech(inputText, fromLang, true, true);
  };

  const handleListen = () => {
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
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        try { rec.abort(); } catch {}
      }
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
    setLiveSpokenText('');
    baseTextRef.current = inputText ? inputText.trim() : '';
    setRecordingSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      onToast('Microphone access denied. Please allow microphone permission in your browser to speak.');
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

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 50) {
          if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
          return;
        }

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
                const combined = baseTextRef.current ? `${baseTextRef.current} ${finalSpeech}` : finalSpeech;
                setInputText(combined);
                setLiveSpokenText(finalSpeech);
                onToast('Voice transcribed into text successfully!');
              } else if (liveCaptured) {
                const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
                setInputText(combined);
              }
            } catch (err: any) {
              console.warn('Backend audio transcription notice:', err);
              if (liveCaptured) {
                const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
                setInputText(combined);
              }
            } finally {
              setIsProcessingAudio(false);
              setStatus('Ready');
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          if (liveCaptured) {
            const combined = baseTextRef.current ? `${baseTextRef.current} ${liveCaptured}` : liveCaptured;
            setInputText(combined);
          }
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

        recognition.onerror = (event: any) => {
          console.warn('Live SpeechRecognition error:', event?.error);
          // If language-not-supported error, retry with default language
          if (event?.error === 'language-not-supported' && isListeningRef.current) {
            try {
              recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
              recognition.start();
            } catch {}
          }
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

        {/* Live Active Audio Speaking Banner for Long Text */}
        {(isSpeaking || isInputSpeaking) && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                🔊 Reading aloud {audioProgressText}... Listen to audio
              </span>
            </div>
            <button
              onClick={stopAllAudio}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm"
              type="button"
            >
              ⏹ Stop Audio
            </button>
          </div>
        )}

        {/* Live Active Recording Banner */}
        {isListening && (
          <div className="mb-3 p-4 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-600 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute"></span>
                <span className="w-3 h-3 rounded-full bg-red-600 relative"></span>
              </div>
              <div>
                <span className="text-sm font-extrabold text-red-700 dark:text-red-300 block">
                  🎙️ Listening ({recordingSeconds}s)... Speak clearly in {fromLang}
                </span>
                <span className="text-xs text-red-600 dark:text-red-400">
                  {liveSpokenText ? (
                    <span className="font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded">
                      "{liveSpokenText}"
                    </span>
                  ) : (
                    'Your spoken words will appear in the text box below in real-time.'
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleVoiceInput}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
              type="button"
            >
              ⏹ Done & Transcribe
            </button>
          </div>
        )}

        {isProcessingAudio && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
            <span className="animate-spin text-base">⏳</span>
            Refining spoken voice into text with AI...
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
                placeholder="Type or paste long text, or click 'Speak' to talk into your microphone…"
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
                    className={`mini ${isListening ? 'active-pulse bg-red-600 text-white border-red-600' : ''}`}
                    id="mic"
                    onClick={handleVoiceInput}
                    type="button"
                    aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
                    title={isListening ? 'Stop recording voice' : 'Speak into microphone'}
                  >
                    {isListening ? '⏹ Stop Mic' : '🎤 Speak'}
                  </button>
                  <button
                    className={`mini ${isInputSpeaking ? 'active-pulse bg-emerald-600 text-white' : ''}`}
                    id="listen-input"
                    onClick={handleListenInput}
                    type="button"
                    aria-label={isInputSpeaking ? 'Stop speaking' : 'Listen to text'}
                    title={isInputSpeaking ? 'Stop audio' : 'Listen to original text'}
                  >
                    {isInputSpeaking ? `⏹ Stop ${audioProgressText}` : '🔊 Listen'}
                  </button>
                  <button className="mini" id="clear" onClick={handleClear} type="button" title="Clear text">
                    Clear
                  </button>
                </div>
                <div className="muted">
                  {isListening ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      🔴 Listening… Speak now
                    </span>
                  ) : isProcessingAudio ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>⏳ Transcribing voice…</span>
                  ) : isInputSpeaking ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🔊 Reading text {audioProgressText}…</span>
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
                    className={`mini ${isSpeaking ? 'active-pulse bg-emerald-600 text-white' : ''}`}
                    id="listen"
                    onClick={handleListen}
                    type="button"
                    aria-label={isSpeaking ? 'Stop speaking' : 'Listen to translation'}
                    title={isSpeaking ? 'Stop audio' : 'Listen to translation'}
                  >
                    {isSpeaking ? `⏹ Stop ${audioProgressText}` : '🔊 Listen'}
                  </button>
                  <button className="mini" id="copy" onClick={handleCopy} type="button" title="Copy translation">
                    📋 Copy
                  </button>
                  <button className="mini" id="share" onClick={handleShare} type="button" title="Share translation">
                    ↗ Share
                  </button>
                </div>
                {isSpeaking && (
                  <div className="muted" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    🔊 Playing translation {audioProgressText}…
                  </div>
                )}
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
