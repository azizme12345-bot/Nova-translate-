/**
 * Text Translation Module
 * Handles streaming text-to-text translation via /api/translate,
 * 400ms typing debounce, AbortController cancellation, and browser caching.
 */

import { translateText } from './translation-api.js';
import { getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';
const CACHE_KEY = 'nova_translation_cache_v4';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 250;
const TYPING_DEBOUNCE_MS = 400;

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
  if (!text || !result || !result.translatedText || result.isError) return;
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
    // Ignore storage quota errors
  }
}

export function createTextTranslationController(callbacks = {}) {
  let currentOutputText = '';
  let streamingOutputText = '';
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
    const showRtl = hasValidOutput() || (isTranslating && Boolean(streamingOutputText));
    if (typeof callbacks.onSyncDirections === 'function') {
      callbacks.onSyncDirections(showRtl);
    }
    if (!resultStatusEl || !outputEl || !confidenceBadgeEl || !translateBtn) return;

    if (isTranslating) {
      resultStatusEl.textContent = 'Translating...';
      resultStatusEl.className = 'status-pill busy';
      outputEl.style.color = '';
      if (streamingOutputText) {
        outputEl.textContent = streamingOutputText;
      } else {
        outputEl.innerHTML = '<span style="color:var(--blue);font-weight:500;">Translating...</span>';
      }
      confidenceBadgeEl.classList.add('hidden');
      translateBtn.disabled = true;
      translateBtn.innerHTML = '<span>Translating...</span>';
    } else if (currentOutputText) {
      resultStatusEl.textContent = lastOutputIsError ? 'Error' : 'Ready';
      resultStatusEl.className = lastOutputIsError ? 'status-pill' : 'status-pill ready';
      outputEl.style.color = lastOutputIsError ? '#dc2626' : '';
      outputEl.textContent = currentOutputText;
      if (lastOutputIsError) {
        confidenceBadgeEl.classList.add('hidden');
      }
      translateBtn.disabled = false;
      translateBtn.innerHTML = '<span>Translate</span><span style="font-size:12px;opacity:0.85;">↵</span>';
    } else {
      resultStatusEl.textContent = 'Waiting';
      resultStatusEl.className = 'status-pill';
      outputEl.style.color = '';
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
      streamingOutputText = '';
      isTranslating = false;
      renderOutputState();
      return null;
    }

    lastOutputIsError = false;
    streamingOutputText = '';
    isTranslating = true;
    renderOutputState();

    const controller = new AbortController();
    activeAbortController = controller;

    try {
      const apiSrc = getTranslationName(srcLang);
      const apiTgt = getTranslationName(tgtLang);

      let result = getCachedTranslation(trimmed, apiSrc, apiTgt);
      if (result) {
        console.log('Translate: 0ms (cache)');
      } else {
        result = await translateText(
          {
            text: trimmed,
            sourceLanguage: apiSrc,
            targetLanguage: apiTgt,
          },
          {
            signal: controller.signal,
            onChunk: (partial) => {
              if (requestId !== activeTranslationId) return;
              streamingOutputText = partial;
              renderOutputState();
            },
          }
        );
        if (requestId !== activeTranslationId) return null;
        setCachedTranslation(trimmed, apiSrc, apiTgt, result);
      }

      if (requestId !== activeTranslationId) return null;
      activeAbortController = null;
      lastOutputIsError = false;
      streamingOutputText = '';
      currentOutputText = result.translatedText || '';
      isTranslating = false;

      if (
        typeof result.confidence === 'number' &&
        Number.isFinite(result.confidence) &&
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

      if (currentOutputText && typeof callbacks.onTranslated === 'function') {
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
      streamingOutputText = '';
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
    streamingOutputText = '';
    if (sourceTextEl) sourceTextEl.value = '';
    lastOutputIsError = false;
    currentOutputText = '';
    updateCharCount();
    renderOutputState();
  }

  function loadTranslation({ input = '', output = '' }) {
    clearDebounce();
    cancelPending();
    isTranslating = false;
    streamingOutputText = '';
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
          }, TYPING_DEBOUNCE_MS);
        } else if (!val.trim()) {
          cancelPending();
          isTranslating = false;
          streamingOutputText = '';
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
