import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from '../services/apiClient.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';
import { LanguageOption } from '../services/apiClient.ts';

interface CallTranscriptItem {
  id: string;
  speaker: 'Caller 1' | 'Caller 2';
  speakerLang: string;
  targetLang: string;
  originalText: string;
  translatedText: string;
  time: string;
}

interface CallTranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  languages: LanguageOption[];
  onToast: (msg: string) => void;
}

export const CallTranslateModal: React.FC<CallTranslateModalProps> = ({
  isOpen,
  onClose,
  languages,
  onToast,
}) => {
  const [caller1Lang, setCaller1Lang] = useState('English 🇬🇧');
  const [caller2Lang, setCaller2Lang] = useState('Urdu 🇵🇰');
  const [activeSpeaker, setActiveSpeaker] = useState<'Caller 1' | 'Caller 2' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [transcripts, setTranscripts] = useState<CallTranscriptItem[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const activeSpeakerRef = useRef<'Caller 1' | 'Caller 2' | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, currentText]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  if (!isOpen) return null;

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    setActiveSpeaker(null);
    activeSpeakerRef.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const handleSpeakerMicClick = (speaker: 'Caller 1' | 'Caller 2') => {
    if (isListening && activeSpeaker === speaker) {
      stopListening();
      onToast('Listening stopped.');
      return;
    }

    stopListening();
    startListening(speaker);
  };

  const startListening = (speaker: 'Caller 1' | 'Caller 2') => {
    setActiveSpeaker(speaker);
    activeSpeakerRef.current = speaker;
    setIsListening(true);
    isListeningRef.current = true;
    setCurrentText('');

    const srcLang = speaker === 'Caller 1' ? caller1Lang : caller2Lang;
    const tgtLang = speaker === 'Caller 1' ? caller2Lang : caller1Lang;

    onToast(`Listening for ${speaker} (${srcLang})…`);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = async (e: any) => {
        let interim = '';
        let final = '';

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const activeText = (final || interim).trim();
        setCurrentText(activeText);

        if (final.trim()) {
          processSentenceTranslation(final.trim(), speaker, srcLang, tgtLang);
          setCurrentText('');
        }
      };

      recognition.onerror = () => {
        onToast('Speech recognition note: speak clearly into mic.');
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      try {
        recognition.start();
      } catch {
        onToast('Could not start recognition');
      }
    } else {
      onToast('Live browser mic active. Type text if speech recognition unavailable.');
    }
  };

  const processSentenceTranslation = async (
    text: string,
    speaker: 'Caller 1' | 'Caller 2',
    srcLang: string,
    tgtLang: string
  ) => {
    if (!text.trim()) return;
    setIsTranslating(true);

    try {
      const res = await ApiClient.translateText(text, srcLang, tgtLang, 'natural');
      const newItem: CallTranscriptItem = {
        id: Date.now().toString(),
        speaker,
        speakerLang: srcLang,
        targetLang: tgtLang,
        originalText: text,
        translatedText: res.translatedText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTranscripts((prev) => [...prev, newItem]);

      if (autoSpeak && res.translatedText) {
        GlobalAudioPlayer.play(res.translatedText, tgtLang);
      }
    } catch {
      onToast('Call translation network warning.');
    } finally {
      setIsTranslating(false);
    }
  };

  const speakLine = (text: string, langName: string) => {
    GlobalAudioPlayer.play(text, langName);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', letterSpacing: '1px' }}>
              ● LIVE CALL TRANSLATOR
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0' }}>Two-Way Conversation Mode</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '22px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Language Selectors for Caller 1 and Caller 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>CALLER 1 (SPEAKER A)</label>
            <select
              className="select"
              value={caller1Lang}
              onChange={(e) => setCaller1Lang(e.target.value)}
              style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>CALLER 2 (SPEAKER B)</label>
            <select
              className="select"
              value={caller2Lang}
              onChange={(e) => setCaller2Lang(e.target.value)}
              style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Call Transcript Chat Window */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--card)',
            borderRadius: '14px',
            padding: '14px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {transcripts.length === 0 && !currentText && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '30px 10px', fontSize: '13px' }}>
              🎙️ Tap Caller 1 or Caller 2 mic button below to start live call translation.
            </div>
          )}

          {transcripts.map((t) => (
            <div
              key={t.id}
              style={{
                alignSelf: t.speaker === 'Caller 1' ? 'flex-start' : 'flex-end',
                maxWidth: '82%',
                background: t.speaker === 'Caller 1' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${t.speaker === 'Caller 1' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                borderRadius: '12px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
                <span>{t.speaker} ({t.speakerLang})</span>
                <span>{t.time}</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--fg)', fontStyle: 'italic' }}>
                "{t.originalText}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg)' }}>
                  {t.translatedText}
                </span>
                <button
                  onClick={() => speakLine(t.translatedText, t.targetLang)}
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                  title="Speak translation"
                >
                  🔊
                </button>
              </div>
            </div>
          ))}

          {currentText && (
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px', fontStyle: 'italic', color: 'var(--muted)' }}>
              🎙️ {activeSpeaker} speaking: "{currentText}…"
            </div>
          )}

          {isTranslating && (
            <div style={{ fontSize: '12px', color: '#10b981', fontStyle: 'italic' }}>
              ⚡ Translating call audio…
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Controls: Mics & Auto-speak toggle */}
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
              />
              Auto-speak translated audio in call
            </label>

            {transcripts.length > 0 && (
              <button
                onClick={() => setTranscripts([])}
                type="button"
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Call Log
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => handleSpeakerMicClick('Caller 1')}
              type="button"
              className={isListening && activeSpeaker === 'Caller 1' ? 'primary' : ''}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: isListening && activeSpeaker === 'Caller 1' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'var(--card)',
                color: 'var(--fg)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{isListening && activeSpeaker === 'Caller 1' ? '🛑 STOP' : '🎙️ CALLER 1 MIC'}</span>
            </button>

            <button
              onClick={() => handleSpeakerMicClick('Caller 2')}
              type="button"
              className={isListening && activeSpeaker === 'Caller 2' ? 'primary' : ''}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: isListening && activeSpeaker === 'Caller 2' ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--card)',
                color: 'var(--fg)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{isListening && activeSpeaker === 'Caller 2' ? '🛑 STOP' : '🎙️ CALLER 2 MIC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
