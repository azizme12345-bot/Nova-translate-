/**
 * Microphone Speech-to-Text Module
 * Uses browser native SpeechRecognition / webkitSpeechRecognition only.
 * Tap once to start, tap again to stop, live interim words in Source box,
 * translates final text via Part 1 on stop, and never restarts in a loop.
 */

import { getSpeechCode } from './language-manager.js';
import { showToast } from './ui-utils.js';

export function createMicrophoneController(callbacks = {}) {
  let recognition = null;
  let isListening = false;
  let baseText = '';
  let latestSpokenText = '';
  let hasError = false;
  let hasFinalized = false;
  let stopWaiters = [];

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const sourceTextEl = document.getElementById('sourceText');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function updateUi(active) {
    if (micBtn) {
      micBtn.classList.toggle('recording', active);
      micBtn.setAttribute('aria-pressed', String(active));
    }
    if (micBtnLabel) {
      micBtnLabel.textContent = active ? 'Stop' : 'Speak';
    }
    if (listeningIndicator) {
      listeningIndicator.classList.toggle('hidden', !active);
    }
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange({ listening: active });
    }
  }

  function resolveStopWaiters() {
    if (stopWaiters.length === 0) return;
    const waiters = stopWaiters.splice(0, stopWaiters.length);
    waiters.forEach((resolve) => resolve(true));
  }

  function composeSourceValue(spoken) {
    const cleanSpoken = String(spoken || '').trim();
    if (!baseText) return cleanSpoken;
    if (!cleanSpoken) return baseText;
    return `${baseText} ${cleanSpoken}`;
  }

  function finalizeSession() {
    isListening = false;
    recognition = null;
    updateUi(false);
    resolveStopWaiters();

    if (!hasError && !hasFinalized && latestSpokenText) {
      hasFinalized = true;
      const fullText = composeSourceValue(latestSpokenText);
      if (typeof callbacks.onFinalTranscript === 'function' && fullText.trim()) {
        callbacks.onFinalTranscript(fullText);
      }
    }
  }

  function getSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function start() {
    if (isListening) return true;

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      showToast('Is browser mein mic support nahi hai. Chrome use karein.');
      return false;
    }

    const sourceLang =
      typeof callbacks.getSourceLanguage === 'function'
        ? callbacks.getSourceLanguage()
        : 'English 🇬🇧';
    const locale = getSpeechCode(sourceLang);

    baseText = sourceTextEl ? sourceTextEl.value.trim() : '';
    latestSpokenText = '';
    hasError = false;
    hasFinalized = false;

    try {
      const rec = new SpeechRecognitionCtor();
      recognition = rec;
      rec.lang = locale;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (recognition !== rec) return;
        isListening = true;
        updateUi(true);
      };

      rec.onresult = (event) => {
        if (recognition !== rec || !event || !event.results) return;
        let finalPart = '';
        let interimPart = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result && result[0] && result[0].transcript ? result[0].transcript : '';
          if (result.isFinal) {
            finalPart += `${transcript} `;
          } else {
            interimPart += transcript;
          }
        }

        const combinedSpoken = `${finalPart}${interimPart}`.trim();
        if (combinedSpoken) {
          latestSpokenText = combinedSpoken;
          const fullValue = composeSourceValue(combinedSpoken);
          if (sourceTextEl) {
            sourceTextEl.value = fullValue;
          }
          if (typeof callbacks.onInterimTranscript === 'function') {
            callbacks.onInterimTranscript(fullValue);
          }
        }
      };

      rec.onerror = (event) => {
        if (recognition !== rec) return;
        hasError = true;
        const errCode = event && event.error ? String(event.error) : 'unknown';
        showToast(`Mic error: ${errCode}`);
      };

      rec.onend = () => {
        if (recognition !== rec) {
          resolveStopWaiters();
          return;
        }
        finalizeSession();
      };

      isListening = true;
      updateUi(true);
      rec.start();
      return true;
    } catch (err) {
      hasError = true;
      isListening = false;
      recognition = null;
      updateUi(false);
      resolveStopWaiters();
      showToast(`Mic error: ${(err && err.message) || 'start-failed'}`);
      return false;
    }
  }

  function stop() {
    if (!isListening || !recognition) {
      isListening = false;
      recognition = null;
      updateUi(false);
      resolveStopWaiters();
      return Promise.resolve(false);
    }

    const activeRec = recognition;
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        resolve(true);
      };

      const safetyTimer = setTimeout(() => {
        if (recognition === activeRec) {
          finalizeSession();
        }
        done();
      }, 300);

      stopWaiters.push(done);

      try {
        activeRec.stop();
      } catch {
        if (recognition === activeRec) {
          finalizeSession();
        }
        done();
      }
    });
  }

  function init() {
    updateUi(false);
  }

  return {
    init,
    start,
    stop,
    isListening: () => isListening,
    isSupported: () => Boolean(getSpeechRecognitionCtor()),
  };
}
