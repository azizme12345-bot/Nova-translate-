import React, { useState } from 'react';
import { HistoryItem } from '../types.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClearAll: () => void;
  onToast: (msg: string) => void;
  onUseItem: (item: HistoryItem) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearAll,
  onToast,
  onUseItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied to clipboard');
  };

  const handleSpeak = (text: string, langName: string) => {
    if (!text) return;
    GlobalAudioPlayer.stop();
    onToast('Speaking…');
    GlobalAudioPlayer.play(text, langName, {
      onEnd: () => {},
      onError: () => {},
    });
  };

  const filteredHistory = history.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.input.toLowerCase().includes(term) ||
      item.output.toLowerCase().includes(term) ||
      item.from.toLowerCase().includes(term) ||
      item.to.toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#2e7d32] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-bold text-base leading-tight">Translation History</h3>
              <p className="text-xs text-emerald-100">ترجمہ کی محفوظ شدہ ہسٹری ({history.length})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  onToast('All history cleared');
                }}
                className="text-xs bg-red-600/90 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
                title="Clear all history"
              >
                Clear All 🗑️
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl font-bold p-1 leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search history (تلاش کریں)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#2e7d32]"
          />
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-3xl block mb-2">📖</span>
              <p className="text-sm font-medium">No history items found.</p>
              <p className="text-xs mt-1 text-gray-400">نئے ترجمے خود بخود یہاں محفوظ ہوں گے۔</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isUrduTarget =
                item.to.includes('Urdu') || item.to.includes('Arabic') || item.to.includes('Punjabi');
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 hover:border-emerald-500 rounded-xl p-3 shadow-xs transition"
                >
                  <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1.5 pb-1 border-b border-gray-100">
                    <span className="font-semibold text-emerald-800">
                      {item.from} → {item.to}
                    </span>
                    <span>{item.time || 'Recent'}</span>
                  </div>

                  {/* Input Source */}
                  <div className="text-xs text-gray-700 mb-1 font-sans">{item.input}</div>

                  {/* Output Translation */}
                  <div
                    className={`text-sm font-semibold text-emerald-900 bg-emerald-50/50 p-2 rounded-lg mb-2 ${
                      isUrduTarget ? 'text-right font-serif' : 'text-left'
                    }`}
                    dir={isUrduTarget ? 'rtl' : 'ltr'}
                  >
                    {item.output}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSpeak(item.output, item.to)}
                        className="text-xs text-gray-600 hover:text-emerald-700 p-1 hover:bg-gray-100 rounded transition"
                        title="Speak output"
                      >
                        🔊 Listen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.output)}
                        className="text-xs text-gray-600 hover:text-emerald-700 p-1 hover:bg-gray-100 rounded transition"
                        title="Copy translation"
                      >
                        📋 Copy
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onUseItem(item);
                        onClose();
                      }}
                      className="text-xs bg-[#2e7d32] hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
                    >
                      Use in Translator ↗
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
          تمام پرانے اور نئے ترجمے خود بخود آپ کی ہسٹری میں محفوظ ہوتے ہیں۔
        </div>
      </div>
    </div>
  );
};
