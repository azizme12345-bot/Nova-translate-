export type AppLanguage = 'en';

export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    home: 'Home',
    camera: 'Camera',
    saved: 'Saved',
    history: 'History',
    settings: 'Settings',
    textTranslation: 'Text Translation',
    voiceTranslation: 'Voice Translation',
    cameraOcr: 'Camera OCR',
    languages: 'Languages',
    aboutUs: 'About Us',
    sitemap: 'Sitemap',
    installApp: 'Install App',
    scanCamera: 'Camera Scan',
    clearText: 'Clear Text',
    translateNow: 'Translate',
    translating: 'Translating...',
    shareTranslation: 'Share Translation',
    optionsAndHistory: 'Options & History',
    copy: 'Copy',
    save: 'Save',
    use: 'Use',
    clearAll: 'Clear All',
    close: 'Close',
    searchPlaceholder: 'Search language...',
    tapToEnterText: 'Type text here or tap mic to speak...',
    translationWillAppear: 'Translation will appear here...',
    listening: 'Listening... Start speaking!',
    stopMic: 'Stop Mic',
    copiedSource: 'Source text copied',
    translationCopied: 'Translation copied!',
    savedToFavorites: 'Saved to Favorites',
    removedFromFavorites: 'Removed from favorites',
    favoritesCleared: 'Favorites cleared',
    textCleared: 'Text cleared',
    languagesSwapped: 'Languages swapped',
    novaTranslator: 'Nova Translator',
  },
};

export function t(key: string, lang: AppLanguage = 'en'): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
}

export function getSavedLanguage(): AppLanguage {
  return 'en';
}

export function setSavedLanguage(_lang: AppLanguage) {
  try {
    localStorage.setItem('nova_app_language', 'en');
  } catch {}
}
