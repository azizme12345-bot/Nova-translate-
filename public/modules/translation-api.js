/**
 * Browser-Only Translation & OCR API Module
 * 100% client-side: zero backend calls, zero API keys.
 * - Text Translation: localStorage cache (0ms) -> Chrome built-in Translator API -> Google Translate (gtx) -> MyMemory fallback
 * - Photo OCR: Tesseract.js in browser -> instant text translation
 * - Language Detection: Google Translate auto-detect + Unicode script fallback
 */

import { getLanguages, getShortCode, getTranslationName, isRtl } from './language-manager.js';

const DEFAULT_TIMEOUT_MS = 20000;
const OCR_TIMEOUT_MS = 45000;
const MAX_TEXT_LENGTH = 5000;
const API_CACHE_KEY = 'lafz_browser_translation_cache_v1';
const API_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const API_CACHE_MAX = 300;

const TESSERACT_CDN_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

const GTX_CODE_OVERRIDES = {
  zh: 'zh-CN',
};

const TESSERACT_LANG_MAP = {
  english: 'eng',
  urdu: 'urd',
  arabic: 'ara',
  punjabi: 'pan',
  hindi: 'hin',
  chinese: 'chi_sim',
  korean: 'kor',
  japanese: 'jpn',
  spanish: 'spa',
  french: 'fra',
  german: 'deu',
  portuguese: 'por',
  russian: 'rus',
  turkish: 'tur',
  persian: 'fas',
  bengali: 'ben',
  indonesian: 'ind',
  italian: 'ita',
  dutch: 'nld',
  pashto: 'pus',
  sindhi: 'snd',
  malay: 'msa',
  vietnamese: 'vie',
  thai: 'tha',
  polish: 'pol',
  ukrainian: 'ukr',
  greek: 'ell',
  swedish: 'swe',
  swahili: 'swa',
  tamil: 'tam',
  telugu: 'tel',
  marathi: 'mar',
  gujarati: 'guj',
  romanian: 'ron',
  hebrew: 'heb',
};

let tesseractLoadPromise = null;

function isAutoLanguage(lang) {
  const raw = String(lang || '').trim().toLowerCase();
  if (!raw) return true;
  const firstWord = raw.split(/\s+/)[0];
  return raw === 'auto' || firstWord === 'auto' || firstWord === 'detect';
}

function toApiLangCode(lang, allowAuto = false) {
  if (allowAuto && isAutoLanguage(lang)) return 'auto';
  const short = getShortCode(lang) || 'en';
  return GTX_CODE_OVERRIDES[short] || short;
}

function toBcp47Short(lang) {
  if (isAutoLanguage(lang)) return '';
  return getShortCode(lang) || 'en';
}

function detectRtlOutput(targetLang, translatedText) {
  if (isRtl(targetLang)) return true;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/.test(
    String(translatedText || '')
  );
}

function buildCacheKey(sl, tl, text) {
  return `${sl}::${tl}::${String(text || '').trim().toLowerCase()}`;
}

function readCachedResult(sl, tl, text) {
  try {
    const raw = localStorage.getItem(API_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key = buildCacheKey(sl, tl, text);
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > API_CACHE_TTL_MS) {
      delete cache[key];
      localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCachedResult(sl, tl, text, data) {
  if (!data || !data.translatedText) return;
  try {
    const cache = JSON.parse(localStorage.getItem(API_CACHE_KEY) || '{}');
    const key = buildCacheKey(sl, tl, text);
    const keys = Object.keys(cache);
    if (keys.length >= API_CACHE_MAX) {
      keys.sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0));
      keys.slice(0, keys.length - API_CACHE_MAX + 1).forEach((k) => delete cache[k]);
    }
    cache[key] = { ts: Date.now(), data };
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildApiHeaders(extra = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach((key) => {
      headers[key] = extra[key];
    });
  }
  return headers;
}

export async function parseApiResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) {
      throw new Error((json && json.error && json.error.message) || `Request failed (${res.status})`);
    }
    return json;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.text();
}

async function fetchJsonWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  let timedOut = false;

  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timerId);
      const abortErr = new Error('Request cancelled');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Translation request failed (HTTP ${res.status})`);
    }
    return await res.json();
  } catch (err) {
    if (timedOut) {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timerId);
    if (signal) {
      signal.removeEventListener('abort', forwardAbort);
    }
  }
}

async function tryChromeBuiltInTranslator(text, srcCode, tgtCode, signal) {
  if (!srcCode || !tgtCode || srcCode === 'auto' || srcCode === tgtCode) {
    return null;
  }

  try {
    // Newer Chrome Translator global (window.Translator / self.Translator)
    const translatorGlobal =
      (typeof self !== 'undefined' && self.Translator) ||
      (typeof window !== 'undefined' && window.Translator) ||
      null;

    if (translatorGlobal && typeof translatorGlobal.create === 'function') {
      if (typeof translatorGlobal.availability === 'function') {
        const avail = await translatorGlobal.availability({
          sourceLanguage: srcCode,
          targetLanguage: tgtCode,
        });
        if (avail !== 'available' && avail !== 'readily') {
          return null;
        }
      }
      const translator = await translatorGlobal.create({
        sourceLanguage: srcCode,
        targetLanguage: tgtCode,
        signal,
      });
      if (translator && typeof translator.translate === 'function') {
        const out = await translator.translate(text);
        if (typeof translator.destroy === 'function') translator.destroy();
        return String(out || '').trim() || null;
      }
    }

    // Earlier Chrome Origin Trial API (window.translation / self.translation)
    const legacyApi =
      (typeof self !== 'undefined' && self.translation) ||
      (typeof window !== 'undefined' && window.translation) ||
      null;

    if (legacyApi && typeof legacyApi.createTranslator === 'function') {
      if (typeof legacyApi.canTranslate === 'function') {
        const status = await legacyApi.canTranslate({
          sourceLanguage: srcCode,
          targetLanguage: tgtCode,
        });
        if (status !== 'readily') {
          return null;
        }
      }
      const translator = await legacyApi.createTranslator({
        sourceLanguage: srcCode,
        targetLanguage: tgtCode,
      });
      if (translator && typeof translator.translate === 'function') {
        const out = await translator.translate(text);
        if (typeof translator.destroy === 'function') translator.destroy();
        return String(out || '').trim() || null;
      }
    }
  } catch {
    // Fall back silently to public browser translation API
  }

  return null;
}

async function translateViaGoogleGtx(text, sl, tl, options = {}) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
    sl
  )}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

  const data = await fetchJsonWithTimeout(url, options);
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected response from Google Translate.');
  }

  const translated = data[0]
    .map((part) => (Array.isArray(part) ? String(part[0] || '') : ''))
    .join('')
    .trim();

  if (!translated) {
    throw new Error('Empty translation returned.');
  }

  const detectedCode = typeof data[2] === 'string' ? data[2] : sl;
  return { translatedText: translated, detectedCode };
}

async function translateViaMyMemory(text, sl, tl, options = {}) {
  const srcForPair = !sl || sl === 'auto' ? 'en' : sl;
  if (srcForPair === tl) {
    return { translatedText: text, detectedCode: srcForPair };
  }

  const chunk = text.slice(0, 500);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    chunk
  )}&langpair=${encodeURIComponent(srcForPair)}|${encodeURIComponent(tl)}`;

  const data = await fetchJsonWithTimeout(url, options);
  const translated =
    data && data.responseData && typeof data.responseData.translatedText === 'string'
      ? data.responseData.translatedText.trim()
      : '';

  if (!translated || (data && Number(data.responseStatus) >= 400)) {
    throw new Error('Backup translation service unavailable.');
  }

  return { translatedText: translated, detectedCode: srcForPair };
}

export async function translateText(
  { text, sourceLanguage, targetLanguage },
  options = {}
) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Please enter text to translate.');
  }
  if (cleanText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Input text exceeds the ${MAX_TEXT_LENGTH.toLocaleString()} character limit.`);
  }

  const cleanSource = String(sourceLanguage || '').trim() || 'Auto Detect';
  const cleanTarget = String(targetLanguage || '').trim() || 'English';

  const sl = toApiLangCode(cleanSource, true);
  const tl = toApiLangCode(cleanTarget, false);

  if (sl !== 'auto' && sl === tl) {
    return {
      sourceLanguage: getTranslationName(cleanSource),
      targetLanguage: getTranslationName(cleanTarget),
      originalText: cleanText,
      translatedText: cleanText,
      confidence: null,
      provider: 'browser',
      direction: detectRtlOutput(cleanTarget, cleanText) ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: true,
    };
  }

  // 1. Instant 0ms localStorage cache check
  const cached = readCachedResult(sl, tl, cleanText);
  if (cached && cached.translatedText) {
    return {
      ...cached,
      fromCache: true,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Chrome built-in on-device Translator API (instant offline when available)
  const chromeSrc = toBcp47Short(cleanSource);
  const chromeTgt = toBcp47Short(cleanTarget);
  const onDeviceText = await tryChromeBuiltInTranslator(
    cleanText,
    chromeSrc,
    chromeTgt,
    options.signal
  );

  if (onDeviceText) {
    const onDeviceResult = {
      sourceLanguage: getTranslationName(cleanSource),
      targetLanguage: getTranslationName(cleanTarget),
      originalText: cleanText,
      translatedText: onDeviceText,
      confidence: null,
      provider: 'chrome-on-device',
      direction: detectRtlOutput(cleanTarget, onDeviceText) ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };
    writeCachedResult(sl, tl, cleanText, onDeviceResult);
    return onDeviceResult;
  }

  // 3. Direct browser fetch: Google Translate (gtx) with MyMemory backup
  let translatedText = '';
  let detectedCode = sl;
  let provider = 'browser-google';

  try {
    const gtx = await translateViaGoogleGtx(cleanText, sl, tl, options);
    translatedText = gtx.translatedText;
    detectedCode = gtx.detectedCode || sl;
  } catch (gtxErr) {
    if (gtxErr && gtxErr.name === 'AbortError') {
      throw gtxErr;
    }
    const mm = await translateViaMyMemory(cleanText, sl, tl, options);
    translatedText = mm.translatedText;
    detectedCode = mm.detectedCode || sl;
    provider = 'browser-mymemory';
  }

  const result = {
    sourceLanguage: isAutoLanguage(cleanSource)
      ? getTranslationName(detectedCode) || 'Auto-detected'
      : getTranslationName(cleanSource),
    targetLanguage: getTranslationName(cleanTarget),
    originalText: cleanText,
    translatedText,
    confidence: null,
    provider,
    direction: detectRtlOutput(cleanTarget, translatedText) ? 'rtl' : 'ltr',
    timestamp: new Date().toISOString(),
    fromCache: false,
  };

  writeCachedResult(sl, tl, cleanText, result);
  return result;
}

function loadTesseract() {
  if (typeof window !== 'undefined' && window.Tesseract && typeof window.Tesseract.recognize === 'function') {
    return Promise.resolve(window.Tesseract);
  }
  if (tesseractLoadPromise) {
    return tesseractLoadPromise;
  }

  tesseractLoadPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Browser environment is required for OCR.'));
      return;
    }

    const existing = document.querySelector('script[data-lafz-tesseract="1"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Tesseract) resolve(window.Tesseract);
        else reject(new Error('Failed to initialize browser OCR engine.'));
      });
      existing.addEventListener('error', () => {
        tesseractLoadPromise = null;
        reject(new Error('Could not load browser OCR engine. Check your internet connection.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = TESSERACT_CDN_URL;
    script.async = true;
    script.setAttribute('data-lafz-tesseract', '1');
    script.onload = () => {
      if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
        resolve(window.Tesseract);
      } else {
        tesseractLoadPromise = null;
        reject(new Error('Browser OCR engine loaded without Tesseract API.'));
      }
    };
    script.onerror = () => {
      tesseractLoadPromise = null;
      reject(new Error('Could not load browser OCR engine. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });

  return tesseractLoadPromise;
}

function getTesseractLang(sourceLanguage) {
  const name = getTranslationName(sourceLanguage || 'English').trim().toLowerCase();
  const code = TESSERACT_LANG_MAP[name] || 'eng';
  return code === 'eng' ? 'eng' : `${code}+eng`;
}

export async function translateImage(
  { imageBase64, mimeType = 'image/jpeg', sourceLanguage, targetLanguage = 'Urdu' },
  options = {}
) {
  const cleanImage = String(imageBase64 || '').trim();
  if (!cleanImage) {
    throw new Error('Image data is required for OCR translation.');
  }

  const imageSrc = cleanImage.startsWith('data:')
    ? cleanImage
    : `data:${mimeType || 'image/jpeg'};base64,${cleanImage}`;

  const Tesseract = await loadTesseract();
  const ocrLang = getTesseractLang(sourceLanguage);

  const ocrPromise = Tesseract.recognize(imageSrc, ocrLang);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Image scanning timed out. Please try a clearer image.')), OCR_TIMEOUT_MS)
  );

  let ocrResult;
  try {
    ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
  } catch (err) {
    if (ocrLang !== 'eng') {
      ocrResult = await Tesseract.recognize(imageSrc, 'eng');
    } else {
      throw err;
    }
  }

  const extractedText = String(ocrResult && ocrResult.data && ocrResult.data.text ? ocrResult.data.text : '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!extractedText) {
    throw new Error('No text detected in this image.');
  }

  const translated = await translateText(
    {
      text: extractedText,
      sourceLanguage: sourceLanguage || 'Auto Detect',
      targetLanguage: String(targetLanguage || 'Urdu').trim(),
    },
    options
  );

  return {
    extractedText,
    translatedText: translated.translatedText,
    detectedSourceLanguage: translated.sourceLanguage || sourceLanguage || 'Auto-detected',
    targetLanguage: translated.targetLanguage,
    timestamp: new Date().toISOString(),
  };
}

function detectScriptFallback(text) {
  const sample = String(text || '');
  if (/[\u0600-\u06FF]/.test(sample)) {
    if (/[\u0679\u0688\u0691\u06BA\u06BE\u06C1\u06D2]/.test(sample)) {
      return { detectedLanguage: 'Urdu', languageCode: 'ur', direction: 'rtl' };
    }
    return { detectedLanguage: 'Arabic', languageCode: 'ar', direction: 'rtl' };
  }
  if (/[\u0900-\u097F]/.test(sample)) {
    return { detectedLanguage: 'Hindi', languageCode: 'hi', direction: 'ltr' };
  }
  if (/[\u0980-\u09FF]/.test(sample)) {
    return { detectedLanguage: 'Bengali', languageCode: 'bn', direction: 'ltr' };
  }
  if (/[\u0400-\u04FF]/.test(sample)) {
    return { detectedLanguage: 'Russian', languageCode: 'ru', direction: 'ltr' };
  }
  if (/[\u4E00-\u9FFF]/.test(sample)) {
    return { detectedLanguage: 'Chinese', languageCode: 'zh', direction: 'ltr' };
  }
  if (/[\u3040-\u30FF]/.test(sample)) {
    return { detectedLanguage: 'Japanese', languageCode: 'ja', direction: 'ltr' };
  }
  if (/[\uAC00-\uD7AF]/.test(sample)) {
    return { detectedLanguage: 'Korean', languageCode: 'ko', direction: 'ltr' };
  }
  if (/[\u0590-\u05FF]/.test(sample)) {
    return { detectedLanguage: 'Hebrew', languageCode: 'he', direction: 'rtl' };
  }
  return { detectedLanguage: 'English', languageCode: 'en', direction: 'ltr' };
}

export async function detectLanguage(text, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Text is required for language detection.');
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(
      cleanText.slice(0, 500)
    )}`;
    const data = await fetchJsonWithTimeout(url, { timeoutMs: 10000, ...options });
    const rawCode = Array.isArray(data) && typeof data[2] === 'string' ? data[2] : '';
    const baseCode = rawCode.split('-')[0].toLowerCase();
    if (baseCode) {
      const name = getTranslationName(baseCode);
      return {
        detectedLanguage: name,
        languageCode: baseCode,
        direction: isRtl(baseCode) ? 'rtl' : 'ltr',
      };
    }
  } catch {
    // Fall back to local Unicode script detection
  }

  return detectScriptFallback(cleanText);
}

export async function fetchSupportedLanguages() {
  return { languages: getLanguages() };
}

export async function checkApiHealth() {
  return {
    status: 'ok',
    mode: 'browser-only',
    timestamp: new Date().toISOString(),
  };
}
