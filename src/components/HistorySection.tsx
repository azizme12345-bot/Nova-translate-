import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '../types.ts';
import { ApiClient } from '../services/apiClient.ts';

interface HistorySectionProps {
  history: HistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onToast: (msg: string) => void;
  onUseItem: (item: HistoryItem) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onRemoveItem,
  onClearAll,
  onToast,
  onUseItem,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setPlayingId(null);
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

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

  const playSpeech = (text: string, langName: string, identifier: string) => {
    const clean = (text || '').trim();
    if (!clean) return;

    if (playingId === identifier) {
      stopAudio();
      onToast('Audio playback stopped.');
      return;
    }

    stopAudio();

    try {
      const audioUrl = ApiClient.getTtsAudioUrl(clean, langName);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setPlayingId(identifier);
        onToast('Playing audio aloud...');
      };

      audio.onended = () => {
        audioRef.current = null;
        setPlayingId(null);
      };

      audio.onerror = () => {
        fallbackBrowserVoice(clean, langName, identifier);
      };

      audio.play().catch(() => {
        fallbackBrowserVoice(clean, langName, identifier);
      });
    } catch {
      fallbackBrowserVoice(clean, langName, identifier);
    }
  };

  const fallbackBrowserVoice = (clean: string, langName: string, identifier: string) => {
    if (!('speechSynthesis' in window)) {
      setPlayingId(null);
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = getLanguageSpeechCode(langName);

      utterance.onstart = () => {
        setPlayingId(identifier);
      };

      utterance.onend = () => {
        setPlayingId(null);
      };

      utterance.onerror = () => {
        setPlayingId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setPlayingId(null);
    }
  };

  const handleExportHistory = () => {
    if (history.length === 0) {
      onToast('No history items to export.');
      return;
    }

    const content = history
      .map(
        (item, idx) =>
          `[${idx + 1}] ${item.time}\nRoute: ${item.from} -> ${item.to}\nOriginal: ${item.input}\nTranslation: ${item.output}\n----------------------------------------\n`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-translation-history-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('History exported successfully.');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied to clipboard.');
  };

  return (
    <section className="section active" id="history">
      <div className="hero flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow">SAVED TRANSLATIONS</div>
          <h1>Translation History</h1>
          <p className="subtitle">View, listen, re-use, and export your recent translations.</p>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              className="mini py-2 px-3 bg-white font-semibold shadow-sm hover:border-emerald-500"
              onClick={handleExportHistory}
              type="button"
              title="Download history as a text file"
            >
              📥 Export History
            </button>
            <button
              className="primary text-sm py-2 px-4"
              id="clearHistory"
              onClick={() => {
                onClearAll();
                onToast('Translation history cleared.');
              }}
              type="button"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      <div id="historyList">
        {history.length === 0 ? (
          <div className="workspace" style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 20px' }}>
            <div className="text-4xl mb-3">📖</div>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>No translation history yet</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Translations you perform will be saved here automatically.</p>
          </div>
        ) : (
          history.map((item) => (
            <div className="historyitem bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm mb-3.5 transition-all hover:border-emerald-500" key={item.id}>
              <div className="flex-1">
                <div className="route text-xs font-extrabold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center justify-between">
                  <span>{item.from} → {item.to}</span>
                  <span className="font-normal" style={{ color: 'var(--muted)' }}>{item.time}</span>
                </div>

                {/* Original Text Row */}
                <div className="htxt flex items-center justify-between gap-3 font-semibold py-1 text-base" style={{ color: 'var(--text)' }}>
                  <span className="break-words flex-1">{item.input}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className={`mini text-xs py-1 px-2.5 ${playingId === `in-${item.id}` ? 'active-pulse' : ''}`}
                      onClick={() => playSpeech(item.input, item.from, `in-${item.id}`)}
                      title="Listen to original text"
                      type="button"
                    >
                      {playingId === `in-${item.id}` ? '⏹ Stop' : '🔊 Listen'}
                    </button>
                    <button
                      className="mini text-xs py-1 px-2"
                      onClick={() => handleCopyText(item.input)}
                      title="Copy original text"
                      type="button"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Translation Output Row */}
                <div className="flex items-center justify-between gap-3 font-extrabold text-base mt-2 pt-2 border-t border-[var(--border)]" style={{ color: 'var(--primary2)' }}>
                  <span className="break-words flex-1">{item.output}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className={`mini text-xs py-1 px-2.5 ${playingId === `out-${item.id}` ? 'active-pulse' : ''}`}
                      onClick={() => playSpeech(item.output, item.to, `out-${item.id}`)}
                      title="Listen to translation"
                      type="button"
                    >
                      {playingId === `out-${item.id}` ? '⏹ Stop' : '🔊 Translation'}
                    </button>
                    <button
                      className="mini text-xs py-1 px-2"
                      onClick={() => handleCopyText(item.output)}
                      title="Copy translation"
                      type="button"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Use in Translator & Delete */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[var(--border)] justify-end">
                <button
                  className="mini text-xs font-extrabold text-emerald-800 dark:text-emerald-300 border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 py-1.5 px-3"
                  onClick={() => onUseItem(item)}
                  type="button"
                  title="Load this text and languages back into the main translator"
                >
                  🔁 Use in Translator
                </button>
                <button
                  className="mini text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:border-red-300 py-1.5 px-2.5"
                  onClick={() => {
                    onRemoveItem(item.id);
                    onToast('History item removed.');
                  }}
                  type="button"
                  title="Delete item from history"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
