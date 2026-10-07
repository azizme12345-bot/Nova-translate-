import React, { useState } from 'react';
import { SavedItem } from '../types.ts';
import { Bookmark, Volume2, Copy, Trash2, ArrowRight, Sparkles, Share2 } from 'lucide-react';
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
  onRemoveSaved,
  onClearAllSaved,
  onToast,
  onUseItem,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'image' | 'voice'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const filteredItems = savedItems.filter((item) => {
    if (activeTab !== 'all' && (item.type || 'text') !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.input.toLowerCase().includes(q) ||
        item.output.toLowerCase().includes(q) ||
        item.from.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePlayAudio = (item: SavedItem) => {
    if (speakingId === item.id) {
      GlobalAudioPlayer.stop();
      setSpeakingId(null);
      return;
    }

    GlobalAudioPlayer.stop();
    setSpeakingId(item.id);
    onToast(`Playing audio (${item.to})...`);

    GlobalAudioPlayer.play(item.output, item.to, {
      onStart: () => setSpeakingId(item.id),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast('Copied to clipboard!');
  };

  const handleShare = async (item: SavedItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nova Translate - Saved Phrase',
          text: `${item.input} -> ${item.output}`,
        });
      } catch {}
    } else {
      handleCopy(item.output);
    }
  };

  return (
    <section className="section active" id="saved">
      <div className="hero flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-[#00D4FF]">
            <Bookmark className="w-3.5 h-3.5" />
            BOOKMARKED PHRASES
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Saved Translations</h1>
          <p className="subtitle text-sm text-slate-400">
            Quickly access your starred translations, offline notes, and important vocabulary.
          </p>
        </div>

        {savedItems.length > 0 && (
          <button
            onClick={onClearAllSaved}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Search & Tabs */}
        <div className="bg-[#1a2847] p-3 rounded-2xl border border-[#2a3d5a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['all', 'text', 'image', 'voice'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#0099FF] to-[#00D4FF] text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'all' ? 'All Items' : tab === 'text' ? 'Text' : tab === 'image' ? 'Images' : 'Voice'}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search saved phrases…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 bg-[#0a1628] border border-[#2a3d5a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0099FF]"
          />
        </div>

        {/* List of Saved Items */}
        {filteredItems.length === 0 ? (
          <div className="bg-[#1a2847]/60 border border-[#2a3d5a] rounded-2xl p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00D4FF]">
              <Bookmark className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Saved Phrases Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Click the bookmark icon (🔖) on any translation to save it here for quick access anytime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#1a2847] border border-[#2a3d5a] hover:border-[#0099FF]/50 rounded-2xl p-4 transition-all space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#00D4FF]">
                    <span>{item.from}</span>
                    <span>→</span>
                    <span>{item.to}</span>
                    {item.details && (
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        {item.details}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">{item.timestamp}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-300 font-medium">{item.input}</div>
                  <div className="text-sm text-white font-bold">{item.output}</div>
                </div>

                <div className="pt-2 border-t border-[#2a3d5a]/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePlayAudio(item)}
                      type="button"
                      className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        speakingId === item.id
                          ? 'bg-[#0099FF] text-white animate-pulse'
                          : 'bg-[#0a1628] text-slate-300 hover:text-white border border-[#2a3d5a]'
                      }`}
                      title="Listen to translation"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#00D4FF]" />
                      <span>{speakingId === item.id ? 'Playing…' : 'Listen'}</span>
                    </button>

                    <button
                      onClick={() => handleCopy(item.output)}
                      type="button"
                      className="p-2 rounded-lg text-xs font-semibold bg-[#0a1628] text-slate-300 hover:text-white border border-[#2a3d5a] flex items-center gap-1"
                      title="Copy text"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleShare(item)}
                      type="button"
                      className="p-2 rounded-lg text-xs font-semibold bg-[#0a1628] text-slate-300 hover:text-white border border-[#2a3d5a] flex items-center gap-1"
                      title="Share translation"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUseItem({ input: item.input, output: item.output, from: item.from, to: item.to })}
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#00D4FF] hover:bg-cyan-500/10 transition-all flex items-center gap-1"
                    >
                      <span>Translate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onRemoveSaved(item.id)}
                      type="button"
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete saved item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
