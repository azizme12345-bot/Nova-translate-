import React from 'react';
import { HistoryItem } from '../types.ts';
import { ApiClient } from '../services/apiClient.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';

interface HistorySectionProps {
  history: HistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onToast: (msg: string) => void;
  onUseItem: (item: HistoryItem) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onClearAll,
  onToast,
  onUseItem,
}) => {
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied');
  };

  const handlePlaySpeech = (text: string, langName: string) => {
    if (!text) return;
    GlobalAudioPlayer.stop();
    onToast('Speaking…');
    GlobalAudioPlayer.play(text, langName, {
      onEnd: () => {},
      onError: () => {},
    });
  };

  return (
    <section id="history" className="screen active">
      <div className="eyebrow">YOUR ACTIVITY</div>
      <h1>
        History{' '}
        <button
          className="iconbtn"
          style={{ float: 'right' }}
          onClick={() => {
            onClearAll();
            onToast('History cleared');
          }}
          type="button"
          title="Clear all history"
        >
          ⌫
        </button>
      </h1>
      <p className="sub">Your recent translations appear here.</p>

      <div className="list">
        {history.length === 0 ? (
          <div className="card history-card text-center p-8">
            <p className="text-muted text-xs">No history items yet. Start translating!</p>
          </div>
        ) : (
          history.map((item) => (
            <div className="card history-card" key={item.id}>
              <div className="history-top">
                <span>
                  <strong>{item.from}</strong> → <strong>{item.to}</strong>
                </span>
                <span>{item.time || 'Today • 15:51'}</span>
              </div>

              <div className="history-text">
                {item.input} → {item.output}
              </div>

              <div className="history-actions">
                <span>
                  <button
                    type="button"
                    onClick={() => handlePlaySpeech(item.output, item.to)}
                    title="Speak"
                  >
                    🔊
                  </button>{' '}
                  &nbsp;{' '}
                  <button
                    type="button"
                    onClick={() => handleCopyText(item.output)}
                    title="Copy"
                  >
                    ▢ Copy
                  </button>
                </span>

                <button
                  type="button"
                  onClick={() => onUseItem(item)}
                  title="Translate again"
                >
                  Translate →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
