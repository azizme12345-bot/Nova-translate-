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

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Voice input requires Google Chrome, Edge or Safari.');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      const lower = fromLang.toLowerCase();
      if (lower.includes('urdu')) recognition.lang = 'ur-PK';
      else if (lower.includes('arabic')) recognition.lang = 'ar-SA';
      else if (lower.includes('punjabi')) recognition.lang = 'pa-IN';
      else if (lower.includes('hindi')) recognition.lang = 'hi-IN';
      else if (lower.includes('spanish')) recognition.lang = 'es-ES';
      else if (lower.includes('french')) recognition.lang = 'fr-FR';
      else if (lower.includes('german')) recognition.lang = 'de-DE';
      else if (lower.includes('japanese')) recognition.lang = 'ja-JP';
      else if (lower.includes('chinese')) recognition.lang = 'zh-CN';
      else recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onToast('Listening… speak into your microphone');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          onToast('Speech recognized!');
        }
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        // Gracefully ignore normal browser cancellations and silence timeouts
        if (e.error === 'aborted' || e.error === 'no-speech') {
          return;
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          onToast('Microphone permission was denied. Please allow mic access in your browser.');
        } else {
          onToast(`Microphone notice: ${e.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch {
      setIsListening(false);
      onToast('Unable to start microphone.');
    }
  };

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
                  <button className="mini" id="mic" onClick={handleVoiceInput} type="button">
                    🎤 Speak
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
        <div className="card" onClick={handleVoiceInput}>
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
