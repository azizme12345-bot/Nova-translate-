import React, { useState, useEffect, useCallback } from 'react';
import { HistoryItem, SavedItem, ActivePage } from './types.ts';
import { LanguageOption } from './services/apiClient.ts';
import { AppLanguage, getSavedLanguage, setSavedLanguage } from './services/i18n.ts';
import { Topbar } from './components/Topbar.tsx';
import { HomeSection } from './components/HomeSection.tsx';
import { CameraSection } from './components/CameraSection.tsx';
import { HistorySection } from './components/HistorySection.tsx';
import { SavedSection } from './components/SavedSection.tsx';
import { LanguagesSection } from './components/LanguagesSection.tsx';
import { TextTranslationSection } from './components/TextTranslationSection.tsx';
import { VoiceTranslationSection } from './components/VoiceTranslationSection.tsx';
import { AboutSection } from './components/AboutSection.tsx';
import { PrivacySection } from './components/PrivacySection.tsx';
import { ContactSection } from './components/ContactSection.tsx';
import { TermsSection } from './components/TermsSection.tsx';
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

  const setTag = (selector: string, attr: string, value: string) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith('meta') ? 'meta' : 'link');
      if (selector.includes('name="')) {
        const name = selector.match(/name="([^"]+)"/)?.[1];
        if (name) el.setAttribute('name', name);
      } else if (selector.includes('property="')) {
        const prop = selector.match(/property="([^"]+)"/)?.[1];
        if (prop) el.setAttribute('property', prop);
      } else if (selector.includes('rel="')) {
        const rel = selector.match(/rel="([^"]+)"/)?.[1];
        if (rel) el.setAttribute('rel', rel);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  const fullUrl = `https://nova-translate-orpin.vercel.app${path}`;

  setTag('meta[name="description"]', 'content', description);
  setTag('link[rel="canonical"]', 'href', fullUrl);
  setTag('meta[property="og:title"]', 'content', title);
  setTag('meta[property="og:description"]', 'content', description);
  setTag('meta[property="og:url"]', 'content', fullUrl);
  setTag('meta[name="twitter:title"]', 'content', title);
  setTag('meta[name="twitter:description"]', 'content', description);
  setTag('meta[name="twitter:url"]', 'content', fullUrl);
};

const getPageFromRoute = (
  pathname: string,
  hash = ''
): { view: ActivePage; title: string; desc: string; canonical: string } => {
  const cleanHash = (hash || '').toLowerCase();
  const normalizedPath =
    cleanHash === '#image' || cleanHash === '#camera'
      ? '/camera'
      : cleanHash === '#history'
      ? '/history'
      : cleanHash === '#saved'
      ? '/saved'
      : cleanHash === '#voice' || cleanHash === '#voice-translation'
      ? '/voice'
      : cleanHash === '#text-translation'
      ? '/text-translation'
      : cleanHash === '#languages'
      ? '/languages'
      : cleanHash === '#about' || cleanHash === '#content'
      ? '/about'
      : cleanHash === '#privacy'
      ? '/privacy'
      : cleanHash === '#contact'
      ? '/contact'
      : cleanHash === '#terms'
      ? '/terms'
      : cleanHash === '#sitemap'
      ? '/sitemap'
      : cleanHash === '#home' || cleanHash === '#translate' || cleanHash === '#historySection'
      ? '/'
      : pathname;

  if (normalizedPath === '/camera' || normalizedPath === '/camera-translation' || normalizedPath === '/image') {
    return {
      view: 'image',
      title: 'Camera OCR & Photo Translator – LAFZ Translation',
      desc: 'Scan and translate printed signs, restaurant menus, receipts, and documents directly using your mobile camera or uploaded image.',
      canonical: '/camera',
    };
  }
  if (normalizedPath === '/history') {
    return {
      view: 'history',
      title: 'Translation History & Activity Log – LAFZ Translation',
      desc: 'View, search, replay, and manage your recent translations with private device storage and one-click clipboard copying.',
      canonical: '/history',
    };
  }
  if (normalizedPath === '/saved') {
    return {
      view: 'saved',
      title: 'Saved Translations – LAFZ Translation',
      desc: 'Review and reuse your saved translations stored privately in your browser.',
      canonical: '/saved',
    };
  }
  if (normalizedPath === '/voice' || normalizedPath === '/voice-translation') {
    return {
      view: 'voice-translation',
      title: 'Voice Translator & Speech-to-Text – LAFZ Translation',
      desc: 'Speak naturally and translate your voice in real-time between English and Urdu with continuous microphone input and natural audio playback.',
      canonical: '/voice',
    };
  }
  if (normalizedPath === '/text-translation') {
    return {
      view: 'text-translation',
      title: 'Text Translation – LAFZ Translation',
      desc: 'Instant bidirectional AI text translation supporting English, Urdu, and 100+ languages. Fast sentence, paragraph, and document translator.',
      canonical: '/text-translation',
    };
  }
  if (normalizedPath === '/languages') {
    return {
      view: 'languages',
      title: 'Supported Languages Directory – LAFZ Translation',
      desc: 'Explore 100+ supported international languages, dialects, native scripts, and speech synthesis engines available in LAFZ Translation.',
      canonical: '/languages',
    };
  }
  if (normalizedPath === '/about' || normalizedPath === '/about.html') {
    return {
      view: 'about',
      title: 'About LAFZ Translation – Simple Language Translation',
      desc: 'Learn about LAFZ Translation: its mission, what keeps the interface simple, who it helps, and how it stays clear on phones and desktops.',
      canonical: '/about',
    };
  }
  if (normalizedPath === '/privacy' || normalizedPath === '/privacy.html') {
    return {
      view: 'privacy',
      title: 'Privacy Policy – LAFZ Translation',
      desc: 'Privacy Policy for LAFZ Translation. Learn what text, voice audio, and images are sent to the server, what stays in your browser storage, and how to clear history.',
      canonical: '/privacy',
    };
  }
  if (normalizedPath === '/contact' || normalizedPath === '/contact.html') {
    return {
      view: 'contact',
      title: 'Contact Us – LAFZ Translation',
      desc: 'Contact LAFZ Translation with questions, feedback, feature suggestions, or bug reports.',
      canonical: '/contact',
    };
  }
  if (normalizedPath === '/terms' || normalizedPath === '/terms.html') {
    return {
      view: 'terms',
      title: 'Terms of Use – LAFZ Translation',
      desc: 'Terms of Use for LAFZ Translation covering acceptable use, machine translation limitations, service availability, and content ownership.',
      canonical: '/terms',
    };
  }
  if (normalizedPath === '/sitemap') {
    return {
      view: 'sitemap',
      title: 'Sitemap & Tools Directory – LAFZ Translation',
      desc: 'Explore all translation tools, features, and indexable pages on LAFZ Translation. Complete navigation directory for users and search engines.',
      canonical: '/sitemap',
    };
  }
  return {
    view: 'translate',
    title: 'LAFZ Translation — Simple Language Translation',
    desc: 'LAFZ Translation is a fast, clean AI translation workspace for English, Urdu, and 100+ languages. Translate text, real-time voice, and camera photos.',
    canonical: '/',
  };
};

export default function App() {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<AppLanguage>(() => getSavedLanguage());
  const [activeView, setActiveView] = useState<ActivePage>(() => {
    const route = getPageFromRoute(window.location.pathname, window.location.hash);
    setMeta(route.title, route.desc, route.canonical);
    return route.view;
  });
  const [loadedItem, setLoadedItem] = useState<HistoryItem | null>(null);

  // Modals state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // History & Saved State (strictly keeping localStorage keys)
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
    setLang('en');
    setSavedLanguage('en');
  }, []);

  const changeView = useCallback((page: ActivePage, pushHistory = true) => {
    setActiveView(page);
    let path = '/';
    if (page === 'image' || page === 'camera') path = '/camera';
    else if (page === 'history') path = '/history';
    else if (page === 'saved') path = '/saved';
    else if (page === 'voice-translation' || page === 'voice') path = '/voice';
    else if (page === 'text-translation') path = '/text-translation';
    else if (page === 'languages') path = '/languages';
    else if (page === 'about') path = '/about';
    else if (page === 'privacy') path = '/privacy';
    else if (page === 'contact') path = '/contact';
    else if (page === 'terms') path = '/terms';
    else if (page === 'sitemap') path = '/sitemap';
    else if (page === 'translate' || page === 'home') path = '/';

    const routeInfo = getPageFromRoute(path);
    setMeta(routeInfo.title, routeInfo.desc, routeInfo.canonical);

    if (pushHistory && (window.location.pathname !== path || window.location.hash)) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const syncRouteFromBrowser = () => {
      const route = getPageFromRoute(window.location.pathname, window.location.hash);
      setMeta(route.title, route.desc, route.canonical);
      setActiveView(route.view);
    };
    window.addEventListener('popstate', syncRouteFromBrowser);
    window.addEventListener('hashchange', syncRouteFromBrowser);
    return () => {
      window.removeEventListener('popstate', syncRouteFromBrowser);
      window.removeEventListener('hashchange', syncRouteFromBrowser);
    };
  }, []);

  // Intercept internal link clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && target.href.startsWith(window.location.origin)) {
        const url = new URL(target.href);
        if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
          return;
        }
        const path = url.pathname;
        const hash = url.hash;
        if (path || hash) {
          e.preventDefault();
          const route = getPageFromRoute(path, hash);
          const nextUrl = hash ? `${path}${hash}` : path;
          window.history.pushState({}, '', nextUrl);
          setMeta(route.title, route.desc, route.canonical);
          setActiveView(route.view);
          if (hash === '#historySection') {
            setTimeout(() => {
              document.getElementById('historySection')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
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
    showToast('History item deleted');
  }, [showToast]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('nova_translation_history');
    } catch {}
    showToast('History cleared');
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
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col font-sans relative selection:bg-blue-100 selection:text-blue-900">
      {/* Universal Sticky Topbar */}
      <Topbar
        activeView={activeView}
        onNavigate={(page) => changeView(page, true)}
        onToast={showToast}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onOpenCallModal={() => setShowCallModal(true)}
      />

      <main className="flex-1 w-full max-w-full min-w-0 pb-10">
        {(activeView === 'translate' || activeView === 'home') && (
          <HomeSection
            languages={DEFAULT_LANGUAGES}
            history={history}
            onAddHistory={handleAddHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
            onAddSaved={handleAddSaved}
            onNavigate={(page) => changeView(page, true)}
            onToast={showToast}
            loadedItem={loadedItem}
            onClearLoadedItem={() => setLoadedItem(null)}
            onOpenCallModal={() => setShowCallModal(true)}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            lang={lang}
            onToggleLang={toggleLang}
          />
        )}

        {(activeView === 'image' || activeView === 'camera') && (
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

        {(activeView === 'voice-translation' || activeView === 'voice') && (
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

        {activeView === 'privacy' && (
          <PrivacySection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
          />
        )}

        {activeView === 'contact' && (
          <ContactSection
            onBack={() => changeView('translate', true)}
            onNavigate={(p) => changeView(p, true)}
          />
        )}

        {activeView === 'terms' && (
          <TermsSection
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

      <Footer
        activeView={activeView}
        onNavigate={(p) => changeView(p, true)}
        lang={lang}
        onToggleLang={toggleLang}
      />

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
