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
        speakText(result.translatedText, toLang);
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

  const speakText = async (textToSpeak: string, targetLanguageName: string) => {
    if (!textToSpeak || textToSpeak === 'Your translation will appear here.') {
      onToast('No translation to read.');
      return;
    }

    // Call backend voice preparation
    const voicePrep = await ApiClient.prepareVoiceSynthesis(textToSpeak, targetLanguageName);

    if (voicePrep.audioBase64) {
      const audio = new Audio(`data:audio/wav;base64,${voicePrep.audioBase64}`);
      audio.play().catch(() => {
        fallbackBrowserSpeak(textToSpeak, targetLanguageName);
      });
      return;
    }

    fallbackBrowserSpeak(textToSpeak, targetLanguageName);
  };

  const fallbackBrowserSpeak = (text: string, langName: string) => {
    if (!('speechSynthesis' in window)) {
      onToast('Voice output is not supported by your browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Map common languages to browser BCP 47 codes
    const lower = langName.toLowerCase();
    if (lower.includes('urdu')) utterance.lang = 'ur-PK';
    else if (lower.includes('arabic')) utterance.lang = 'ar-SA';
    else if (lower.includes('punjabi')) utterance.lang = 'pa-IN';
    else if (lower.includes('hindi')) utterance.lang = 'hi-IN';
    else if (lower.includes('spanish')) utterance.lang = 'es-ES';
    else if (lower.includes('french')) utterance.lang = 'fr-FR';
    else if (lower.includes('german')) utterance.lang = 'de-DE';
    else if (lower.includes('japanese')) utterance.lang = 'ja-JP';
    else if (lower.includes('chinese')) utterance.lang = 'zh-CN';
    else utterance.lang = 'en-US';

    window.speechSynthesis.speak(utterance);
    onToast('Reading aloud…');
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const isListeningRef = React.useRef<boolean>(false);

  const getSpeechLanguage = (language: string): string => {
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

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Speech recognition stop error:', error);
      }
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);
  };

  const startSpeechRecognition = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Voice input is not supported in this browser.');
      return;
    }

    if (isListeningRef.current || recognitionRef.current) {
      stopSpeechRecognition();
      return;
    }

    // Request microphone access beforehand to prompt user cleanly if needed
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          console.warn('Microphone permission denied:', err.name);
          onToast('Microphone permission was denied. Please allow microphone access in your browser settings.');
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = getSpeechLanguage(fromLang);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      isListeningRef.current = true;
      setIsListening(true);

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        onToast('Listening… speak into your microphone');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript.trim()) {
          setInputText(transcript);
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
          onToast('Microphone stopped.');
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

  const handleVoiceInput = async () => {
    if (isListeningRef.current || recognitionRef.current) {
      stopSpeechRecognition();
    } else {
      await startSpeechRecognition();
    }
  };

  React.useEffect(() => {
    return () => {
      stopSpeechRecognition();
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
                    onClick={() => speakText(outputText, toLang)}
                    type="button"
                  >
                    🔊 Listen
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
