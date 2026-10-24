import React, { useState, useEffect, useCallback } from 'react';
import { HistoryItem, SavedItem, ActivePage } from './types.ts';
import { ApiClient, LanguageOption } from './services/apiClient.ts';
import { AppLanguage, getSavedLanguage, setSavedLanguage } from './services/i18n.ts';
import { HomeSection } from './components/HomeSection.tsx';
import { CameraSection } from './components/CameraSection.tsx';
import { HistorySection } from './components/HistorySection.tsx';
import { SavedSection } from './components/SavedSection.tsx';
import { LanguagesSection } from './components/LanguagesSection.tsx';
import { TextTranslationSection } from './components/TextTranslationSection.tsx';
import { VoiceTranslationSection } from './components/VoiceTranslationSection.tsx';
import { AboutSection } from './components/AboutSection.tsx';
import { SitemapSection } from './components/SitemapSection.tsx';
import { Footer } from './components/Footer.tsx';
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

const setMeta = (title: string, description: string, path: string) => {
  document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', `https://nova-translate-orpin.vercel.app${path}`);
};

const getPageFromPath = (path: string): { view: ActivePage; title: string; desc: string; canonical: string } => {
  if (path === '/camera' || path === '/camera-translation') {
    return {
      view: 'image',
      title: 'Camera Translate – Nova Translate',
      desc: 'Use your camera to translate text in real time.',
      canonical: '/camera'
    };
  }
  if (path === '/history') {
    return {
      view: 'history',
      title: 'Translation History – Nova Translate',
      desc: 'View and manage your past translations.',
      canonical: '/history'
    };
  }
  if (path === '/voice' || path === '/voice-translation') {
    return {
      view: 'voice-translation',
      title: 'Voice Translate – Nova Translate',
      desc: 'Translate spoken language on the fly.',
      canonical: '/voice'
    };
  }
  if (path === '/text-translation') {
    return {
      view: 'text-translation',
      title: 'Text Translation – Nova Translate',
      desc: 'Translate text instantly across multiple languages.',
      canonical: '/text-translation'
    };
  }
  if (path === '/languages') {
    return {
      view: 'languages',
      title: 'Supported Languages – Nova Translate',
      desc: 'Explore 100+ supported languages for translation.',
      canonical: '/languages'
    };
  }
  if (path === '/about') {
    return {
      view: 'about',
      title: 'About Us – Nova Translate',
      desc: 'Learn about Nova Translator and our AI engine.',
      canonical: '/about'
    };
  }
  if (path === '/sitemap') {
    return {
      view: 'sitemap',
      title: 'Sitemap & Tools Directory – Nova Translate',
      desc: 'Explore all tools, features, and web pages available on Nova Translator.',
      canonical: '/sitemap'
    };
  }
  return {
    view: 'translate',
    title: 'Nova Translate – Home',
    desc: 'Translate text instantly with Nova Translate.',
    canonical: '/'
  };
};

export default function App() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<AppLanguage>(() => getSavedLanguage());
  const [activeView, setActiveView] = useState<ActivePage>(() => {
    const route = getPageFromPath(window.location.pathname);
    setMeta(route.title, route.desc, route.canonical);
    return route.view;
  });
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

  const toggleLang = useCallback(() => {
    const next = lang === 'en' ? 'ur' : 'en';
    setLang(next);
    setSavedLanguage(next);
  }, [lang]);

  const changeView = useCallback((page: ActivePage, pushHistory = true) => {
    setActiveView(page);
    let path = '/';
    if (page === 'image' || page === 'camera') path = '/camera';
    else if (page === 'history') path = '/history';
    else if (page === 'voice-translation') path = '/voice';
    else if (page === 'text-translation') path = '/text-translation';
    else if (page === 'languages') path = '/languages';
    else if (page === 'about') path = '/about';
    else if (page === 'sitemap') path = '/sitemap';
    else if (page === 'translate' || page === 'home') path = '/';

    const routeInfo = getPageFromPath(path);
    setMeta(routeInfo.title, routeInfo.desc, routeInfo.canonical);

    if (pushHistory && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const route = getPageFromPath(window.location.pathname);
      setMeta(route.title, route.desc, route.canonical);
      setActiveView(route.view);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Intercept internal link clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && target.href.startsWith(window.location.origin)) {
        const url = new URL(target.href);
        const path = url.pathname;
        if (path && path !== '#') {
          e.preventDefault();
          window.history.pushState({}, '', path);
          const route = getPageFromPath(path);
          setMeta(route.title, route.desc, route.canonical);
          setActiveView(route.view);
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

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
    changeView('translate', true);
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
            onNavigate={(page) => {
              if (page === 'image' || page === 'camera') changeView('image', true);
              else if (page === 'languages') changeView('languages', true);
              else if (page === 'about') changeView('about', true);
              else if (page === 'sitemap') changeView('sitemap', true);
              else if (page === 'text-translation') changeView('text-translation', true);
              else if (page === 'voice-translation' || page === 'voice') changeView('voice-translation', true);
              else if (page === 'history') changeView('history', true);
              else changeView('translate', true);
            }}
            onToast={showToast}
            loadedItem={loadedItem}
            onClearLoadedItem={() => setLoadedItem(null)}
            onOpenCallModal={() => setShowCallModal(true)}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            lang={lang}
            onToggleLang={toggleLang}
          />
        )}

        {activeView === 'image' && (
          <CameraSection
            languages={DEFAULT_LANGUAGES}
            onBack={() => changeView('translate', true)}
            onToast={showToast}
            onAddHistory={handleAddHistory}
          />
        )}

        {activeView === 'text-translation' && (
          <TextTranslationSection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
          />
        )}

        {activeView === 'voice-translation' && (
          <VoiceTranslationSection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
          />
        )}

        {activeView === 'languages' && (
          <LanguagesSection
            languages={DEFAULT_LANGUAGES}
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
            onToast={showToast}
          />
        )}

        {activeView === 'about' && (
          <AboutSection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
          />
        )}

        {activeView === 'sitemap' && (
          <SitemapSection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
            lang={lang}
          />
        )}

        {activeView === 'history' && (
          <HistorySection
            history={history}
            onRemoveItem={handleDeleteHistoryItem}
            onClearAll={handleClearHistory}
            onUseItem={(item) => handleUseInTranslator(item.input, item.output, item.from, item.to)}
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
            onToast={showToast}
          />
        )}
      </main>

      <Footer onNavigate={(p) => changeView(p, true)} lang={lang} onToggleLang={toggleLang} />

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
