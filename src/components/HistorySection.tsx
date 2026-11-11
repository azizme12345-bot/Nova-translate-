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
  onClearAll,
  onToast,
  onUseItem,
}) => {
  useEffect(() => {
    document.title = 'Translation History & Activity Log — Lafz Translator';
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
    <article className="flex flex-col flex-1 bg-[#f0f0f0] rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Top Banner */}
      <div className="bg-[#2e7d32] text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            ← Home
          </a>
          <span className="font-bold tracking-wide text-sm sm:text-base">
            Translation Activity &amp; History
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onClearAll();
              onToast('Translation history cleared');
            }}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-2.5 py-1 rounded shadow-xs transition cursor-pointer"
            title="Clear all stored translations"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        <header className="border-b border-gray-100 pb-4">
          <div className="text-xs font-bold text-[#2e7d32] tracking-wider uppercase mb-1">
            Privacy-Protected Storage
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            Your Translation History &amp; Phrase Log
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Lafz Translator automatically keeps a local, private record of your recent translations for quick reference, instant repetition, and offline access. All records remain exclusively on your device.
          </p>
        </header>

        {/* Feature Highlights Grid */}
        <section aria-label="History Features" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="text-xl mb-1">🔒</div>
            <h2 className="font-bold text-sm text-gray-800 mb-1">100% Client-Side Privacy</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your translation history is saved only inside your browser’s local storage and is never uploaded or monitored by cloud trackers.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="text-xl mb-1">🔊</div>
            <h2 className="font-bold text-sm text-gray-800 mb-1">One-Click Pronunciation</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Listen to the correct spoken pronunciation of past Urdu and English phrases with our built-in speech engine.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="text-xl mb-1">📋</div>
            <h2 className="font-bold text-sm text-gray-800 mb-1">Instant Clipboard Copy</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Quickly copy original and translated phrases into WhatsApp, emails, study notes, or documents.
            </p>
          </div>
        </section>

        {/* Active Translations List */}
        <section aria-label="Recent Translations List" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">
              Recent Translation Log ({history.length})
            </h2>
            <span className="text-xs text-gray-500">Auto-saved</span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm font-semibold text-gray-700">No translations logged yet in this session.</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                When you translate sentences, speak via microphone, or scan images, they will appear here automatically for easy review.
              </p>
              <div className="mt-4">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="inline-block bg-[#2e7d32] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                >
                  Start New Translation →
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-semibold text-emerald-800">
                      {item.from} → {item.to}
                    </span>
                    <span>{item.time || 'Recently'}</span>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="text-xs text-gray-500">Source:</div>
                    <div className="text-sm font-medium text-gray-800">{item.input}</div>
                    <div className="text-xs text-emerald-700 font-semibold mt-2">Translated:</div>
                    <div className="text-sm font-bold text-gray-900 bg-white p-2.5 rounded-lg border border-gray-200">
                      {item.output}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlaySpeech(item.output, item.to)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-medium transition cursor-pointer"
                        title="Listen to audio"
                      >
                        🔊 Listen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.output)}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-700 font-medium transition cursor-pointer"
                        title="Copy translation"
                      >
                        📋 Copy
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUseItem(item)}
                      className="text-[#2e7d32] hover:underline font-bold transition cursor-pointer"
                    >
                      Re-open in Translator →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Translation FAQ */}
        <section aria-label="Translation History FAQ" className="mt-4 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Frequently Asked Questions</h2>
          <div className="space-y-3">
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">
                How long is my translation history kept?
              </summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Your history is kept in your device’s local browser storage until you explicitly click "Clear All" or clear your browser cache.
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">
                Can I access my history on another phone or computer?
              </summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                For maximum privacy and security, records are stored locally and are not transmitted to third-party databases.
              </p>
            </details>
          </div>
        </section>
      </div>
    </article>
  );
};
