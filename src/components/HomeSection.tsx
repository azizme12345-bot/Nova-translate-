import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { GlobalAudioPlayer, getSavedVoiceGender, setSavedVoiceGender, VoiceGender } from '../services/audioPlayer.ts';
import { AudioCompressor } from '../services/audioCompressor.ts';
import { HistoryItem, SavedItem, ActivePage } from '../types.ts';

interface HomeSectionProps {
  activeScreen?: 'home' | 'translate';
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onAddSaved: (item: SavedItem) => void;
  onNavigate: (page: ActivePage) => void;
  onToast: (msg: string) => void;
  autoDetectEnabled?: boolean;
  voiceOutputEnabled?: boolean;
  loadedItem: HistoryItem | null;
  onClearLoadedItem: () => void;
  onOpenCallModal?: () => void;
  onOpenApiKeyModal?: () => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  languages,
  onAddHistory,
  onAddSaved,
  onNavigate,
  onToast,
  voiceOutputEnabled = true,
  loadedItem,
  onClearLoadedItem,
  onOpenCallModal,
  onOpenApiKeyModal,
}) => {
  const [fromLang, setFromLang] = useState('English 🇬🇧');
  const [toLang, setToLang] = useState('Urdu 🇵🇰');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('Translation will appear here...');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingField, setSpeakingField] = useState<'source' | 'target' | null>(null);
  const [isSplit, setIsSplit] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(() => getSavedVoiceGender());

  // Refs for speech recognition & recorder
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<number | null>(null);
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

  const isSourceUrdu = fromLang.includes('Urdu') || fromLang.includes('Arabic') || fromLang.includes('Punjabi');
  const isTargetUrdu = toLang.includes('Urdu') || toLang.includes('Arabic') || toLang.includes('Punjabi');

  const handleSwap = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    if (outputText && outputText !== 'Translation will appear here...' && outputText !== 'Translating...') {
      const prevInput = inputText;
      const prevOutput = outputText;
      setInputText(prevOutput);
      setOutputText(prevInput || 'Translation will appear here...');
    }
    onToast('Languages swapped');
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('Translation will appear here...');
    setConfidence(null);
    onToast('Text cleared');
  };

  const handleCopyInput = () => {
    if (!inputText.trim()) return;
    navigator.clipboard.writeText(inputText);
    onToast('Copied source text');
  };

  const handleCopyOutput = () => {
    if (!outputText || outputText === 'Translation will appear here...' || outputText === 'Translating...') return;
    navigator.clipboard.writeText(outputText);
    onToast('Translation copied!');
  };

  const handleShareOutput = async () => {
    if (!outputText || outputText === 'Translation will appear here...' || outputText === 'Translating...') return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nova Translator',
          text: `${inputText}\n\n${outputText}`,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(outputText);
    onToast('Translation copied to share');
  };

  const handleSaveOutput = () => {
    if (!outputText || outputText === 'Translation will appear here...' || outputText === 'Translating...') return;
    onAddSaved({
      id: Date.now().toString(),
      from: fromLang,
      to: toLang,
      input: inputText.trim() || 'Hello',
      output: outputText,
      timestamp: '♡ Saved',
    });
  };

  // --------------------------------------------------------------------------
  // AUDIO PLAYBACK / TTS LISTENING
  // --------------------------------------------------------------------------
  const handleSpeak = (text: string, langName: string, field: 'source' | 'target') => {
    const clean = text.trim();
    if (!clean || clean === 'Translation will appear here...' || clean === 'Translating...') {
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

  // --------------------------------------------------------------------------
  // TRANSLATION EXECUTION
  // --------------------------------------------------------------------------
  const executeTranslation = useCallback(
    async (textToTranslate: string, srcLang: string, tgtLang: string, autoSpeak = false) => {
      const trimmed = textToTranslate.trim();
      if (!trimmed) {
        setOutputText('Translation will appear here...');
        setConfidence(null);
        return;
      }

      setIsTranslating(true);
      try {
        const res = await ApiClient.translateText(trimmed, srcLang, tgtLang, 'natural');
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
        const fallbackMsg = err.message || 'Translation failed. Please check your Gemini API Key.';
        setOutputText(fallbackMsg);
        onToast(fallbackMsg);
      } finally {
        setIsTranslating(false);
      }
    },
    [onAddHistory, onToast, voiceOutputEnabled]
  );

  // Debounced auto-translate on typing
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

  // --------------------------------------------------------------------------
  // MICROPHONE SPEECH RECOGNITION
  // --------------------------------------------------------------------------
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

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getSpeechLangCode(fromLang);

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          const clean = transcript.trim();
          if (clean) {
            liveRecognized = true;
            setInputText(clean);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = window.setTimeout(() => {
              executeTranslation(clean, fromLang, toLang, false);
            }, 400);
          }
        };

        recognition.start();
      } catch {}
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (recognitionRef.current) {
        isListeningRef.current = true;
        setIsListening(true);
        onToast('🎙️ سن رہے ہیں... بولنا شروع کریں');
        return;
      }
      onToast('مائیکروفون اس ڈیوائس پر سپورٹ نہیں کرتا');
      return;
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
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
          recognitionRef.current = null;
        }
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0 && !liveRecognized) {
          onToast('🎙️ آواز کو ٹیکسٹ میں بدلا جا رہا ہے...');
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
              onToast('ترجمہ مکمل ہو گیا!');
            } else {
              onToast('کوئی آواز نہیں سنی گئی۔ دوبارہ کوشش کریں۔');
            }
          } catch (err: any) {
            onToast(err.message || 'صوتی ترجمہ میں خرابی');
          }
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      isListeningRef.current = true;
      setIsListening(true);
      onToast('🎙️ بولنا شروع کریں... بند کرنے کے لیے دوبارہ مائیک دبائیں');

      // Auto stop after 3.5 seconds for fast response
      setTimeout(() => {
        if (isListeningRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 3500);

    } catch (err) {
      if (recognitionRef.current) {
        isListeningRef.current = true;
        setIsListening(true);
        onToast('🎙️ سن رہے ہیں... بولنا شروع کریں');
        return;
      }
      console.warn('Microphone permission error:', err);
      onToast('مائیکروفون کی اجازت درکار ہے۔');
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-20px)] bg-[#f0f0f0] text-gray-800 -m-2 sm:-m-4 relative">
      {/* Top Main Green Header: Exactly starts with ENGLISH ↔ URDU as requested */}
      <div className="bg-[#2e7d32] text-white px-4 py-3 flex justify-between items-center shadow-md select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-2xl hover:bg-white/10 px-2 py-0.5 rounded-lg transition cursor-pointer"
            title="Menu & Options"
          >
            ≡
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base sm:text-lg">
              {fromLang.toUpperCase().split(' ')[0]} ↔ {toLang.toUpperCase().split(' ')[0]}
            </span>
            <span className="text-[11px] bg-emerald-900/60 text-emerald-100 px-2 py-0.5 rounded-full font-medium hidden xs:inline-block">
              {isTargetUrdu ? 'انگریزی ↔ اردو' : 'URDU ↔ ENGLISH'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Language Swap in Header */}
          <button
            type="button"
            onClick={handleSwap}
            className="p-1.5 hover:bg-white/15 rounded-lg transition text-base"
            title="Swap Languages"
          >
            ⇅
          </button>

          {/* Toggle Split/Stacked View */}
          <div
            className="cursor-pointer flex flex-col gap-1 p-2 hover:bg-white/10 rounded-lg transition"
            onClick={() => setIsSplit(!isSplit)}
            title="Toggle Split View"
          >
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts with Install App */}
      <div className="bg-white px-4 py-2 text-xs text-gray-700 border-b border-gray-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
          <span className="text-emerald-600 font-bold"></span>
          <span></span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => {
              const promptEvent = (window as any).deferredPrompt;
              if (promptEvent) {
                promptEvent.prompt();
                promptEvent.userChoice.then((choiceResult: any) => {
                  if (choiceResult.outcome === 'accepted') {
                    (window as any).deferredPrompt = null;
                  }
                });
              } else {
                onToast('براہ کرم براؤزر مینو سے "Add to Home Screen" منتخب کریں۔');
              }
            }}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            📥 Install App
          </button>
          <button
            type="button"
            onClick={() => onNavigate('image')}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            📸 Scan Camera
          </button>
        </div>
      </div>

      {/* Real-time Listening Waveform Banner */}
      {isListening && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs flex items-center justify-between animate-pulse shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            <span className="font-bold">
              🎙️ Listening ({fromLang.split(' ')[0]})… Speak now!
            </span>
          </div>
          <button
            type="button"
            onClick={stopMicrophone}
            className="bg-white text-red-600 font-bold px-3 py-0.5 rounded-full text-xs shadow hover:bg-gray-100"
          >
            Stop Mic
          </button>
        </div>
      )}

      {/* Main Translation Cards Form */}
      <form
        id="translateForm"
        onSubmit={handleFormSubmit}
        className={`flex-1 flex flex-col md:${isSplit ? 'flex-row' : 'flex-col'} p-3 sm:p-4 gap-3 transition-all duration-300`}
      >
        {/* Source Text Box */}
        <div className="bg-white rounded-xl p-4 flex-1 relative border border-gray-200 shadow-sm flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#2e7d32] font-bold text-xs uppercase tracking-wide">
                {fromLang}
              </span>
              <select
                value={fromLang}
                onChange={(e) => {
                  setFromLang(e.target.value);
                  if (inputText.trim()) executeTranslation(inputText, e.target.value, toLang, false);
                }}
                className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-700 focus:outline-none focus:border-emerald-600 mr-10"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.label}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              id="inputText"
              maxLength={5000}
              value={inputText}
              dir={isSourceUrdu ? 'rtl' : 'ltr'}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`w-full h-28 pr-12 bg-transparent resize-none border-0 focus:outline-none text-base text-gray-800 placeholder-gray-400 ${
                isSourceUrdu ? 'font-urdu text-lg leading-relaxed' : ''
              }`}
              placeholder="Tap to enter text or speak with mic..."
            />
          </div>

          {/* Right Floating Actions for Source (shifted up so Clear Text is 100% unobstructed and visible) */}
          <div className="absolute right-3 top-2.5 sm:top-3 flex flex-col gap-1.5 z-10">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={isListening ? stopMicrophone : startMicrophone}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-red-600 animate-pulse ring-4 ring-red-300'
                  : 'bg-[#2e7d32] hover:bg-emerald-700'
              }`}
              title={isListening ? 'Stop Microphone' : 'Voice Input (Microphone)'}
            >
              🎤
            </button>

            {/* Camera Scanner Button */}
            <button
              type="button"
              onClick={() => onNavigate('image')}
              className="w-8 h-8 rounded-full bg-[#2e7d32] hover:bg-emerald-700 text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer"
              title="Camera Scanner / Image OCR"
            >
              📷
            </button>

            {/* Speak Source Button */}
            <button
              type="button"
              onClick={() => handleSpeak(inputText, fromLang, 'source')}
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer ${
                speakingField === 'source'
                  ? 'bg-amber-600 animate-bounce'
                  : 'bg-[#2e7d32] hover:bg-emerald-700'
              }`}
              title="Listen to source audio"
            >
              🔊
            </button>

            {/* Copy Source */}
            <button
              type="button"
              onClick={handleCopyInput}
              className="w-8 h-8 rounded-full bg-[#2e7d32] hover:bg-emerald-700 text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer"
              title="Copy Source Text"
            >
              ⎘
            </button>
          </div>

          {/* Footer Bar for Source - Clear Text is fully visible and clearly separated */}
          <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-100 mt-auto relative z-20">
            <span>{inputText.length} / 5000</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-600 hover:text-red-600 font-semibold cursor-pointer px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Clear Text
            </button>
          </div>
        </div>

        {/* Center Control Buttons */}
        <div className="flex justify-center items-center gap-3 my-0.5">
          <button
            type="submit"
            disabled={isTranslating}
            className="w-12 h-12 bg-[#2e7d32] hover:bg-emerald-700 text-white rounded-full flex items-center justify-center text-lg shadow-md cursor-pointer transition disabled:opacity-50 transform active:scale-95"
            title="Translate Now"
          >
            {isTranslating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              '➤'
            )}
          </button>
          <button
            type="button"
            onClick={handleSwap}
            className="w-12 h-12 bg-[#2e7d32] hover:bg-emerald-700 text-white rounded-full flex items-center justify-center text-lg shadow-md cursor-pointer transition transform active:scale-95"
            title="Swap Languages"
          >
            ⇅
          </button>
        </div>

        {/* Target Text Box */}
        <div className="bg-white rounded-xl p-4 flex-1 relative border border-gray-200 shadow-sm flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#2e7d32] font-bold text-xs uppercase tracking-wide">
                {toLang}
              </span>
              <div className="flex items-center gap-2 mr-10">
                {confidence && (
                  <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                    {Math.round(confidence * 100)}% Match
                  </span>
                )}
                <select
                  value={toLang}
                  onChange={(e) => {
                    setToLang(e.target.value);
                    if (inputText.trim()) executeTranslation(inputText, fromLang, e.target.value, false);
                  }}
                  className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-700 focus:outline-none focus:border-emerald-600"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              id="outputText"
              dir={isTargetUrdu && outputText !== 'Translation will appear here...' && outputText !== 'Translating...' ? 'rtl' : 'ltr'}
              className={`w-full h-28 pr-12 overflow-y-auto text-base text-gray-800 select-text ${
                isTargetUrdu && outputText !== 'Translation will appear here...' && outputText !== 'Translating...'
                  ? 'font-urdu text-lg leading-relaxed'
                  : ''
              }`}
            >
              {isTranslating ? (
                <div className="flex items-center gap-2 text-emerald-700 font-medium animate-pulse">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  Translating smoothly with AI...
                </div>
              ) : (
                outputText
              )}
            </div>
          </div>

          {/* Right Floating Actions for Target (shifted up so Share Translation is 100% unobstructed and visible) */}
          <div className="absolute right-3 top-2.5 sm:top-3 flex flex-col gap-1.5 z-10">
            {/* Save to Favorites */}
            <button
              type="button"
              onClick={handleSaveOutput}
              className="w-8 h-8 rounded-full bg-[#2e7d32] hover:bg-emerald-700 text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer"
              title="Save to Favorites"
            >
              ♥
            </button>

            {/* Split / Expand */}
            <button
              type="button"
              onClick={() => setIsSplit(!isSplit)}
              className="w-8 h-8 rounded-full bg-[#2e7d32] hover:bg-emerald-700 text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer"
              title="Toggle Split View"
            >
              ⮀
            </button>

            {/* Listen / Speak Target Output */}
            <button
              type="button"
              onClick={() => handleSpeak(outputText, toLang, 'target')}
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer ${
                speakingField === 'target'
                  ? 'bg-amber-600 animate-bounce'
                  : 'bg-[#2e7d32] hover:bg-emerald-700'
              }`}
              title="Listen to translation"
            >
              🔊
            </button>

            {/* Copy Output */}
            <button
              type="button"
              onClick={handleCopyOutput}
              className="w-8 h-8 rounded-full bg-[#2e7d32] hover:bg-emerald-700 text-white flex items-center justify-center text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer"
              title="Copy Translation"
            >
              ⎘
            </button>
          </div>

          {/* Footer Bar for Target - Share Translation is fully visible and clearly separated */}
          <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-100 mt-auto relative z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="cursor-pointer hover:text-emerald-700 font-medium text-gray-600"
              >
                Options & History
              </button>
            </div>
            <button
              type="button"
              onClick={handleShareOutput}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer px-2 py-1 rounded hover:bg-emerald-50 transition"
            >
              Share Translation
            </button>
          </div>
        </div>
      </form>

      {/* Side Slide-Over Drawer for Menu & Options (replaces clutter on top) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative bg-white w-72 max-w-[85vw] h-full shadow-2xl flex flex-col p-5 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="font-bold text-[#2e7d32] text-lg">Nova Options</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
              {/* API Key Modal Shortcut */}
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  if (onOpenApiKeyModal) onOpenApiKeyModal();
                }}
                className="flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-900 font-semibold text-sm transition text-left"
              >
                <span className="text-lg">🔑</span>
                <div>
                  <div>Gemini API Key</div>
                  <div className="text-[11px] text-emerald-700 font-normal">
                    {ApiClient.getCustomApiKey() ? 'Custom Key Active' : 'Configure Custom Key'}
                  </div>
                </div>
              </button>

              {/* Voice Gender Setting */}
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span>🗣️</span>
                  <span className="font-medium text-gray-700">TTS Voice:</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenderToggle}
                  className="bg-emerald-700 text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs hover:bg-emerald-800 transition"
                >
                  {voiceGender === 'female' ? 'Female 👩' : 'Male 👨'}
                </button>
              </div>

              {/* Live Call Translation */}
              {onOpenCallModal && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenCallModal();
                  }}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-800 font-semibold text-sm transition text-left"
                >
                  <span className="text-lg">📞</span>
                  <div>
                    <div>Live Call Translation</div>
                    <div className="text-[11px] text-gray-500 font-normal">
                      Two-way continuous dialogue
                    </div>
                  </div>
                </button>
              )}

              {/* Camera Scanner */}
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onNavigate('image');
                }}
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-800 font-semibold text-sm transition text-left"
              >
                <span className="text-lg">📸</span>
                <div>
                  <div>Camera Scanner</div>
                  <div className="text-[11px] text-gray-500 font-normal">
                    Point camera & translate signs/text
                  </div>
                </div>
              </button>

              {/* Clear History & Text */}
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setDrawerOpen(false);
                }}
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-800 font-medium text-sm transition text-left mt-auto"
              >
                <span className="text-lg">🗑️</span>
                <span>Clear Current Text</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-400 text-center border-t border-gray-100 pt-3">
              NOVA AI TRANSLATOR • FAST & INTEL
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
