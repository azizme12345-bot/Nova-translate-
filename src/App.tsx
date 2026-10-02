import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Topbar } from './components/Topbar.tsx';
import { HomeSection } from './components/HomeSection.tsx';
import { HistorySection } from './components/HistorySection.tsx';
import { CameraSection } from './components/CameraSection.tsx';
import { VoiceSection } from './components/VoiceSection.tsx';
import { SettingsSection } from './components/SettingsSection.tsx';
import { Toast } from './components/Toast.tsx';
import { Modals } from './components/Modals.tsx';
import { ApiClient, LanguageOption } from './services/apiClient.ts';
import { ActivePage, AppSettings, HistoryItem } from './types.ts';

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'ur', name: 'Urdu', label: 'Urdu 🇵🇰', nativeName: 'اردو', direction: 'rtl' },
  { code: 'en', name: 'English', label: 'English 🇬🇧', nativeName: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', label: 'Arabic 🇸🇦', nativeName: 'العربية', direction: 'rtl' },
  { code: 'pa', name: 'Punjabi', label: 'Punjabi 🇵🇰', nativeName: 'پنجابی / ਪੰਜਾਬੀ', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', label: 'Hindi 🇮🇳', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', label: 'Japanese 🇯🇵', nativeName: '日本語', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', label: 'Chinese 🇨🇳', nativeName: '中文', direction: 'ltr' },
  { code: 'fr', name: 'French', label: 'French 🇫🇷', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', label: 'German 🇩🇪', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'es', name: 'Spanish', label: 'Spanish 🇪🇸', nativeName: 'Español', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', label: 'Turkish 🇹🇷', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'ru', name: 'Russian', label: 'Russian 🇷🇺', nativeName: 'Русский', direction: 'ltr' },
  { code: 'fa', name: 'Persian', label: 'Persian 🇮🇷', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ko', name: 'Korean', label: 'Korean 🇰🇷', nativeName: '한국어', direction: 'ltr' },
  { code: 'it', name: 'Italian', label: 'Italian 🇮🇹', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', label: 'Portuguese 🇵🇹', nativeName: 'Português', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', label: 'Bengali 🇧🇩', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', label: 'Indonesian 🇮🇩', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', label: 'Dutch 🇳🇱', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'ps', name: 'Pashto', label: 'Pashto 🇦🇫', nativeName: 'پښتو', direction: 'rtl' },
  { code: 'sd', name: 'Sindhi', label: 'Sindhi 🇵🇰', nativeName: 'سنڌي', direction: 'rtl' },
];

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [languages, setLanguages] = useState<LanguageOption[]>(DEFAULT_LANGUAGES);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Load history from localStorage
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('novaHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('novaSettings');
      return saved
        ? JSON.parse(saved)
        : {
            darkMode: false,
            autoDetect: true,
            voiceOutput: false,
            textSize: 'medium',
          };
    } catch {
      return {
        darkMode: false,
        autoDetect: true,
        voiceOutput: false,
        textSize: 'medium',
      };
    }
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2400);
  }, []);

  // Save history on change
  useEffect(() => {
    try {
      localStorage.setItem('novaHistory', JSON.stringify(history));
    } catch {
      // storage error handling
    }
  }, [history]);

  // Apply dark mode & save settings
  useEffect(() => {
    try {
      localStorage.setItem('novaSettings', JSON.stringify(settings));
    } catch {
      // storage error
    }

    if (settings.darkMode) {
      document.body.classList.add('dark');
      document.documentElement.style.setProperty('--bg', '#071812');
      document.documentElement.style.setProperty('--surface', '#0d241c');
      document.documentElement.style.setProperty('--surface2', '#15352a');
      document.documentElement.style.setProperty('--text', '#f4faf7');
      document.documentElement.style.setProperty('--border', '#21483a');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.style.setProperty('--bg', '#f7f9fb');
      document.documentElement.style.setProperty('--surface', '#ffffff');
      document.documentElement.style.setProperty('--surface2', '#eef5f2');
      document.documentElement.style.setProperty('--text', '#0f1720');
      document.documentElement.style.setProperty('--border', '#dce8e3');
    }
  }, [settings]);

  // Fetch languages & check backend health on mount
  useEffect(() => {
    ApiClient.getSupportedLanguages()
      .then((langs) => {
        if (langs && langs.length > 0) setLanguages(langs);
      })
      .catch(() => {
        // Fallback to default language list
      });

    ApiClient.checkHealth()
      .then((health) => {
        setBackendConfigured(health.geminiConfigured);
      })
      .catch(() => {
        setBackendConfigured(false);
      });
  }, []);

  const handleAddHistory = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, 50));
  };

  const handleRemoveHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const [loadedHistoryItem, setLoadedHistoryItem] = useState<HistoryItem | null>(null);

  const handleUseHistoryItem = (item: HistoryItem) => {
    setLoadedHistoryItem(item);
    setActivePage('home');
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    handleUpdateSettingsState(newSettings);
  };

  const handleUpdateSettingsState = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleToggleTheme = () => {
    handleUpdateSettingsState({ darkMode: !settings.darkMode });
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onSelectPage={setActivePage} />

      <main className="main">
        <Topbar
          onToggleTheme={handleToggleTheme}
          onHelp={() => setShowAbout(true)}
          onOpenSettings={() => setActivePage('settings')}
          onToast={showToast}
        />

        <div className="content">
          {activePage === 'home' && (
            <HomeSection
              languages={languages}
              onAddHistory={handleAddHistory}
              onNavigate={setActivePage}
              onToast={showToast}
              autoDetectEnabled={settings.autoDetect}
              voiceOutputEnabled={settings.voiceOutput}
              textSize={settings.textSize}
              loadedItem={loadedHistoryItem}
              onClearLoadedItem={() => setLoadedHistoryItem(null)}
            />
          )}

          {activePage === 'voice' && (
            <VoiceSection
              languages={languages}
              onAddHistory={handleAddHistory}
              onToast={showToast}
            />
          )}

          {activePage === 'history' && (
            <HistorySection
              history={history}
              onRemoveItem={handleRemoveHistory}
              onClearAll={handleClearHistory}
              onToast={showToast}
              onUseItem={handleUseHistoryItem}
            />
          )}

          {activePage === 'camera' && (
            <CameraSection
              languages={languages}
              onAddHistory={handleAddHistory}
              onToast={showToast}
            />
          )}

          {activePage === 'settings' && (
            <SettingsSection
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenPrivacy={() => setShowPrivacy(true)}
              onOpenAbout={() => setShowAbout(true)}
              onToast={showToast}
              backendConfigured={backendConfigured}
              onClearHistory={handleClearHistory}
              historyCount={history.length}
            />
          )}
        </div>
      </main>

      <Toast message={toastMessage} />

      <Modals
        showPrivacy={showPrivacy}
        showAbout={showAbout}
        onClosePrivacy={() => setShowPrivacy(false)}
        onCloseAbout={() => setShowAbout(false)}
      />
    </div>
  );
}
