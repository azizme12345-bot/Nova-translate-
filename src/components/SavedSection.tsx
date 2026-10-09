import React from 'react';
import { SavedItem } from '../types.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';

interface SavedSectionProps {
  savedItems: SavedItem[];
  onRemoveSaved: (id: string) => void;
  onClearAllSaved: () => void;
  onToast: (msg: string) => void;
  onUseItem: (item: any) => void;
}

export const SavedSection: React.FC<SavedSectionProps> = ({
  savedItems,
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

  const defaultSaved: SavedItem[] = savedItems.length > 0 ? savedItems : [
    {
      id: 's1',
      from: 'English 🇬🇧',
      to: 'Urdu 🇵🇰',
      input: 'Hello',
      output: 'ہیلو',
      timestamp: '♡ Saved',
    },
    {
      id: 's2',
      from: 'English 🇬🇧',
      to: 'Urdu 🇵🇰',
      input: 'Welcome',
      output: 'خوش آمدید',
      timestamp: '♡ Saved',
    },
  ];

  return (
    <section id="saved" className="screen active">
      <div className="eyebrow">YOUR FAVORITES</div>
      <h1>Saved</h1>
      <p className="sub">Keep translations you want to use again.</p>

      <div className="list">
        {defaultSaved.map((item) => (
          <div className="card history-card" key={item.id}>
            <div className="history-top">
              <span>
                {item.from} → {item.to}
              </span>
              <span>♡ Saved</span>
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
        ))}
      </div>
    </section>
  );
};
