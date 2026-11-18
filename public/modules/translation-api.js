/**
 * Translation & Photo OCR API Client
 * Calls server-side Gemini endpoints (/api/translate, /api/image-translate)
 * with a strict 25-second timeout and real error propagation.
 */

import { getLanguages, getTranslationName, isRtl } from './language-manager.js';

const API_TIMEOUT_MS = 25000;
const MAX_TEXT_LENGTH = 5000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function isAutoLanguage(lang) {
  const raw = String(lang || '').trim().toLowerCase();
  if (!raw) return true;
  const firstWord = raw.split(/\s+/)[0];
  return raw === 'auto' || firstWord === 'auto' || firstWord === 'detect';
}

function detectRtlOutput(targetLang, translatedText) {
  if (isRtl(targetLang)) return true;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/.test(
    String(translatedText || '')
  );
}

function estimateBase64Bytes(base64) {
  const clean = String(base64 || '').trim();
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
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
  const rawText = await res.text();
  let parsed = null;

  if (contentType.includes('application/json') || rawText.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const serverMessage =
      (parsed && typeof parsed.error === 'string' && parsed.error) ||
      (parsed && parsed.error && parsed.error.message) ||
      (parsed && typeof parsed.message === 'string' && parsed.message) ||
      (rawText && rawText.length < 240 ? rawText : '') ||
      `Server error (${res.status})`;
    throw new Error(serverMessage);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Server ne invalid JSON jawab diya.');
  }

  return parsed;
}

async function postJsonWithTimeout(url, payload, { timeoutMs = API_TIMEOUT_MS, signal } = {}) {
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
    const res = await fetch(url, {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return await parseApiResponse(res);
  } catch (err) {
    if (timedOut) {
      throw new Error('Server ne time par jawab nahi diya. Dobara koshish karein.');
    }
    throw err;
  } finally {
    clearTimeout(timerId);
    if (signal) {
      signal.removeEventListener('abort', forwardAbort);
    }
  }
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

  const cleanSource = String(sourceLanguage || '').trim() || 'auto';
  const cleanTarget = String(targetLanguage || '').trim() || 'Urdu';

  const payloadSource = isAutoLanguage(cleanSource) ? 'auto' : getTranslationName(cleanSource);
  const payloadTarget = getTranslationName(cleanTarget);

  const data = await postJsonWithTimeout(
    '/api/translate',
    {
      text: cleanText,
      sourceLanguage: payloadSource,
      targetLanguage: payloadTarget,
    },
    options
  );

  const translatedText = String(data.translatedText || '').trim();
  if (!translatedText) {
    throw new Error('Server ne khaali translation bheji.');
  }

  const detectedSourceLanguage = String(
    data.detectedSourceLanguage || (payloadSource === 'auto' ? 'Auto-detected' : payloadSource)
  ).trim();

  return {
    sourceLanguage: detectedSourceLanguage,
    detectedSourceLanguage,
    targetLanguage: payloadTarget,
    originalText: cleanText,
    translatedText,
    confidence: typeof data.confidence === 'number' && Number.isFinite(data.confidence)
      ? data.confidence
      : null,
    provider: 'gemini',
    direction: detectRtlOutput(payloadTarget, translatedText) ? 'rtl' : 'ltr',
    timestamp: new Date().toISOString(),
  };
}

export async function translateImage(
  { imageBase64, mimeType = 'image/jpeg', sourceLanguage, targetLanguage = 'Urdu' },
  options = {}
) {
  const cleanImage = String(imageBase64 || '').trim();
  if (!cleanImage) {
    throw new Error('Image data is required for OCR translation.');
  }

  const rawB64 = cleanImage.includes(',') ? cleanImage.split(',')[1] : cleanImage;
  if (estimateBase64Bytes(rawB64) > MAX_IMAGE_BYTES) {
    throw new Error('Photo bahut bari hai. Chhoti photo chunein.');
  }

  const cleanSource = String(sourceLanguage || '').trim() || 'auto';
  const cleanTarget = String(targetLanguage || '').trim() || 'Urdu';

  const payloadSource = isAutoLanguage(cleanSource) ? 'auto' : getTranslationName(cleanSource);
  const payloadTarget = getTranslationName(cleanTarget);

  const data = await postJsonWithTimeout(
    '/api/image-translate',
    {
      imageBase64: rawB64,
      mimeType: mimeType || 'image/jpeg',
      sourceLanguage: payloadSource,
      targetLanguage: payloadTarget,
    },
    options
  );

  const extractedText = String(data.extractedText || '').trim();
  const translatedText = String(data.translatedText || '').trim();

  if (!extractedText || !translatedText) {
    throw new Error('Is photo se likhai ya tarjuma hasil nahi hua.');
  }

  return {
    extractedText,
    translatedText,
    detectedSourceLanguage: payloadSource,
    targetLanguage: payloadTarget,
    timestamp: new Date().toISOString(),
  };
}

function detectScriptLocal(text) {
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

export async function detectLanguage(text) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Text is required for language detection.');
  }
  return detectScriptLocal(cleanText);
}

export async function fetchSupportedLanguages() {
  return { languages: getLanguages() };
}

export async function checkApiHealth() {
  return {
    status: 'ok',
    mode: 'server-gemini',
    timestamp: new Date().toISOString(),
  };
}
