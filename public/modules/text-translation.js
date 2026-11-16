/**
 * Text Translation Module
 * Handles normal text-to-text translation only: caching, offline fallback,
 * input debouncing, API translation calls, output rendering, and loading/error states.
 */

import { translateText } from './translation-api.js';
import { getShortCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';
const CACHE_KEY = 'nova_translation_cache_v3';
const FORCE_OFFLINE_KEY = 'nova_force_offline';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 250;

const OFFLINE_DICTIONARY = {
  en_to_ur: {
    hello: 'سلام / ہیلو',
    welcome: 'خوش آمدید',
    'how are you': 'آپ کیسے ہیں؟',
    'thank you': 'شکریہ',
    thanks: 'شکریہ',
    'good morning': 'صبح بخیر',
    'good evening': 'شام بخیر',
    'good night': 'شب بخیر',
    yes: 'جی ہاں',
    no: 'جی نہیں',
    please: 'براہ کرم',
    sorry: 'معذرت / معاف کیجیے',
    goodbye: 'خدا حافظ',
    bye: 'اللہ حافظ',
    'what is your name': 'آپ کا نام کیا ہے؟',
    'my name is': 'میرا نام ... ہے',
    'where is the bathroom': 'باتھ روم کہاں ہے؟',
    help: 'مدد کریں',
    'i love you': 'میں آپ سے محبت کرتا ہوں',
    'how much is this': 'یہ کتنے کا ہے؟',
    water: 'پانی',
    food: 'کھانا',
    hospital: 'ہسپتال',
    doctor: 'ڈاکٹر',
  },
  ur_to_en: {
    'سلام': 'Hello / Peace be upon you',
    'ہیلو': 'Hello',
    'خوش آمدید': 'Welcome',
    'آپ کیسے ہیں': 'How are you?',
    'آپ کیسے ہیں؟': 'How are you?',
    'شکریہ': 'Thank you',
    'صبح بخیر': 'Good morning',
    'شام بخیر': 'Good evening',
    'شب بخیر': 'Good night',
    'جی ہاں': 'Yes',
    'جی نہیں': 'No',
    'براہ کرم': 'Please',
    'معذرت': 'Sorry',
    'خدا حافظ': 'Goodbye',
    'الله حافظ': 'Goodbye',
    'آپ کا نام کیا ہے؟': 'What is your name?',
    'پانی': 'Water',
    'کھانا': 'Food',
    'ہسپتال': 'Hospital',
    'مدد': 'Help',
  },
  en_to_ar: {
    hello: 'مرحباً / السلام عليكم',
    welcome: 'أهلاً وسهلاً',
    'how are you': 'كيف حالك؟',
    'thank you': 'شكراً جزيلاً',
    'good morning': 'صباح الخير',
    'good evening': 'مساء الخير',
    yes: 'نعم',
    no: 'لا',
    please: 'من فضلك',
    sorry: 'آسف',
    goodbye: 'مع السلامة',
  },
  en_to_hi: {
    hello: 'नमस्ते (Namaste)',
    welcome: 'स्वागत है',
    'how are you': 'आप कैसे हैं?',
    'thank you': 'धन्यवाद / शुक्रिया',
    'good morning': 'सुप्रभात',
    yes: 'हाँ',
    no: 'नहीं',
    please: 'कृपया',
    sorry: 'क्षमा करें',
    goodbye: 'अलविदा',
  },
  en_to_es: {
    hello: 'Hola',
    welcome: 'Bienvenido',
    'how are you': '¿Cómo estás?',
    'thank you': 'Gracias',
    'good morning': 'Buenos días',
    yes: 'Sí',
    no: 'No',
    please: 'Por favor',
    sorry: 'Lo siento',
    goodbye: 'Adiós',
  },
};

function normalizeCacheKey(text, src, tgt) {
  return encodeURIComponent(
    `${String(src || 'auto').trim().toLowerCase()}:${String(tgt || 'ur').trim().toLowerCase()}:${String(text || '').trim().toLowerCase()}`
  );
}

function getCachedTranslation(text, src, tgt) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const key = normalizeCacheKey(text, src, tgt);
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache[key];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function setCachedTranslation(text, src, tgt, result) {
  if (!text || !result || !result.translatedText || result.isOffline) return;
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const key = normalizeCacheKey(text, src, tgt);
    const keys = Object.keys(cache);
    if (keys.length >= MAX_CACHE_SIZE) {
      keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      keys.slice(0, keys.length - MAX_CACHE_SIZE + 1).forEach((k) => delete cache[k]);
    }
    cache[key] = { result, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota errors
  }
}

function translateOffline(text, srcLang, tgtLang) {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const srcCode = getShortCode(srcLang || 'English');
  const tgtCode = getShortCode(tgtLang || 'Urdu');
  const dict = OFFLINE_DICTIONARY[`${srcCode}_to_${tgtCode}`];

  let translated = '';
  let isMissing = false;

  if (dict && dict[lower]) {
    translated = dict[lower];
  } else {
    translated = 'Translation not available offline. Please try again when online.';
    isMissing = true;
  }

  return {
    originalText: clean,
    translatedText: translated,
    sourceLanguage: srcLang,
    targetLanguage: tgtLang,
    confidence: null,
    provider: 'offline',
    fromCache: false,
    isOffline: true,
    isError: isMissing,
  };
}

export function createTextTranslationController(callbacks = {}) {
  let currentOutputText = '';
  let isTranslating = false;
  let lastOutputIsError = false;
  let activeTranslationId = 0;
  let activeAbortController = null;
  let debounceTimer = null;

  const translateForm = document.getElementById('translateForm');
  const translateBtn = document.getElementById('translateBtn');
  const sourceTextEl = document.getElementById('sourceText');
  const outputEl = document.getElementById('output');
  const charCountEl = document.getElementById('charCount');
  const clearBtn = document.getElementById('clearBtn');
  const resultStatusEl = document.getElementById('resultStatus');
  const confidenceBadgeEl = document.getElementById('confidenceBadge');

  function clearDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function cancelPending() {
    activeTranslationId++;
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  }

  function updateCharCount() {
    if (!sourceTextEl || !charCountEl || !clearBtn) return;
    const len = (sourceTextEl.value || '').length;
    charCountEl.textContent = `${len.toLocaleString()} / 5,000`;
    clearBtn.classList.toggle('hidden', len === 0);
  }

  function hasValidOutput() {
    return Boolean(
      currentOutputText &&
        currentOutputText !== PLACEHOLDER_OUTPUT &&
        !lastOutputIsError &&
        !isTranslating
    );
  }

  function renderOutputState() {
    if (typeof callbacks.onSyncDirections === 'function') {
      callbacks.onSyncDirections(hasValidOutput());
    }
    if (!resultStatusEl || !outputEl || !confidenceBadgeEl || !translateBtn) return;

    if (isTranslating) {
      resultStatusEl.textContent = 'Translating...';
      resultStatusEl.className = 'status-pill busy';
      outputEl.innerHTML = '<span style="color:var(--blue);font-weight:500;">Translating smoothly...</span>';
      confidenceBadgeEl.classList.add('hidden');
      translateBtn.disabled = true;
      translateBtn.innerHTML = '<span>Translating...</span>';
    } else if (currentOutputText) {
      resultStatusEl.textContent = lastOutputIsError ? 'Error' : 'Ready';
      resultStatusEl.className = lastOutputIsError ? 'status-pill' : 'status-pill ready';
      outputEl.textContent = currentOutputText;
      translateBtn.disabled = false;
      translateBtn.innerHTML = '<span>Translate</span><span style="font-size:12px;opacity:0.85;">↵</span>';
    } else {
      resultStatusEl.textContent = 'Waiting';
      resultStatusEl.className = 'status-pill';
      outputEl.innerHTML = `<span class="output-placeholder">${PLACEHOLDER_OUTPUT}</span>`;
      confidenceBadgeEl.classList.add('hidden');
      translateBtn.disabled = false;
      translateBtn.innerHTML = '<span>Translate</span><span style="font-size:12px;opacity:0.85;">↵</span>';
    }
  }

  async function translate(textValue, srcLangOverride, tgtLangOverride) {
    const trimmed = String(textValue !== undefined ? textValue : sourceTextEl ? sourceTextEl.value : '').trim();
    const srcLang =
      srcLangOverride ||
      (typeof callbacks.getSourceLanguage === 'function' ? callbacks.getSourceLanguage() : 'English 🇬🇧');
    const tgtLang =
      tgtLangOverride ||
      (typeof callbacks.getTargetLanguage === 'function' ? callbacks.getTargetLanguage() : 'Urdu 🇵🇰');

    cancelPending();
    const requestId = activeTranslationId;

    if (!trimmed) {
      lastOutputIsError = false;
      currentOutputText = '';
      isTranslating = false;
      renderOutputState();
      return null;
    }

    lastOutputIsError = false;
    isTranslating = true;
    renderOutputState();

    const controller = new AbortController();
    activeAbortController = controller;

    try {
      let forceOffline = false;
      try {
        forceOffline = localStorage.getItem(FORCE_OFFLINE_KEY) === '1';
      } catch {
        forceOffline = false;
      }
      const online = !forceOffline && (typeof navigator !== 'undefined' ? navigator.onLine : true);
      const apiSrc = getTranslationName(srcLang);
      const apiTgt = getTranslationName(tgtLang);

      let result = null;
      if (!online) {
        result = translateOffline(trimmed, srcLang, tgtLang);
      } else {
        result = getCachedTranslation(trimmed, apiSrc, apiTgt);
        if (!result) {
          result = await translateText(
            {
              text: trimmed,
              sourceLanguage: apiSrc,
              targetLanguage: apiTgt,
              tone: 'natural',
            },
            { signal: controller.signal }
          );
          if (requestId !== activeTranslationId) return null;
          setCachedTranslation(trimmed, apiSrc, apiTgt, result);
        }
      }

      if (requestId !== activeTranslationId) return null;
      activeAbortController = null;
      lastOutputIsError = Boolean(result.isError);
      currentOutputText = result.translatedText || '';
      isTranslating = false;

      const fromGemini = String(result.provider || '').toLowerCase() === 'gemini';
      if (
        !result.isOffline &&
        !result.isError &&
        fromGemini &&
        typeof result.confidence === 'number' &&
        result.confidence > 0 &&
        confidenceBadgeEl
      ) {
        let pct =
          result.confidence <= 1
            ? Math.round(result.confidence * 100)
            : Math.round(result.confidence);
        pct = Math.max(1, Math.min(100, pct));
        confidenceBadgeEl.textContent = `${pct}% Match`;
        confidenceBadgeEl.classList.remove('hidden');
      } else if (confidenceBadgeEl) {
        confidenceBadgeEl.classList.add('hidden');
      }

      renderOutputState();

      if (!result.isOffline && !result.isError && currentOutputText && typeof callbacks.onTranslated === 'function') {
        callbacks.onTranslated({
          from: srcLang,
          to: tgtLang,
          input: trimmed,
          output: currentOutputText,
        });
      }

      return result;
    } catch (err) {
      if (requestId !== activeTranslationId || (err && err.name === 'AbortError')) {
        return null;
      }
      activeAbortController = null;
      isTranslating = false;
      lastOutputIsError = true;
      currentOutputText =
        err && err.message ? err.message : 'Translation failed. Please try again.';
      if (confidenceBadgeEl) confidenceBadgeEl.classList.add('hidden');
      renderOutputState();
      showToast(currentOutputText);
      return null;
    }
  }

  function clear() {
    clearDebounce();
    cancelPending();
    isTranslating = false;
    if (sourceTextEl) sourceTextEl.value = '';
    lastOutputIsError = false;
    currentOutputText = '';
    updateCharCount();
    renderOutputState();
  }

  function loadTranslation({ input = '', output = '' }) {
    clearDebounce();
    cancelPending();
    if (sourceTextEl) sourceTextEl.value = input;
    lastOutputIsError = false;
    currentOutputText = output;
    if (confidenceBadgeEl) confidenceBadgeEl.classList.add('hidden');
    updateCharCount();
    renderOutputState();
  }

  function handleSwap() {
    clearDebounce();
    if (hasValidOutput() && sourceTextEl) {
      const prevInput = sourceTextEl.value;
      sourceTextEl.value = currentOutputText;
      currentOutputText = prevInput;
      updateCharCount();
      renderOutputState();
    } else if (sourceTextEl && sourceTextEl.value.trim()) {
      translate(sourceTextEl.value);
    } else {
      renderOutputState();
    }
  }

  function init() {
    if (sourceTextEl) {
      sourceTextEl.addEventListener('input', () => {
        updateCharCount();
        clearDebounce();
        const val = sourceTextEl.value;
        if (val.trim().length > 1) {
          debounceTimer = setTimeout(() => {
            translate(val);
          }, 350);
        } else if (!val.trim()) {
          cancelPending();
          isTranslating = false;
          lastOutputIsError = false;
          currentOutputText = '';
          renderOutputState();
        }
      });
    }

    if (translateForm) {
      translateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearDebounce();
        if (sourceTextEl) {
          translate(sourceTextEl.value);
        }
      });
    }

    updateCharCount();
    renderOutputState();
  }

  return {
    init,
    translate,
    clear,
    clearDebounce,
    cancelPending,
    updateCharCount,
    renderOutputState,
    loadTranslation,
    handleSwap,
    getOutputText: () => (lastOutputIsError ? '' : currentOutputText),
    getSourceText: () => (sourceTextEl ? sourceTextEl.value : ''),
    hasValidOutput,
    isTranslating: () => isTranslating,
  };
}
