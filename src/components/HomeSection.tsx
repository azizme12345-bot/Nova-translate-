import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { GlobalAudioPlayer, getSavedVoiceGender, setSavedVoiceGender, VoiceGender } from '../services/audioPlayer.ts';
import { AudioCompressor } from '../services/audioCompressor.ts';
import { HistoryItem, SavedItem, ActivePage } from '../types.ts';
import { AppLanguage } from '../services/i18n.ts';

interface HomeSectionProps {
  activeScreen?: 'home' | 'translate';
  languages: LanguageOption[];
  history?: HistoryItem[];
  onAddHistory: (item: HistoryItem) => void;
  onDeleteHistoryItem?: (id: string) => void;
  onClearHistory?: () => void;
  onAddSaved: (item: SavedItem) => void;
  onNavigate: (page: ActivePage) => void;
  onToast: (msg: string) => void;
  voiceOutputEnabled?: boolean;
  loadedItem: HistoryItem | null;
  onClearLoadedItem: () => void;
  onOpenCallModal?: () => void;
  onOpenApiKeyModal?: () => void;
  lang?: AppLanguage;
  onToggleLang?: () => void;
}

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';

export const HomeSection: React.FC<HomeSectionProps> = ({
  languages,
  history = [],
  onAddHistory,
  onDeleteHistoryItem,
  onClearHistory,
  onAddSaved,
  onNavigate,
  onToast,
  voiceOutputEnabled = true,
  loadedItem,
  onClearLoadedItem,
}) => {
  const [fromLang, setFromLang] = useState('English 🇬🇧');
  const [toLang, setToLang] = useState('Urdu 🇵🇰');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState(PLACEHOLDER_OUTPUT);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingField, setSpeakingField] = useState<'source' | 'target' | null>(null);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => getSavedVoiceGender());
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Refs for speech recognition & recorder
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Populate loaded item if coming from History/Saved/Camera
  useEffect(() => {
    if (loadedItem) {
      setFromLang(loadedItem.from || 'English 🇬🇧');
      setToLang(loadedItem.to || 'Urdu 🇵🇰');
      setInputText(loadedItem.input || '');
      setOutputText(loadedItem.output || '');
      setConfidence(0.99);
      onClearLoadedItem();
    }
  }, [loadedItem, onClearLoadedItem]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      GlobalAudioPlayer.stop();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const isSourceRTL =
    fromLang.includes('Urdu') ||
    fromLang.includes('Arabic') ||
    fromLang.includes('Punjabi') ||
    fromLang.includes('Hebrew') ||
    fromLang.includes('Persian');

  const isTargetRTL =
    toLang.includes('Urdu') ||
    toLang.includes('Arabic') ||
    toLang.includes('Punjabi') ||
    toLang.includes('Hebrew') ||
    toLang.includes('Persian');

  const handleSwap = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    if (outputText && outputText !== PLACEHOLDER_OUTPUT && outputText !== 'Translating...') {
      const prevInput = inputText;
      const prevOutput = outputText;
      setInputText(prevOutput);
      setOutputText(prevInput || PLACEHOLDER_OUTPUT);
    }
    onToast('Languages swapped');
  };

  const handleClear = () => {
    setInputText('');
    setOutputText(PLACEHOLDER_OUTPUT);
    setConfidence(null);
    onToast('Text cleared');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        executeTranslation(text, fromLang, toLang, false);
        onToast('Text pasted from clipboard');
      }
    } catch {
      onToast('Unable to read clipboard. Please paste manually.');
    }
  };

  const handleCopyInput = () => {
    if (!inputText.trim()) return;
    navigator.clipboard.writeText(inputText);
    onToast('Copied source text');
  };

  const handleCopyOutput = () => {
    if (!outputText || outputText === PLACEHOLDER_OUTPUT || outputText === 'Translating...') return;
    navigator.clipboard.writeText(outputText);
    onToast('Translation copied!');
  };

  const handleShareOutput = async () => {
    if (!outputText || outputText === PLACEHOLDER_OUTPUT || outputText === 'Translating...') return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LAFZ Translation',
          text: `${inputText}\n\n${outputText}`,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(outputText);
    onToast('Translation copied to share');
  };

  const handleSaveOutput = () => {
    if (!outputText || outputText === PLACEHOLDER_OUTPUT || outputText === 'Translating...') return;
    onAddSaved({
      id: Date.now().toString(),
      from: fromLang,
      to: toLang,
      input: inputText.trim() || 'Translation item',
      output: outputText,
      timestamp: '♡ Saved',
    });
  };

  const handleSpeak = (text: string, langName: string, field: 'source' | 'target') => {
    const clean = text.trim();
    if (!clean || clean === PLACEHOLDER_OUTPUT || clean === 'Translating...') {
      onToast('No text to speak');
      return;
    }

    if (speakingField === field) {
      GlobalAudioPlayer.stop();
      setSpeakingField(null);
      return;
    }

    GlobalAudioPlayer.stop();
    setSpeakingField(field);
    onToast(`Speaking in ${langName.split(' ')[0]}…`);

    GlobalAudioPlayer.play(
      clean,
      langName,
      {
        onStart: () => setSpeakingField(field),
        onEnd: () => setSpeakingField(null),
        onError: () => setSpeakingField(null),
      },
      voiceGender
    );
  };

  const executeTranslation = useCallback(
    async (textToTranslate: string, srcLang: string, tgtLang: string, autoSpeak = false) => {
      const trimmed = textToTranslate.trim();
      if (!trimmed) {
        setOutputText(PLACEHOLDER_OUTPUT);
        setConfidence(null);
        return;
      }

      setIsTranslating(true);
      try {
        const res = await ApiClient.translateText(trimmed, srcLang, tgtLang, 'natural', 'gemini-1.5-flash');
        const finalOut = res.translatedText || '';
        setOutputText(finalOut);
        setConfidence(res.confidence || 0.99);

        onAddHistory({
          id: Date.now().toString(),
          from: srcLang,
          to: tgtLang,
          input: trimmed,
          output: finalOut,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        if (autoSpeak && voiceOutputEnabled && finalOut) {
          handleSpeak(finalOut, tgtLang, 'target');
        }
      } catch (err: any) {
        const fallbackMsg = err.message || 'Translation failed. Please try again.';
        setOutputText(fallbackMsg);
        onToast(fallbackMsg);
      } finally {
        setIsTranslating(false);
      }
    },
    [onAddHistory, onToast, voiceOutputEnabled]
  );

  const handleInputChange = (val: string) => {
    setInputText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length > 1) {
      debounceTimerRef.current = window.setTimeout(() => {
        executeTranslation(val, fromLang, toLang, false);
      }, 350);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeTranslation(inputText, fromLang, toLang, false);
  };

  const getSpeechLangCode = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('ur') || l.includes('urdu')) return 'ur-PK';
    if (l.includes('en') || l.includes('english')) return 'en-US';
    if (l.includes('ar') || l.includes('arabic')) return 'ar-SA';
    if (l.includes('hi') || l.includes('hindi')) return 'hi-IN';
    if (l.includes('pa') || l.includes('punjabi')) return 'pa-IN';
    if (l.includes('es') || l.includes('spanish')) return 'es-ES';
    if (l.includes('fr') || l.includes('french')) return 'fr-FR';
    if (l.includes('de') || l.includes('german')) return 'de-DE';
    if (l.includes('ja') || l.includes('japanese')) return 'ja-JP';
    return 'en-US';
  };

  const stopMicrophone = () => {
    isListeningRef.current = false;
    setIsListening(false);

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

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const startMicrophone = async () => {
    if (isListeningRef.current) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      stopMicrophone();
      return;
    }

    let liveRecognized = false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = getSpeechLangCode(fromLang);
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsListening(true);
          onToast(`🎙️ Listening in ${fromLang.split(' ')[0]}... Speak clearly!`);
        };

        recognition.onresult = (event: any) => {
          liveRecognized = true;
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setInputText(currentTranscript);
            if (event.results[event.results.length - 1].isFinal) {
              executeTranslation(currentTranscript, fromLang, toLang, false);
            }
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e);
          if (e.error === 'not-allowed') {
            onToast('Microphone permission denied.');
            stopMicrophone();
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
              isListeningRef.current = false;
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Web Speech API failed, falling back to MediaRecorder:', err);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        isListeningRef.current = false;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0 && !liveRecognized) {
          onToast('🎙️ Converting speech to text...');
          try {
            const compressed = await AudioCompressor.compressAudioBlob(blob);
            const stt = await ApiClient.speechToText({
              audioBase64: compressed.base64,
              mimeType: compressed.mimeType,
              sourceLanguage: fromLang,
              targetLanguage: toLang,
            });
            const transcribed = stt.transcript || stt.text || '';
            if (transcribed) {
              setInputText(transcribed);
              if (stt.translatedText) {
                setOutputText(stt.translatedText);
                setConfidence(0.99);
                onAddHistory({
                  id: Date.now().toString(),
                  from: fromLang,
                  to: toLang,
                  input: transcribed,
                  output: stt.translatedText,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              } else {
                await executeTranslation(transcribed, fromLang, toLang, false);
              }
              onToast('Translation complete!');
            } else {
              onToast('No speech detected. Please try again.');
            }
          } catch (err: any) {
            onToast(err.message || 'Error in voice translation');
          }
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start(400);
      isListeningRef.current = true;
      setIsListening(true);
      onToast('🎙️ Start speaking... Tap mic again to stop');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        onToast('Microphone permission is required.');
      } else {
        console.warn('Microphone error:', err);
        onToast('Error accessing microphone.');
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const handleGenderToggle = () => {
    const next: VoiceGender = voiceGender === 'female' ? 'male' : 'female';
    setVoiceGender(next);
    setSavedVoiceGender(next);
    GlobalAudioPlayer.setVoiceGender(next);
    onToast(`Voice set to ${next === 'female' ? 'Female' : 'Male'}`);
  };

  const filteredHistory = history.filter((item) => {
    if (!historySearchTerm) return true;
    const term = historySearchTerm.toLowerCase();
    return (
      item.input.toLowerCase().includes(term) ||
      item.output.toLowerCase().includes(term) ||
      item.from.toLowerCase().includes(term) ||
      item.to.toLowerCase().includes(term)
    );
  });

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-8 min-w-0">
      {/* Hero Intro */}
      <section className="text-center w-full max-w-2xl mx-auto flex flex-col items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#eaf2fc] text-[#1d5fb8] shadow-xs max-w-full">
          <span className="w-2 h-2 rounded-full bg-[#14a085] shrink-0"></span>
          <span>English • Urdu • 100+ Languages</span>
        </span>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0f2a4a] tracking-tight leading-tight w-full max-w-full break-words"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Simple Language Translation
        </h1>
        <p className="text-sm sm:text-base text-[#6b7a8f] font-medium w-full max-w-lg break-words">
          Type, speak, or scan to translate between English, Urdu, and 100+ languages.
        </p>
      </section>

      {/* Main Translation Workspace Card */}
      <div className="lafz-card p-4 sm:p-7 transition-all duration-300">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 min-w-0 w-full">
          {/* Top Language Selectors & Primary Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e3eaf3] min-w-0 w-full">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto min-w-0">
              {/* Source Language Select */}
              <select
                id="sourceLang"
                value={fromLang}
                onChange={(e) => {
                  setFromLang(e.target.value);
                  if (inputText.trim()) executeTranslation(inputText, e.target.value, toLang, false);
                }}
                className="lafz-select flex-1 sm:flex-initial min-w-0 max-w-full text-xs sm:text-sm font-semibold cursor-pointer"
                aria-label="Source Language"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>

              {/* Swap Button */}
              <button
                id="swapLang"
                type="button"
                onClick={handleSwap}
                className="shrink-0 border border-[#e3eaf3] bg-[#fafcfe] hover:bg-[#eaf2fc] text-[#1d5fb8] rounded-xl p-2.5 sm:px-3 sm:py-2 text-sm font-bold transition transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
                title="Swap Languages"
                aria-label="Swap Languages"
              >
                ⇄ <span className="hidden sm:inline text-xs font-semibold">Swap</span>
              </button>

              {/* Target Language Select */}
              <select
                id="targetLang"
                value={toLang}
                onChange={(e) => {
                  setToLang(e.target.value);
                  if (inputText.trim()) executeTranslation(inputText, fromLang, e.target.value, false);
                }}
                className="lafz-select flex-1 sm:flex-initial min-w-0 max-w-full text-xs sm:text-sm font-semibold cursor-pointer"
                aria-label="Target Language"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Translate Button */}
            <button
              id="translateBtn"
              type="submit"
              disabled={isTranslating}
              className="lafz-primary-btn w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer sm:ml-auto"
            >
              {isTranslating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <span>Translate</span>
                  <span className="text-xs opacity-80">↵</span>
                </>
              )}
            </button>
          </div>

          {/* Translation Dual-Panel Workspace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0 w-full">
            {/* Left: Source Input Panel */}
            <div className="min-w-0 w-full border border-[#e3eaf3] bg-[#fafcfe] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[260px] focus-within:border-[#2f7de0] focus-within:shadow-xs transition">
              <div className="flex flex-col flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between gap-2 text-xs text-[#6b7a8f] font-semibold mb-2 min-w-0">
                  <span className="truncate">Source ({fromLang.split(' ')[0]})</span>
                  {isListening && (
                    <span className="text-red-600 font-bold flex items-center gap-1.5 animate-pulse shrink-0">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                      Listening...
                    </span>
                  )}
                </div>

                <textarea
                  id="sourceText"
                  maxLength={5000}
                  value={inputText}
                  dir={isSourceRTL ? 'rtl' : 'ltr'}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter text to translate or tap microphone to speak..."
                  className={`w-full min-w-0 flex-1 bg-transparent resize-none border-0 focus:outline-none text-base text-[#16263b] placeholder-[#8996a5] min-h-[140px] leading-relaxed ${
                    isSourceRTL ? 'font-urdu text-lg' : ''
                  }`}
                  aria-label="Source Text Input"
                />
              </div>

              {/* Source Bottom Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e3eaf3]/70 mt-3 text-xs min-w-0 w-full">
                <span id="charCount" className="text-[#8996a5] font-medium select-none shrink-0">
                  {inputText.length} / 5,000
                </span>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <button
                    id="micBtn"
                    type="button"
                    onClick={isListening ? stopMicrophone : startMicrophone}
                    className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition cursor-pointer shadow-xs ${
                      isListening
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-white border border-[#e3eaf3] text-[#1d5fb8] hover:bg-[#eaf2fc]'
                    }`}
                    title={isListening ? 'Stop microphone' : 'Speak into microphone'}
                  >
                    <span>🎙️</span>
                    <span className="hidden sm:inline">{isListening ? 'Stop' : 'Speak'}</span>
                  </button>

                  <button
                    id="pasteBtn"
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] text-[#55657b] hover:text-[#1d5fb8] hover:bg-[#eaf2fc] transition cursor-pointer shadow-xs"
                    title="Paste from clipboard"
                  >
                    📋 <span className="hidden sm:inline">Paste</span>
                  </button>

                  <button
                    id="sourceListenBtn"
                    type="button"
                    onClick={() => handleSpeak(inputText, fromLang, 'source')}
                    className={`px-2.5 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] transition cursor-pointer shadow-xs ${
                      speakingField === 'source'
                        ? 'text-amber-600 bg-amber-50 border-amber-300'
                        : 'text-[#55657b] hover:text-[#1d5fb8] hover:bg-[#eaf2fc]'
                    }`}
                    title="Listen to pronunciation"
                  >
                    🔊
                  </button>

                  {inputText && (
                    <button
                      id="clearBtn"
                      type="button"
                      onClick={handleClear}
                      className="px-2.5 py-1.5 rounded-xl font-semibold text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Clear text"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Output Translation Panel */}
            <div className="min-w-0 w-full border border-[#e3eaf3] bg-white rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[260px] shadow-xs">
              <div className="flex flex-col flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between gap-2 text-xs mb-2 min-w-0">
                  <span className="text-[#6b7a8f] font-semibold truncate">
                    Translation ({toLang.split(' ')[0]})
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {confidence && (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        {Math.round(confidence * 100)}% Match
                      </span>
                    )}
                    <span
                      id="resultStatus"
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        isTranslating
                          ? 'bg-amber-100 text-amber-800'
                          : outputText && outputText !== PLACEHOLDER_OUTPUT
                          ? 'bg-blue-100 text-[#1d5fb8]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isTranslating ? 'Translating...' : outputText && outputText !== PLACEHOLDER_OUTPUT ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                </div>

                <div
                  id="output"
                  dir={isTargetRTL && outputText !== PLACEHOLDER_OUTPUT ? 'rtl' : 'ltr'}
                  className={`w-full min-w-0 flex-1 overflow-y-auto break-words text-base text-[#16263b] select-text min-h-[140px] leading-relaxed ${
                    isTargetRTL && outputText !== PLACEHOLDER_OUTPUT ? 'font-urdu text-lg' : ''
                  }`}
                  aria-live="polite"
                >
                  {isTranslating ? (
                    <div className="flex items-center gap-2 text-[#1d5fb8] font-medium py-4 animate-pulse">
                      <span className="w-4 h-4 border-2 border-[#1d5fb8] border-t-transparent rounded-full animate-spin shrink-0"></span>
                      <span>Translating smoothly with AI...</span>
                    </div>
                  ) : outputText === PLACEHOLDER_OUTPUT ? (
                    <span className="text-[#8996a5] italic select-none">
                      Translation will appear here...
                    </span>
                  ) : (
                    outputText
                  )}
                </div>
              </div>

              {/* Target Bottom Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e3eaf3]/70 mt-3 text-xs min-w-0 w-full">
                <button
                  type="button"
                  onClick={handleGenderToggle}
                  className="text-xs text-[#6b7a8f] hover:text-[#1d5fb8] font-semibold flex items-center gap-1 cursor-pointer transition shrink-0"
                  title="Toggle voice gender"
                >
                  🗣️ <span className="hidden sm:inline">{voiceGender === 'female' ? 'Female' : 'Male'}</span>
                </button>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <button
                    id="copyBtn"
                    type="button"
                    onClick={handleCopyOutput}
                    className="px-3 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] text-[#1d5fb8] hover:bg-[#eaf2fc] transition cursor-pointer shadow-xs flex items-center gap-1"
                    title="Copy translation"
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">Copy</span>
                  </button>

                  <button
                    id="listenBtn"
                    type="button"
                    onClick={() => handleSpeak(outputText, toLang, 'target')}
                    className={`px-3 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] transition cursor-pointer shadow-xs flex items-center gap-1 ${
                      speakingField === 'target'
                        ? 'text-amber-600 bg-amber-50 border-amber-300'
                        : 'text-[#1d5fb8] hover:bg-[#eaf2fc]'
                    }`}
                    title="Listen to translation"
                  >
                    <span>🔊</span>
                    <span className="hidden sm:inline">Listen</span>
                  </button>

                  <button
                    id="saveBtn"
                    type="button"
                    onClick={handleSaveOutput}
                    className="px-2.5 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] text-[#55657b] hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer shadow-xs"
                    title="Save to favorites"
                  >
                    ⭐
                  </button>

                  <button
                    type="button"
                    onClick={handleShareOutput}
                    className="px-2.5 py-1.5 rounded-xl font-semibold bg-white border border-[#e3eaf3] text-[#55657b] hover:text-[#1d5fb8] hover:bg-[#eaf2fc] transition cursor-pointer shadow-xs"
                    title="Share translation"
                  >
                    ↗
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Feature Jump Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        <button
          type="button"
          onClick={() => onNavigate('image')}
          className="min-w-0 w-full p-4 bg-white border border-[#e3eaf3] rounded-2xl hover:border-[#2f7de0] hover:shadow-md transition text-left flex flex-col gap-1.5 cursor-pointer group"
        >
          <span className="text-2xl transition group-hover:scale-110">📸</span>
          <span className="font-bold text-sm text-[#0f2a4a] break-words">Camera OCR</span>
          <span className="text-xs text-[#6b7a8f] break-words">Scan photos &amp; menus</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('voice-translation')}
          className="min-w-0 w-full p-4 bg-white border border-[#e3eaf3] rounded-2xl hover:border-[#2f7de0] hover:shadow-md transition text-left flex flex-col gap-1.5 cursor-pointer group"
        >
          <span className="text-2xl transition group-hover:scale-110">🎙️</span>
          <span className="font-bold text-sm text-[#0f2a4a] break-words">Voice Mode</span>
          <span className="text-xs text-[#6b7a8f] break-words">Speak &amp; converse</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('languages')}
          className="min-w-0 w-full p-4 bg-white border border-[#e3eaf3] rounded-2xl hover:border-[#2f7de0] hover:shadow-md transition text-left flex flex-col gap-1.5 cursor-pointer group"
        >
          <span className="text-2xl transition group-hover:scale-110">🌐</span>
          <span className="font-bold text-sm text-[#0f2a4a] break-words">100+ Languages</span>
          <span className="text-xs text-[#6b7a8f] break-words">Explore all dialects</span>
        </button>

        <button
          id="historyJump"
          type="button"
          onClick={() => {
            const el = document.getElementById('historySection');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else onNavigate('history');
          }}
          className="min-w-0 w-full p-4 bg-white border border-[#e3eaf3] rounded-2xl hover:border-[#2f7de0] hover:shadow-md transition text-left flex flex-col gap-1.5 cursor-pointer group"
        >
          <span className="text-2xl transition group-hover:scale-110">🕒</span>
          <span className="font-bold text-sm text-[#0f2a4a] break-words">Recent History</span>
          <span className="text-xs text-[#6b7a8f] break-words">{history.length} saved entries</span>
        </button>
      </section>

      {/* Embedded History Section */}
      <section id="historySection" className="lafz-card p-4 sm:p-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#e3eaf3] min-w-0 w-full">
          <div className="min-w-0">
            <h2
              className="text-xl font-bold text-[#0f2a4a]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Recent Translations
            </h2>
            <p className="text-xs text-[#6b7a8f]">
              Saved securely on your device for instant offline review.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <input
              id="historySearch"
              type="text"
              placeholder="Search history..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="text-xs border border-[#e3eaf3] rounded-xl px-3 py-1.5 bg-[#fafcfe] text-[#16263b] focus:outline-none focus:border-[#2f7de0] flex-1 min-w-0 sm:w-44"
            />
            {history.length > 0 && onClearHistory && (
              <button
                id="clearHistory"
                type="button"
                onClick={onClearHistory}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div id="historyList" className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1 min-w-0 w-full">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-[#8996a5] text-sm">
              {history.length === 0
                ? 'No translations recorded yet. Enter text or use voice to get started.'
                : 'No matching history entries found.'}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="w-full min-w-0 p-3.5 bg-[#fafcfe] border border-[#e3eaf3] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#2f7de0] transition"
              >
                <div className="w-full sm:flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-[#6b7a8f] font-semibold flex-wrap">
                    <span>{item.from.split(' ')[0]}</span>
                    <span>→</span>
                    <span className="text-[#1d5fb8]">{item.to.split(' ')[0]}</span>
                    {item.time && <span className="opacity-60">• {item.time}</span>}
                  </div>
                  <div className="text-sm font-medium text-[#16263b] truncate w-full">
                    {item.input}
                  </div>
                  <div className="text-xs text-[#55657b] truncate font-medium w-full">
                    {item.output}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setFromLang(item.from);
                      setToLang(item.to);
                      setInputText(item.input);
                      setOutputText(item.output);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      onToast('Loaded into translator');
                    }}
                    className="text-xs font-bold text-[#1d5fb8] bg-white border border-[#e3eaf3] hover:bg-[#eaf2fc] px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Use
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.output);
                      onToast('Translation copied!');
                    }}
                    className="text-xs font-semibold text-[#55657b] hover:text-[#1d5fb8] bg-white border border-[#e3eaf3] px-2.5 py-1 rounded-lg transition cursor-pointer"
                    title="Copy translation"
                  >
                    Copy
                  </button>

                  {onDeleteHistoryItem && (
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryItem(item.id)}
                      className="text-xs text-gray-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                      title="Delete from history"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Informational Guide */}
      <article
        id="homeGuide"
        aria-label="About LAFZ Translation Guide"
        className="lafz-card p-5 sm:p-7 flex flex-col gap-5"
      >
        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            What LAFZ Translation Is
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            LAFZ Translation is a free, straightforward web interface built to translate everyday words, sentences, and short paragraphs across English, Urdu, and over 100 global languages. All text translations are performed on our server through the connected translation service, so there are no accounts to register and no downloads required to begin. Whether you are reading an article, writing a message, or checking an unfamiliar phrase, everything loads in one clean screen. LAFZ Translation is an independent interface and is not affiliated with Google or any other translation provider.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            How to Translate Text Step by Step
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Start by picking your source language in the left dropdown menu and your target language in the right dropdown menu, or tap Swap to reverse both directions at once. Next, type your text or tap Paste to insert copied text into the source box. Click Translate or pause briefly for the translated wording to appear in the output box, where you can copy, save, or clear your text in a single tap.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Voice Input, Spoken Output, and Camera OCR
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            If you prefer speaking over typing, tap Speak and allow microphone access in your browser. When voice input records audio from your microphone, that audio is sent to the server to convert your speech into text for translation. Tap Listen next to the result to hear spoken output powered by your browser and device speech features. To translate printed menus, street signs, receipts, or documents, open Camera OCR to pick an image and send it to the server so its text can be extracted and translated.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Language Choices, History, and Helpful Tips
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Right-to-left scripts such as Urdu, Arabic, and Punjabi align properly on the page so text remains easy to read. Your recent translations are saved locally in your browser&apos;s localStorage and are not synced between devices, and you can search or clear entries whenever you want. For better results, use clear spelling, standard punctuation, and short complete sentences rather than slang or heavy abbreviations. Because translations are generated automatically by a machine, they may not always be perfect, so please check important wording carefully before sharing it.
          </p>
        </section>
      </article>
    </div>
  );
};
