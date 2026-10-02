import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, ArrowRightLeft, Sparkles, Check, Copy } from 'lucide-react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface VoiceSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onToast: (msg: string) => void;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  languages,
  onAddHistory,
  onToast,
}) => {
  const [fromLang, setFromLang] = useState('Urdu 🇵🇰');
  const [toLang, setToLang] = useState('English 🇬🇧');
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isSpeakingOriginal, setIsSpeakingOriginal] = useState(false);
  const [isSpeakingTranslation, setIsSpeakingTranslation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);

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
    if (langName.includes('Chinese')) return 'zh-CN';
    if (langName.includes('Japanese')) return 'ja-JP';
    if (langName.includes('Russian')) return 'ru-RU';
    if (langName.includes('Turkish')) return 'tr-TR';
    return 'en-US';
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeakingOriginal(false);
    setIsSpeakingTranslation(false);
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.stop(); } catch { try { rec.abort(); } catch {} }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const startListening = async () => {
    stopAllAudio();
    stopListening();

    audioChunksRef.current = [];
    baseTextRef.current = transcript ? transcript.trim() + ' ' : '';
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
    onToast('Microphone active! Speak now…');

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // 1. MediaRecorder Backup with Gemini STT
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

        if (audioChunksRef.current.length === 0) return;

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 400) return;

        setIsProcessingAudio(true);
        onToast('Transcribing recorded voice with AI...');

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string) || '';
            try {
              const res = await ApiClient.transcribeAudio(base64Data, blob.type, fromLang);
              if (res && res.text && res.text.trim()) {
                setTranscript(baseTextRef.current + res.text.trim());
                onToast('Voice transcription completed.');
              }
            } catch (err: any) {
              console.warn('Voice transcription error:', err);
            } finally {
              setIsProcessingAudio(false);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setIsProcessingAudio(false);
        }
      };

      recorder.start(200);
    } catch (recorderErr) {
      console.warn('MediaRecorder init error:', recorderErr);
    }

    // 2. Real-time Live Web Speech API
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
          let finalStr = '';
          let interimStr = '';

          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item.isFinal) {
              finalStr += item[0].transcript + ' ';
            } else {
              interimStr += item[0].transcript;
            }
          }

          const total = (finalStr + interimStr).trim();
          if (total) {
            setTranscript(baseTextRef.current + total);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event?.error);
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
        console.warn('SpeechRecognition error:', err);
      }
    }
  };

  const toggleListening = () => {
    if (isListeningRef.current) {
      stopListening();
      onToast('Microphone stopped. Transcribing speech...');
    } else {
      startListening();
    }
  };

  const fallbackBrowserVoice = (clean: string, langName: string, isOriginal: boolean) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = getLanguageSpeechCode(langName);

      utterance.onstart = () => {
        if (isOriginal) {
          setIsSpeakingOriginal(true);
        } else {
          setIsSpeakingTranslation(true);
        }
      };

      utterance.onend = () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      utterance.onerror = () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingOriginal(false);
      setIsSpeakingTranslation(false);
    }
  };

  const playVoice = (text: string, langName: string, isOriginal: boolean) => {
    const clean = (text || '').trim();
    if (!clean) {
      onToast('Please enter or speak some text first.');
      return;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if ((isOriginal && isSpeakingOriginal) || (!isOriginal && isSpeakingTranslation)) {
      setIsSpeakingOriginal(false);
      setIsSpeakingTranslation(false);
      onToast('Audio playback stopped.');
      return;
    }

    setIsSpeakingOriginal(false);
    setIsSpeakingTranslation(false);

    try {
      const audioUrl = ApiClient.getTtsAudioUrl(clean, langName);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        if (isOriginal) {
          setIsSpeakingOriginal(true);
          onToast('Playing spoken text aloud...');
        } else {
          setIsSpeakingTranslation(true);
          onToast('Playing translation aloud...');
        }
      };

      audio.onended = () => {
        audioRef.current = null;
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      audio.onerror = () => {
        fallbackBrowserVoice(clean, langName, isOriginal);
      };

      audio.play().catch(() => {
        fallbackBrowserVoice(clean, langName, isOriginal);
      });
    } catch {
      fallbackBrowserVoice(clean, langName, isOriginal);
    }
  };

  const handleTranslate = async () => {
    const textToTranslate = transcript.trim();
    if (!textToTranslate) {
      onToast('Please enter or speak text to translate.');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await ApiClient.translateText(textToTranslate, fromLang, toLang);
      setTranslatedText(result.translatedText);

      onAddHistory({
        id: Date.now().toString(),
        from: fromLang,
        to: toLang,
        input: textToTranslate,
        output: result.translatedText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detectedLang: result.detectedSourceLanguage,
      });

      onToast('Translation completed.');
      playVoice(result.translatedText, toLang, false);
    } catch (err: any) {
      onToast(err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    const tempText = transcript;
    setTranscript(translatedText);
    setTranslatedText(tempText);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    onToast('Copied translation to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      stopListening();
      stopAllAudio();
    };
  }, []);

  return (
    <section className="section active" id="voice-studio">
      <div className="hero">
        <div>
          <div className="eyebrow">VOICE & CONVERSATION STUDIO</div>
          <h1>Voice Translation</h1>
          <p className="subtitle">Speak naturally in any language and listen to instant audio translations.</p>
        </div>
      </div>

      <div className="workspace max-w-4xl mx-auto space-y-6">
        {/* Language Selection Bar */}
        <div className="langrow flex items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Source Language (Speak In)</label>
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="select w-full"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            className="swap mt-4 p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Swap Languages"
            type="button"
          >
            <ArrowRightLeft className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </button>

          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Target Language (Translate To)</label>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="select w-full"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Mic & Speaker Controller Box */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Mic className="w-64 h-64" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Live Voice Recognition</h2>
          <p className="text-emerald-100 text-sm max-w-md mx-auto mb-6">
            Press the button and speak. Your voice will be transcribed in real time and translated aloud.
          </p>

          <div className="flex items-center justify-center gap-6 my-4">
            <button
              onClick={toggleListening}
              type="button"
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 shadow-2xl ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-8 ring-red-400/40 text-white'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-9 h-9" />
                  <span className="text-xs font-extrabold uppercase tracking-wide">Stop & Save</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9" />
                  <span className="text-xs font-extrabold uppercase tracking-wide">Start Mic</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4">
            {isListening ? (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 text-sm font-semibold animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                Recording voice ({recordingSeconds}s)… Speak now
              </span>
            ) : isProcessingAudio ? (
              <span className="text-emerald-200 text-sm font-semibold">⏳ Transcribing recorded voice...</span>
            ) : (
              <span className="text-emerald-200/80 text-xs">Click the microphone button to begin speaking</span>
            )}
          </div>
        </div>

        {/* Live Conversation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spoken Text Panel */}
          <div className="panel bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div className="panelhead p-3.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200">
                <span>Spoken Text</span>
                <span className="text-xs font-medium text-gray-400">{fromLang}</span>
              </div>
              <div className="p-4">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your spoken words will appear here in real time…"
                  className="w-full min-h-[140px] text-gray-800 dark:text-gray-100 bg-transparent text-base border-0 focus:ring-0 p-0 resize-none outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50/70 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <button
                onClick={() => playVoice(transcript, fromLang, true)}
                type="button"
                className={`mini ${isSpeakingOriginal ? 'active-pulse' : ''}`}
                title="Listen to original spoken text"
              >
                <Volume2 className="w-4 h-4 text-emerald-600" />
                {isSpeakingOriginal ? '⏹ Stop' : '🔊 Listen'}
              </button>
              <button
                onClick={() => setTranscript('')}
                type="button"
                className="mini text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Translated Text Panel */}
          <div className="panel bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div className="panelhead p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-between font-bold text-sm text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Translation Output
                </span>
                <span className="text-xs font-medium text-emerald-600">{toLang}</span>
              </div>
              <div className="p-4">
                <div className="min-h-[140px] text-gray-900 dark:text-gray-100 text-base font-medium whitespace-pre-wrap">
                  {translatedText || (
                    <span className="text-gray-400 italic">Translation will appear here and can be played aloud…</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900 flex items-center justify-between gap-2">
              <button
                onClick={() => playVoice(translatedText, toLang, false)}
                type="button"
                disabled={!translatedText}
                className={`mini ${isSpeakingTranslation ? 'active-pulse' : ''} disabled:opacity-50`}
                title="Listen to translated audio"
              >
                <Volume2 className="w-4 h-4 text-emerald-600" />
                {isSpeakingTranslation ? '⏹ Stop' : '🔊 Translation'}
              </button>

              <div className="flex gap-1.5">
                <button
                  onClick={handleCopy}
                  type="button"
                  disabled={!translatedText}
                  className="mini disabled:opacity-50"
                  title="Copy translation text"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Big Translate Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleTranslate}
            disabled={isTranslating || isProcessingAudio || !transcript.trim()}
            type="button"
            className="primary text-base py-3.5 px-8 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {isTranslating ? 'Translating…' : 'Translate & Speak'}
          </button>
        </div>
      </div>
    </section>
  );
};
