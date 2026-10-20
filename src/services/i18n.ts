export type AppLanguage = 'en' | 'ur';

const STORAGE_KEY = 'nova_app_language';

export function getSavedLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ur' || saved === 'en') return saved;
  } catch {}
  return 'en'; // Default language English
}

export function setSavedLanguage(lang: AppLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

const translations = {
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
    installApp: 'Install App',
    scanCamera: 'Scan Camera',
    clearText: 'Clear Text',
    translateNow: 'Translate Now',
    translating: 'Translating...',
    shareTranslation: 'Share Translation',
    optionsAndHistory: 'Options & History',
    copy: 'Copy',
    save: 'Save',
    use: 'Use',
    clearAll: 'Clear All',
    close: 'Close',
    searchPlaceholder: 'Search languages...',
    tapToEnterText: 'Tap to enter text or speak with mic...',
    translationWillAppear: 'Translation will appear here...',
    listening: 'Listening... Speak now!',
    stopMic: 'Stop Mic',
    copiedSource: 'Copied source text',
    translationCopied: 'Translation copied!',
    savedToFavorites: 'Saved to Favorites',
    removedFromFavorites: 'Removed from favorites',
    favoritesCleared: 'Favorites cleared',
    textCleared: 'Text cleared',
    languagesSwapped: 'Languages swapped',
    novaTranslator: 'Nova Translator',
  },
  ur: {
    home: 'ہوم',
    camera: 'کیمرہ',
    saved: 'محفوظ شدہ',
    history: 'ہسٹری',
    settings: 'سیٹنگز',
    textTranslation: 'ٹیکسٹ ترجمہ',
    voiceTranslation: 'صوتی ترجمہ',
    cameraOcr: 'کیمرہ اسکینر',
    languages: 'زبانیں',
    aboutUs: 'ہمارے بارے میں',
    installApp: '📥 ایپ انسٹال کریں',
    scanCamera: '📸 کیمرہ اسکین',
    clearText: 'متن صاف کریں',
    translateNow: 'ترجمہ کریں',
    translating: 'ترجمہ ہو رہا ہے...',
    shareTranslation: 'ترجمہ شیئر کریں',
    optionsAndHistory: 'آپشنز اور ہسٹری',
    copy: 'کاپی',
    save: 'محفوظ کریں',
    use: 'استعمال کریں',
    clearAll: 'سب صاف کریں',
    close: 'بند کریں',
    searchPlaceholder: 'زبان تلاش کریں...',
    tapToEnterText: 'ٹیکسٹ یہاں لکھیں یا مائیک سے بولیں...',
    translationWillAppear: 'ترجمہ یہاں ظاہر ہوگا...',
    listening: 'سن رہے ہیں... بولنا شروع کریں!',
    stopMic: 'مائیک بند کریں',
    copiedSource: 'سورس ٹیکسٹ کاپی ہو گیا',
    translationCopied: 'ترجمہ کاپی ہو گیا!',
    savedToFavorites: 'فیورٹ میں محفوظ ہو گیا',
    removedFromFavorites: 'فیورٹ سے ہٹا دیا گیا',
    favoritesCleared: 'تمام فیورٹ صاف کر دیے گئے',
    textCleared: 'ٹیکسٹ صاف کر دیا گیا',
    languagesSwapped: 'زبانیں تبدیل کر دی گئیں',
    novaTranslator: 'نوا ٹرانسلیٹر',
  },
};

export function t(key: keyof typeof translations['en'], lang: AppLanguage = 'en'): string {
  return translations[lang]?.[key] || translations['en'][key] || key;
}
