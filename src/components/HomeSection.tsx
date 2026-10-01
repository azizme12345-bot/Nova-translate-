import React, { useState } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface HomeSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onNavigate: (page: 'camera' | 'history' | 'settings') => void;
  onToast: (msg: string) => void;
  autoDetectEnabled: boolean;
  voiceOutputEnabled: boolean;
  textSize: 'small' | 'medium' | 'large';
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  languages,
  onAddHistory,
  onNavigate,
  onToast,
  autoDetectEnabled,
  voiceOutputEnabled,
  textSize,
}) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [fromLang, setFromLang] = useState('Urdu 🇵🇰');
  const [toLang, setToLang] = useState('English 🇬🇧');
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const [status, setStatus] = useState<'Ready' | 'Translating…'>('Ready');
  const [isTranslating, setIsTranslating] = useState(false);
  const [outputDirection, setOutputDirection] = useState<'ltr' | 'rtl'>('ltr');

  const handleSwap = () => {
    if (fromLang.startsWith('Auto-detect')) {
      onToast('Select a specific language to swap.');
      return;
    }
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);

    // If there is existing output text, swap it to input
    if (outputText && outputText !== 'Your translation will appear here.') {
      setInputText(outputText);
      setOutputText(inputText);
    }
  };

  const handleTranslate = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      onToast('Please enter text first.');
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

      onToast('Translation completed.');

      // Auto-voice output if enabled in settings
      if (voiceOutputEnabled) {
        playSpeech(result.translatedText, toLang, false);
      }
    } catch (err: any) {
      setStatus('Ready');
      onToast(err.message || 'Translation failed. Check backend configuration.');
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
      onToast('Copied to clipboard');
    } catch {
      onToast('Failed to copy');
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
        // Share cancelled or failed
      }
    } else {
      await handleCopy();
      onToast('Share is not supported; copied text instead.');
    }
  };

  // ==========================================
  // TEXT TO SPEECH (LISTEN) IMPLEMENTATION
  // ==========================================
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = React.useRef<boolean>(false);
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const speechResumeIntervalRef = React.useRef<any>(null);

  const clearResumeInterval = () => {
    if (speechResumeIntervalRef.current) {
      clearInterval(speechResumeIntervalRef.current);
      speechResumeIntervalRef.current = null;
    }
  };

  // Asynchronously populate and update browser voices
  React.useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const populateVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
        }
      } catch (err) {
        console.warn('Speech synthesis voice retrieval notice:', err);
      }
    };

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    return () => {
      clearResumeInterval();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getTargetSpeechLanguage = (language: string): string => {
    if (!language) return 'en-US';

    if (language.includes('Urdu')) return 'ur-PK';
    if (language.includes('English')) return 'en-US';
    if (language.includes('Punjabi')) return 'pa-PK';
    if (language.includes('Arabic')) return 'ar-SA';
    if (language.includes('Hindi')) return 'hi-IN';
    if (language.includes('Japanese')) return 'ja-JP';
    if (language.includes('Chinese')) return 'zh-CN';
    if (language.includes('French')) return 'fr-FR';
    if (language.includes('German')) return 'de-DE';
    if (language.includes('Spanish')) return 'es-ES';

    return 'en-US';
  };

  const playSpeech = (text: string, targetLanguageName: string, showToastOnStart = true) => {
    if (!('speechSynthesis' in window)) {
      onToast('Voice output is not supported by your browser.');
      return;
    }

    // 1. Read actual translated text from output
    const cleanText = (text || '').trim();

    // 2. Do not read placeholder text
    // 3. If there is no translated text, show "Please translate some text first."
    if (!cleanText || cleanText === 'Your translation will appear here.') {
      onToast('Please translate some text first.');
      return;
    }

    // Cancel any ongoing speech cleanly
    clearResumeInterval();
    const wasActive = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    if (wasActive) {
      window.speechSynthesis.cancel();
    }

    // On Android Chrome, a small delay (50ms) after cancel ensures the native audio queue is ready
    setTimeout(() => {
      try {
        // 5. Use the TARGET language, not the source language
        const langCode = getTargetSpeechLanguage(targetLanguageName);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utteranceRef.current = utterance; // Prevent garbage collection on Android Chrome

        utterance.lang = langCode;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // 6. Use speechSynthesis.getVoices()
        let voices = voicesRef.current;
        if (!voices || voices.length === 0) {
          try {
            voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
              voicesRef.current = voices;
            }
          } catch {
            // ignore
          }
        }

        // 8. Find exact matching voice when available
        // 9. If exact voice is unavailable, find a language-prefix match (e.g., ur-PK -> ur)
        if (voices && voices.length > 0) {
          const normalizedTarget = langCode.toLowerCase().replace('_', '-');
          const prefix = normalizedTarget.split('-')[0];

          const exactVoice = voices.find(
            (v) => v.lang && v.lang.toLowerCase().replace('_', '-') === normalizedTarget
          );

          if (exactVoice) {
            utterance.voice = exactVoice;
            utterance.lang = exactVoice.lang;
          } else {
            const prefixVoice = voices.find(
              (v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(prefix)
            );
            if (prefixVoice) {
              utterance.voice = prefixVoice;
              utterance.lang = prefixVoice.lang;
            }
          }
        }

        // 12. Handle onstart, onend, onerror
        utterance.onstart = () => {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          if (showToastOnStart) onToast('Reading aloud…');

          // Keep-alive timer for Android Chrome (prevents freezing on longer texts)
          clearResumeInterval();
          speechResumeIntervalRef.current = setInterval(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            } else {
              clearResumeInterval();
            }
          }, 5000);
        };

        utterance.onend = () => {
          clearResumeInterval();
          utteranceRef.current = null;
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        };

        utterance.onerror = (e: any) => {
          clearResumeInterval();
          utteranceRef.current = null;
          isSpeakingRef.current = false;
          setIsSpeaking(false);

          const errType = e?.error || 'unknown';
          if (errType === 'canceled' || errType === 'interrupted') {
            return; // Normal stop/cancel
          }
          console.warn('Speech synthesis playback notice:', errType);
          if (errType === 'language-unavailable' || errType === 'synthesis-unavailable') {
            onToast('Voice for this language is not installed on this device.');
          } else {
            onToast('Voice playback notice: ' + errType);
          }
        };

        window.speechSynthesis.speak(utterance);
        // Force-resume on Android Chrome to overcome autoplay/idle freeze
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        clearResumeInterval();
        utteranceRef.current = null;
        console.warn('Speech synthesis speak error:', err);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onToast('Could not play speech on this device.');
      }
    }, wasActive ? 50 : 0);
  };

  const handleListen = () => {
    if (!('speechSynthesis' in window)) {
      onToast('Voice output is not supported by your browser.');
      return;
    }

    // 13. If Listen is already speaking and user presses Listen again, stop/cancel current speech
    if (isSpeakingRef.current || window.speechSynthesis.speaking) {
      clearResumeInterval();
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onToast('Speech stopped.');
      return;
    }

    playSpeech(outputText, toLang, true);
  };

  // ==========================================
  // SPEECH TO TEXT (MICROPHONE) IMPLEMENTATION
  // ==========================================
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const isListeningRef = React.useRef<boolean>(false);

  const getSpeechLanguage = (language: string): string => {
    if (!language) return 'ur-PK';

    if (language.includes('Auto')) {
      if (detectedBadge && detectedBadge.includes('English')) return 'en-US';
      return 'ur-PK'; // default source in Nova Translate is Urdu
    }

    if (language.includes('Urdu')) return 'ur-PK';
    if (language.includes('English')) return 'en-US';
    if (language.includes('Punjabi')) return 'pa-PK';
    if (language.includes('Arabic')) return 'ar-SA';
    if (language.includes('Hindi')) return 'hi-IN';
    if (language.includes('Japanese')) return 'ja-JP';
    if (language.includes('Chinese')) return 'zh-CN';
    if (language.includes('French')) return 'fr-FR';
    if (language.includes('German')) return 'de-DE';
    if (language.includes('Spanish')) return 'es-ES';

    return 'en-US';
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      // Detach listeners before aborting to prevent zombie callbacks from resetting state
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch (error) {
        console.warn('Speech recognition abort notice:', error);
      }
    }
    isListeningRef.current = false;
    setIsListening(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Voice input is not supported in this browser.');
      return;
    }

    // Clean up any stale or previous recognition instance
    stopSpeechRecognition();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = getSpeechLanguage(fromLang);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        onToast('Listening… speak into your microphone');
      };

      // Accumulate all segments from index 0 so Android Chrome doesn't erase previous words
      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        if (fullTranscript.trim()) {
          setInputText(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const errorName = event.error || 'unknown';
        console.warn('Speech recognition notice:', errorName);
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;

        if (errorName === 'not-allowed') {
          onToast('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (errorName === 'no-speech') {
          onToast('No speech detected. Please try again.');
        } else if (errorName === 'network') {
          onToast('Speech recognition network error. Please try again.');
        } else if (errorName === 'audio-capture') {
          onToast('No microphone was detected on this device.');
        } else if (errorName === 'aborted') {
          // Normal stop/cancel, do not alarm user
        } else {
          onToast('Microphone error: ' + errorName);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (error: any) {
      console.warn('Speech recognition start error:', error);
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      if (error?.name === 'NotAllowedError') {
        onToast('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else {
        onToast('Could not start the microphone. Please try again.');
      }
    }
  };

  const handleVoiceInput = () => {
    if (isListeningRef.current || recognitionRef.current) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  React.useEffect(() => {
    return () => {
      stopSpeechRecognition();
      clearResumeInterval();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fontSizeMap = {
    small: '16px',
    medium: '18px',
    large: '22px',
  };

  return (
    <section className="section active" id="home">
      <div className="hero">
        <div>
          <div className="eyebrow">AI POWERED TRANSLATION</div>
          <h1>Translate your world.</h1>
          <p className="subtitle">Fast, simple and natural translation for text, voice and images.</p>
        </div>
        <span className="pill">100+ languages ready</span>
      </div>

      <div className="workspace">
        <div className="langrow">
          <select
            className="select"
            id="from"
            value={fromLang}
            onChange={(e) => {
              setFromLang(e.target.value);
              setDetectedBadge(null);
            }}
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

        <div className="editorgrid">
          {/* Source Text Panel */}
          <div className="panel">
            <div className="panelhead">
              <span>Original</span>
              <span id="count">{inputText.length} / 5000</span>
            </div>
            <div className="panelbody">
              <textarea
                id="input"
                maxLength={5000}
                placeholder="Type or speak something…"
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
                    className="mini"
                    id="mic"
                    onClick={handleVoiceInput}
                    type="button"
                    aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
                  >
                    {isListening ? '⏹ Stop' : '🎤 Speak'}
                  </button>
                  <button className="mini" id="clear" onClick={handleClear} type="button">
                    Clear
                  </button>
                </div>
                <div className="muted">
                  {detectedBadge ? `Detected: ${detectedBadge}` : 'Auto-detect available'}
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
                    className="mini"
                    id="listen"
                    onClick={handleListen}
                    type="button"
                    aria-label={isSpeaking ? 'Stop speaking' : 'Listen to translation'}
                  >
                    {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                  </button>
                  <button className="mini" id="copy" onClick={handleCopy} type="button">
                    📋 Copy
                  </button>
                  <button className="mini" id="share" onClick={handleShare} type="button">
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
            disabled={isTranslating || !inputText.trim()}
            type="button"
          >
            ✈ {isTranslating ? 'Translating…' : 'Translate'}
          </button>
        </div>
      </div>

      <div className="quick">
        <button
          data-fill="السلام علیکم، آپ کیسے ہیں؟"
          onClick={() => {
            setFromLang('Urdu 🇵🇰');
            setToLang('English 🇬🇧');
            setInputText('السلام علیکم، آپ کیسے ہیں؟');
          }}
          type="button"
        >
          Urdu → English
        </button>
        <button
          data-fill="How are you today?"
          onClick={() => {
            setFromLang('English 🇬🇧');
            setToLang('Urdu 🇵🇰');
            setInputText('How are you today?');
          }}
          type="button"
        >
          English → Urdu
        </button>
        <button
          data-fill="السلام عليكم، كيف حالك؟"
          onClick={() => {
            setFromLang('Arabic 🇸🇦');
            setToLang('English 🇬🇧');
            setInputText('السلام عليكم، كيف حالك؟');
          }}
          type="button"
        >
          Arabic → English
        </button>
      </div>

      <div className="cards">
        <div
          className="card"
          onClick={() => {
            const el = document.getElementById('input');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
            }
            handleVoiceInput();
          }}
        >
          <div>🎤</div>
          <h3>Voice Translation</h3>
          <p>Speak naturally and prepare voice input for instant translation.</p>
        </div>
        <div className="card" onClick={() => onNavigate('camera')}>
          <div>📷</div>
          <h3>Camera & Image</h3>
          <p>Scan text from images. Powered by backend AI OCR.</p>
        </div>
        <div
          className="card"
          onClick={() => {
            handleSwap();
            onToast('Conversation mode ready: languages swapped.');
          }}
        >
          <div>💬</div>
          <h3>Conversation Mode</h3>
          <p>Quickly swap back and forth to conduct bilingual dialogue.</p>
        </div>
      </div>
    </section>
  );
};
