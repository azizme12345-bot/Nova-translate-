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
  let sessionStartedAt = 0;
  let sessionLogs = [];
  let alertShown = false;
  let errorAlertTimer = null;

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const sourceTextEl = document.getElementById('sourceText');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  function clearErrorAlertTimer() {
    if (errorAlertTimer) {
      clearTimeout(errorAlertTimer);
      errorAlertTimer = null;
    }
  }

  function addLog(name, details = '') {
    const elapsed = sessionStartedAt ? Math.round(nowMs() - sessionStartedAt) : 0;
    const line = details
      ? `[Mic] ${name} (+${elapsed}ms) | ${details}`
      : `[Mic] ${name} (+${elapsed}ms)`;
    sessionLogs.push(line);
    console.log(line);
  }

  function flushLogAlert() {
    clearErrorAlertTimer();
    if (alertShown || sessionLogs.length === 0) return;
    alertShown = true;
    const text = sessionLogs.join('\n');
    try {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(text);
      } else if (typeof alert === 'function') {
        alert(text);
      }
    } catch {
      // Ignore alert failures in restricted contexts
    }
  }

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
    flushLogAlert();

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

    clearErrorAlertTimer();
    sessionStartedAt = nowMs();
    sessionLogs = [];
    alertShown = false;

    const visibility = typeof document !== 'undefined' ? document.visibilityState : 'unknown';
    const secureContext =
      typeof window !== 'undefined' ? String(Boolean(window.isSecureContext)) : 'unknown';
    const synthSpeaking =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? String(Boolean(window.speechSynthesis.speaking))
        : 'unavailable';

    addLog(
      'tap',
      `visibilityState=${visibility}, isSecureContext=${secureContext}, speechSynthesis.speaking=${synthSpeaking}`
    );

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      addLog('error', 'error=unsupported, message=SpeechRecognition not available');
      showToast('Is browser mein mic support nahi hai. Chrome use karein.');
      flushLogAlert();
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
        addLog('start');
        isListening = true;
        updateUi(true);
      };

      rec.onaudiostart = () => {
        if (recognition !== rec) return;
        addLog('audiostart');
      };

      rec.onsoundstart = () => {
        if (recognition !== rec) return;
        addLog('soundstart');
      };

      rec.onspeechstart = () => {
        if (recognition !== rec) return;
        addLog('speechstart');
      };

      rec.onresult = (event) => {
        if (recognition !== rec || !event || !event.results) return;
        addLog('result', `results=${event.results.length}`);
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
        const errMsg = event && event.message ? String(event.message) : '';
        addLog('error', `error=${errCode}, message=${errMsg}`);
        showToast(`Mic error: ${errCode}`);
        clearErrorAlertTimer();
        errorAlertTimer = setTimeout(() => {
          flushLogAlert();
        }, 150);
      };

      rec.onspeechend = () => {
        if (recognition !== rec) return;
        addLog('speechend');
      };

      rec.onsoundend = () => {
        if (recognition !== rec) return;
        addLog('soundend');
      };

      rec.onaudioend = () => {
        if (recognition !== rec) return;
        addLog('audioend');
      };

      rec.onend = () => {
        if (recognition !== rec) {
          resolveStopWaiters();
          return;
        }
        addLog('end');
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
      const errMsg = (err && err.message) || 'start-failed';
      addLog('error', `error=exception, message=${errMsg}`);
      updateUi(false);
      resolveStopWaiters();
      showToast(`Mic error: ${errMsg}`);
      flushLogAlert();
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
