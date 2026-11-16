/**
 * Language Management Module
 * Single source of truth for supported languages, codes, RTL direction,
 * dropdown binding, language switching, and auto-detection integration.
 */

import { detectLanguage as detectLanguageApi } from './translation-api.js';
import { escapeHtml, showToast } from './ui-utils.js';

export const LANGUAGES = [
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
  { label: 'Hebrew 🇮🇱', name: 'Hebrew', speechCode: 'he-IL', rtl: true, code: 'he', nativeName: 'עברית' },
];

export function getLanguages() {
  return LANGUAGES;
}

export function getLanguageCount() {
  return LANGUAGES.length;
}

export function findLanguage(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lowerRaw = raw.toLowerCase();
  const firstWord = raw.split(/\s+/)[0].toLowerCase();

  for (let i = 0; i < LANGUAGES.length; i++) {
    const item = LANGUAGES[i];
    if (
      item.label === raw ||
      item.name.toLowerCase() === lowerRaw ||
      item.name.toLowerCase() === firstWord ||
      item.code.toLowerCase() === lowerRaw
    ) {
      return item;
    }
  }
  return null;
}

export function getTranslationName(value) {
  const found = findLanguage(value);
  if (found) return found.name;
  const raw = String(value || '').trim();
  return raw ? raw.split(/\s+/)[0] : 'English';
}

export function getSpeechCode(value) {
  const found = findLanguage(value);
  return found ? found.speechCode : 'en-US';
}

export function getShortCode(value) {
  const found = findLanguage(value);
  return found ? found.code : 'en';
}

export function isRtl(value) {
  const found = findLanguage(value);
  return found ? Boolean(found.rtl) : false;
}

export function createLanguageManager(callbacks = {}) {
  const sourceLangEl = document.getElementById('sourceLang');
  const targetLangEl = document.getElementById('targetLang');
  const swapLangEl = document.getElementById('swapLang');
  const ocrSourceEl = document.getElementById('ocrSource');
  const ocrTargetEl = document.getElementById('ocrTarget');
  const sourceLabelHead = document.getElementById('sourceLabelHead');
  const targetLabelHead = document.getElementById('targetLabelHead');
  const sourceTextEl = document.getElementById('sourceText');
  const outputEl = document.getElementById('output');
  const languagesCatalogGrid = document.getElementById('languagesCatalogGrid');

  function getSourceLanguage() {
    return (sourceLangEl && sourceLangEl.value) || 'English 🇬🇧';
  }

  function getTargetLanguage() {
    return (targetLangEl && targetLangEl.value) || 'Urdu 🇵🇰';
  }

  function populateDropdowns() {
    const defaultSrc = document.body.getAttribute('data-default-source') || 'English 🇬🇧';
    const defaultTgt = document.body.getAttribute('data-default-target') || 'Urdu 🇵🇰';
    const optionsHtml = LANGUAGES.map(
      (lang) => `<option value="${escapeHtml(lang.label)}">${escapeHtml(lang.label)}</option>`
    ).join('');

    [sourceLangEl, targetLangEl, ocrSourceEl, ocrTargetEl].forEach((selectEl, idx) => {
      if (!selectEl) return;
      selectEl.innerHTML = optionsHtml;
      selectEl.value = idx % 2 === 0 ? defaultSrc : defaultTgt;
    });

    if (languagesCatalogGrid) {
      languagesCatalogGrid.innerHTML = LANGUAGES.map(
        (lang) =>
          `<div class="lang-card">` +
          `<div style="display:flex;align-items:center;justify-content:space-between;">` +
          `<strong style="font-size:16px;color:var(--navy);">${escapeHtml(lang.label)}</strong>` +
          `<span style="font-size:11px;font-weight:700;background:#dbeafe;color:var(--blue);padding:2px 8px;border-radius:999px;text-transform:uppercase;">${escapeHtml(lang.code)}</span>` +
          `</div>` +
          `<div style="font-size:13px;color:var(--muted);">Native Name: <strong style="color:var(--ink);">${escapeHtml(lang.nativeName)}</strong></div>` +
          `<div style="font-size:12px;color:var(--muted);">Text &amp; Voice Translation: <strong style="color:var(--blue);">Supported</strong></div>` +
          `</div>`
      ).join('');
    }
  }

  function syncDirections(hasResult = false) {
    const src = getSourceLanguage();
    const tgt = getTargetLanguage();
    const srcName = getTranslationName(src);
    const tgtName = getTranslationName(tgt);

    if (sourceLabelHead) sourceLabelHead.textContent = `Source (${srcName})`;
    if (targetLabelHead) targetLabelHead.textContent = `Translation (${tgtName})`;

    const srcRtl = isRtl(src);
    if (sourceTextEl) {
      sourceTextEl.setAttribute('dir', srcRtl ? 'rtl' : 'ltr');
      sourceTextEl.classList.toggle('rtl-text', srcRtl);
    }

    const tgtRtl = isRtl(tgt) && Boolean(hasResult);
    if (outputEl) {
      outputEl.setAttribute('dir', tgtRtl ? 'rtl' : 'ltr');
      outputEl.classList.toggle('rtl-text', tgtRtl);
    }

    if (typeof callbacks.onDirectionsSynced === 'function') {
      callbacks.onDirectionsSynced({ source: src, target: tgt });
    }
  }

  function setLanguagePair(src, tgt) {
    if (sourceLangEl && src) sourceLangEl.value = src;
    if (targetLangEl && tgt) targetLangEl.value = tgt;
    syncDirections(false);
  }

  function swapLanguages() {
    if (!sourceLangEl || !targetLangEl) return;
    const prevSource = sourceLangEl.value;
    sourceLangEl.value = targetLangEl.value;
    targetLangEl.value = prevSource;
    if (typeof callbacks.onSwap === 'function') {
      callbacks.onSwap({
        source: sourceLangEl.value,
        target: targetLangEl.value,
      });
    } else {
      syncDirections(false);
    }
    showToast('Languages swapped');
  }

  async function detectAndSelectSource(text) {
    const clean = String(text || '').trim();
    if (!clean) return null;
    try {
      const detected = await detectLanguageApi(clean);
      const match = findLanguage(detected && (detected.languageCode || detected.detectedLanguage));
      if (match && sourceLangEl) {
        sourceLangEl.value = match.label;
        syncDirections(false);
        return match;
      }
      return detected;
    } catch {
      return null;
    }
  }

  function init() {
    populateDropdowns();
    syncDirections(false);

    if (sourceLangEl) {
      sourceLangEl.addEventListener('change', () => {
        if (typeof callbacks.onLanguageChange === 'function') {
          callbacks.onLanguageChange({
            source: getSourceLanguage(),
            target: getTargetLanguage(),
          });
        } else {
          syncDirections(false);
        }
      });
    }

    if (targetLangEl) {
      targetLangEl.addEventListener('change', () => {
        if (typeof callbacks.onLanguageChange === 'function') {
          callbacks.onLanguageChange({
            source: getSourceLanguage(),
            target: getTargetLanguage(),
          });
        } else {
          syncDirections(false);
        }
      });
    }

    if (swapLangEl) {
      swapLangEl.addEventListener('click', swapLanguages);
    }
  }

  return {
    init,
    getSourceLanguage,
    getTargetLanguage,
    setLanguagePair,
    swapLanguages,
    syncDirections,
    detectAndSelectSource,
  };
}
