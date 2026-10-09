import React, { useState, useEffect, useCallback } from 'react';
import { HistoryItem, SavedItem, ActivePage } from './types.ts';
import { ApiClient, LanguageOption } from './services/apiClient.ts';
import { HomeSection } from './components/HomeSection.tsx';
import { CameraSection } from './components/CameraSection.tsx';
import { HistorySection } from './components/HistorySection.tsx';
import { SavedSection } from './components/SavedSection.tsx';
import { Toast } from './components/Toast.tsx';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';
import { CallTranslateModal } from './components/CallTranslateModal.tsx';

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', label: 'English 🇬🇧', nativeName: 'English', direction: 'ltr' },
  { code: 'ur', name: 'Urdu', label: 'Urdu 🇵🇰', nativeName: 'اردو', direction: 'rtl' },
  { code: 'ar', name: 'Arabic', label: 'Arabic 🇸🇦', nativeName: 'العربية', direction: 'rtl' },
  { code: 'ja', name: 'Japanese', label: 'Japanese 🇯🇵', nativeName: '日本語', direction: 'ltr' },
  { code: 'pa', name: 'Punjabi', label: 'Punjabi 🇵🇰', nativeName: 'پنجابی', direction: 'rtl' },
  { code: 'es', name: 'Spanish', label: 'Spanish 🇪🇸', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', label: 'French 🇫🇷', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', label: 'German 🇩🇪', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', label: 'Hindi 🇮🇳', nativeName: 'हिन्दी', direction: 'ltr' },
];

export default function App() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActivePage>('translate');
  const [loadedItem, setLoadedItem] = useState<HistoryItem | null>(null);

  // Modals state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // History & Saved State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('nova_translation_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const saved = localStorage.getItem('nova_saved_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 2200);
  }, []);

  const handleAddHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const exists = prev.some((i) => i.input.trim() === item.input.trim() && i.to === item.to);
      if (exists) return prev;
      const updated = [item, ...prev].slice(0, 100);
      try {
        localStorage.setItem('nova_translation_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleAddSaved = useCallback(
    (item: SavedItem) => {
      setSavedItems((prev) => {
        const exists = prev.some(
          (i) => i.id === item.id || (i.input === item.input && i.to === item.to)
        );
        if (exists) return prev;
        const updated = [item, ...prev];
        try {
          localStorage.setItem('nova_saved_items', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      showToast('Saved to Favorites');
    },
    [showToast]
  );

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('nova_translation_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('ہسٹری آئٹم ڈیلیٹ ہو گیا');
  }, [showToast]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('nova_translation_history');
    } catch {}
    showToast('ہسٹری صاف کر دی گئی');
  }, [showToast]);

  const handleUseInTranslator = (sourceText: string, translatedText: string, from: string, to: string) => {
    setLoadedItem({
      id: Date.now().toString(),
      from,
      to,
      input: sourceText,
      output: translatedText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setActiveView('translate');
  };

  return (
    <div className="bg-[#f0f0f0] text-gray-800 min-h-screen flex flex-col font-sans relative">
      <main className="w-full max-w-4xl mx-auto flex-1 flex flex-col p-2 sm:p-4">
        {activeView === 'translate' && (
          <HomeSection
            languages={DEFAULT_LANGUAGES}
            history={history}
            onAddHistory={handleAddHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
            onAddSaved={handleAddSaved}
            onNavigate={setActiveView}
            onToast={showToast}
            loadedItem={loadedItem}
            onClearLoadedItem={() => setLoadedItem(null)}
            onOpenCallModal={() => setShowCallModal(true)}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
          />
        )}

        {activeView === 'image' && (
          <CameraSection
            languages={DEFAULT_LANGUAGES}
            onBack={() => setActiveView('translate')}
            onToast={showToast}
            onAddHistory={handleAddHistory}
          />
        )}

        {activeView === 'history' && (
          <HistorySection
            history={history}
            onRemoveItem={handleDeleteHistoryItem}
            onClearAll={handleClearHistory}
            onUseItem={(item) => handleUseInTranslator(item.input, item.output, item.from, item.to)}
            onBack={() => setActiveView('translate')}
            onToast={showToast}
          />
        )}

        {activeView === 'saved' && (
          <SavedSection
            savedItems={savedItems}
            onRemoveSaved={(id) => {
              const updated = savedItems.filter((i) => i.id !== id);
              setSavedItems(updated);
              localStorage.setItem('nova_saved_items', JSON.stringify(updated));
              showToast('Removed from favorites');
            }}
            onClearAllSaved={() => {
              setSavedItems([]);
              localStorage.removeItem('nova_saved_items');
              showToast('Favorites cleared');
            }}
            onUseItem={(item) => handleUseInTranslator(item.input, item.output, item.from, item.to)}
            onBack={() => setActiveView('translate')}
            onToast={showToast}
          />
        )}
      </main>

      {/* Modals */}
      {showApiKeyModal && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onToast={showToast}
        />
      )}

      {showCallModal && (
        <CallTranslateModal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          languages={DEFAULT_LANGUAGES}
          onToast={showToast}
        />
      )}

      <Toast message={toastMsg} />
    </div>
  );
}
