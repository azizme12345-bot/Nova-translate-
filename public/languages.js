(function (window) {
  'use strict';

  var LANGUAGES = [
    { label: 'English 🇬🇧', name: 'English', speechCode: 'en-US', rtl: false, code: 'en', nativeName: 'English' },
    { label: 'Urdu 🇵🇰', name: 'Urdu', speechCode: 'ur-PK', rtl: true, code: 'ur', nativeName: 'اردو' },
    { label: 'Punjabi 🇵🇰', name: 'Punjabi', speechCode: 'pa-IN', rtl: true, code: 'pa', nativeName: 'پنجابی / ਪੰਜਾਬੀ' },
    { label: 'Arabic 🇸🇦', name: 'Arabic', speechCode: 'ar-SA', rtl: true, code: 'ar', nativeName: 'العربية' },
    { label: 'Hindi 🇮🇳', name: 'Hindi', speechCode: 'hi-IN', rtl: false, code: 'hi', nativeName: 'हिन्दी' },
    { label: 'Chinese 🇨🇳', name: 'Chinese', speechCode: 'zh-CN', rtl: false, code: 'zh', nativeName: '中文 (简体)' },
    { label: 'Korean 🇰🇷', name: 'Korean', speechCode: 'ko-KR', rtl: false, code: 'ko', nativeName: '한국어' },
    { label: 'Japanese 🇯🇵', name: 'Japanese', speechCode: 'ja-JP', rtl: false, code: 'ja', nativeName: '日本語' },
    { label: 'Spanish 🇪🇸', name: 'Spanish', speechCode: 'es-ES', rtl: false, code: 'es', nativeName: 'Español' },
    { label: 'French 🇫🇷', name: 'French', speechCode: 'fr-FR', rtl: false, code: 'fr', nativeName: 'Français' },
    { label: 'German 🇩🇪', name: 'German', speechCode: 'de-DE', rtl: false, code: 'de', nativeName: 'Deutsch' },
    { label: 'Portuguese 🇵🇹', name: 'Portuguese', speechCode: 'pt-PT', rtl: false, code: 'pt', nativeName: 'Português' },
    { label: 'Russian 🇷🇺', name: 'Russian', speechCode: 'ru-RU', rtl: false, code: 'ru', nativeName: 'Русский' },
    { label: 'Turkish 🇹🇷', name: 'Turkish', speechCode: 'tr-TR', rtl: false, code: 'tr', nativeName: 'Türkçe' },
    { label: 'Persian 🇮🇷', name: 'Persian', speechCode: 'fa-IR', rtl: true, code: 'fa', nativeName: 'فارسی' },
    { label: 'Bengali 🇧🇩', name: 'Bengali', speechCode: 'bn-BD', rtl: false, code: 'bn', nativeName: 'বাংলা' },
    { label: 'Indonesian 🇮🇩', name: 'Indonesian', speechCode: 'id-ID', rtl: false, code: 'id', nativeName: 'Bahasa Indonesia' },
    { label: 'Italian 🇮🇹', name: 'Italian', speechCode: 'it-IT', rtl: false, code: 'it', nativeName: 'Italiano' },
    { label: 'Dutch 🇳🇱', name: 'Dutch', speechCode: 'nl-NL', rtl: false, code: 'nl', nativeName: 'Nederlands' },
    { label: 'Pashto 🇦🇫', name: 'Pashto', speechCode: 'ps-AF', rtl: true, code: 'ps', nativeName: 'پښتو' },
    { label: 'Sindhi 🇵🇰', name: 'Sindhi', speechCode: 'sd-PK', rtl: true, code: 'sd', nativeName: 'سنڌي' },
    { label: 'Malay 🇲🇾', name: 'Malay', speechCode: 'ms-MY', rtl: false, code: 'ms', nativeName: 'Bahasa Melayu' },
    { label: 'Vietnamese 🇻🇳', name: 'Vietnamese', speechCode: 'vi-VN', rtl: false, code: 'vi', nativeName: 'Tiếng Việt' },
    { label: 'Thai 🇹🇭', name: 'Thai', speechCode: 'th-TH', rtl: false, code: 'th', nativeName: 'ไทย' },
    { label: 'Polish 🇵🇱', name: 'Polish', speechCode: 'pl-PL', rtl: false, code: 'pl', nativeName: 'Polski' },
    { label: 'Ukrainian 🇺🇦', name: 'Ukrainian', speechCode: 'uk-UA', rtl: false, code: 'uk', nativeName: 'Українська' },
    { label: 'Greek 🇬🇷', name: 'Greek', speechCode: 'el-GR', rtl: false, code: 'el', nativeName: 'Ελληνικά' },
    { label: 'Swedish 🇸🇪', name: 'Swedish', speechCode: 'sv-SE', rtl: false, code: 'sv', nativeName: 'Svenska' },
    { label: 'Swahili 🇰🇪', name: 'Swahili', speechCode: 'sw-KE', rtl: false, code: 'sw', nativeName: 'Kiswahili' },
    { label: 'Tamil 🇮🇳', name: 'Tamil', speechCode: 'ta-IN', rtl: false, code: 'ta', nativeName: 'தமிழ்' },
    { label: 'Telugu 🇮🇳', name: 'Telugu', speechCode: 'te-IN', rtl: false, code: 'te', nativeName: 'తెలుగు' },
    { label: 'Marathi 🇮🇳', name: 'Marathi', speechCode: 'mr-IN', rtl: false, code: 'mr', nativeName: 'मराठी' },
    { label: 'Gujarati 🇮🇳', name: 'Gujarati', speechCode: 'gu-IN', rtl: false, code: 'gu', nativeName: 'ગુજરાતી' },
    { label: 'Romanian 🇷🇴', name: 'Romanian', speechCode: 'ro-RO', rtl: false, code: 'ro', nativeName: 'Română' },
    { label: 'Hebrew 🇮🇱', name: 'Hebrew', speechCode: 'he-IL', rtl: true, code: 'he', nativeName: 'עברית' }
  ];

  function findLanguage(value) {
    var raw = String(value || '').trim();
    if (!raw) return null;
    var firstWord = raw.split(/\s+/)[0].toLowerCase();
    for (var i = 0; i < LANGUAGES.length; i++) {
      var item = LANGUAGES[i];
      if (
        item.label === raw ||
        item.name.toLowerCase() === raw.toLowerCase() ||
        item.name.toLowerCase() === firstWord ||
        item.code.toLowerCase() === raw.toLowerCase()
      ) {
        return item;
      }
    }
    return null;
  }

  function getTranslationName(value) {
    var found = findLanguage(value);
    if (found) return found.name;
    var raw = String(value || '').trim();
    return raw ? raw.split(/\s+/)[0] : 'English';
  }

  function getSpeechCode(value) {
    var found = findLanguage(value);
    return found ? found.speechCode : 'en-US';
  }

  function getShortCode(value) {
    var found = findLanguage(value);
    return found ? found.code : 'en';
  }

  function isRtl(value) {
    var found = findLanguage(value);
    return found ? !!found.rtl : false;
  }

  window.LAFZ_LANGUAGES = LANGUAGES;
  window.LAFZLang = {
    list: LANGUAGES,
    count: LANGUAGES.length,
    find: findLanguage,
    getTranslationName: getTranslationName,
    getSpeechCode: getSpeechCode,
    getShortCode: getShortCode,
    isRtl: isRtl
  };
})(window);
