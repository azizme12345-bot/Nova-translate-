import React, { useEffect } from 'react';
import { HistoryItem } from '../types.ts';
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
  onRemoveItem,
  onClearAll,
  onToast,
  onUseItem,
}) => {
  useEffect(() => {
    document.title = 'Translation History & Activity Log — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Review and replay your recent English, Urdu, and multilingual translations stored privately on your device. Fast export, audio pronunciation, and history management.'
      );
    }
  }, []);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied to clipboard');
  };

  const handlePlaySpeech = (text: string, langName: string) => {
    if (!text) return;
    GlobalAudioPlayer.stop();
    onToast('Playing pronunciation…');
    GlobalAudioPlayer.play(text, langName, {
      onEnd: () => {},
      onError: () => {},
    });
  };

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="text-xs sm:text-sm font-bold text-[#1d5fb8] hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          ← Back to Translator
        </a>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onClearAll();
              onToast('Translation history cleared');
            }}
            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            Clear All History
          </button>
        )}
      </div>

      <article className="lafz-card p-4 sm:p-7 flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-4">
          <span className="text-xs font-bold text-[#1d5fb8] tracking-wider uppercase mb-1 block">
            Client-Side Privacy Log
          </span>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Your Translation History
          </h1>
          <p className="text-sm text-[#6b7a8f] leading-relaxed">
            LAFZ Translation stores your recent activity locally in your browser for quick access, offline replay, and privacy protection.
          </p>
        </header>

        {/* Feature Highlights Grid */}
        <section aria-label="History Features" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] min-w-0">
            <div className="text-xl mb-1">🔒</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-0.5">100% Private</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Saved strictly in local device storage.
            </p>
          </div>

          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] min-w-0">
            <div className="text-xl mb-1">🔊</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-0.5">Instant Audio</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Listen to pronunciations anytime.
            </p>
          </div>

          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] min-w-0">
            <div className="text-xl mb-1">⚡</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-0.5">One-Click Reuse</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Load past translations right back into the editor.
            </p>
          </div>
        </section>

        {/* Translation Items List */}
        <div className="flex flex-col gap-3 min-w-0 w-full">
          <h2
            className="text-base font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Stored History Entries ({history.length})
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-12 text-[#8996a5] text-sm bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
              No translations recorded yet. Start translating to build your history log.
            </div>
          ) : (
            <div className="flex flex-col gap-3 min-w-0 w-full">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="w-full min-w-0 p-4 bg-[#fafcfe] border border-[#e3eaf3] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#2f7de0] transition"
                >
                  <div className="w-full sm:flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#6b7a8f] font-semibold flex-wrap">
                      <span>{item.from}</span>
                      <span>→</span>
                      <span className="text-[#1d5fb8] font-bold">{item.to}</span>
                      {item.time && <span className="opacity-60">• {item.time}</span>}
                    </div>

                    <div className="text-sm font-semibold text-[#16263b] mt-1 select-text break-words">
                      {item.input}
                    </div>

                    <div className="text-sm text-[#55657b] font-medium select-text break-words">
                      {item.output}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onUseItem(item)}
                      className="text-xs font-bold text-[#1d5fb8] bg-white border border-[#e3eaf3] hover:bg-[#eaf2fc] px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Use
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(item.output)}
                      className="text-xs font-semibold text-[#55657b] hover:text-[#1d5fb8] bg-white border border-[#e3eaf3] px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Copy
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlaySpeech(item.output, item.to)}
                      className="text-xs font-semibold text-[#55657b] hover:text-[#1d5fb8] bg-white border border-[#e3eaf3] px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      🔊
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onRemoveItem(item.id);
                        onToast('Entry removed');
                      }}
                      className="text-xs text-gray-400 hover:text-red-600 p-1.5 rounded-lg transition cursor-pointer"
                      title="Delete entry"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
};
