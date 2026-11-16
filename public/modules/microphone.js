/**
 * Microphone & Speech-to-Text Module
 * Handles SpeechRecognition lifecycle, language-specific recognition,
 * permission checks, listening state, start/stop toggle, and error handling.
 */

import { getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

export function isSpeechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export async function checkMicrophonePermission() {
  if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result ? result.state : 'prompt';
  } catch {
    return 'prompt';
  }
}

export function createMicrophoneController(callbacks = {}) {
  let activeRecognition = null;
  let isListeningState = false;

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function updateListeningUi(listening) {
    isListeningState = Boolean(listening);
    if (micBtn) micBtn.classList.toggle('recording', isListeningState);
    if (micBtnLabel) micBtnLabel.textContent = isListeningState ? 'Stop' : 'Speak';
    if (listeningIndicator) {
      listeningIndicator.classList.toggle('hidden', !isListeningState);
      listeningIndicator.textContent = '● Listening...';
    }
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(isListeningState);
    }
  }

  function mapErrorMessage(errName) {
    if (errName === 'no-speech') {
      return 'No speech detected. Tap Speak again and speak clearly.';
    }
    if (errName === 'not-allowed' || errName === 'service-not-allowed') {
      return 'Microphone permission denied. Please allow microphone access in browser settings.';
    }
    if (errName === 'audio-capture') {
      return 'No microphone device found.';
    }
    if (errName === 'network') {
      return 'An internet connection is required for browser voice input.';
    }
    return `Microphone error: ${errName}`;
  }

  function stop() {
    if (!activeRecognition) {
      updateListeningUi(false);
      return false;
    }
    const rec = activeRecognition;
    rec._manuallyStopped = true;
    updateListeningUi(false);
    try {
      rec.stop();
    } catch {
      activeRecognition = null;
    }
    return true;
  }

  async function start() {
    if (activeRecognition) {
      return stop();
    }

    if (typeof callbacks.onBeforeStart === 'function') {
      callbacks.onBeforeStart();
    }

    const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!BrowserSpeechRecognition) {
      updateListeningUi(false);
      const msg = 'Voice input is not supported in this browser. Please use Chrome.';
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('unsupported', msg);
      return false;
    }

    if (window.isSecureContext === false) {
      updateListeningUi(false);
      const msg = 'Microphone requires HTTPS or localhost.';
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('insecure-context', msg);
      return false;
    }

    const permState = await checkMicrophonePermission();
    if (permState === 'denied') {
      updateListeningUi(false);
      const msg = mapErrorMessage('not-allowed');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('not-allowed', msg);
      return false;
    }

    const sourceTextEl = document.getElementById('sourceText');
    const srcLang =
      typeof callbacks.getSourceLanguage === 'function'
        ? callbacks.getSourceLanguage()
        : 'English 🇬🇧';
    const langWord = getTranslationName(srcLang);
    const speechLocale = getSpeechCode(srcLang);
    const basePrefix = sourceTextEl && sourceTextEl.value ? sourceTextEl.value.trim() : '';

    let sessionTranscript = '';
    let sessionError = '';

    try {
      const recognition = new BrowserSpeechRecognition();
      recognition._manuallyStopped = false;
      activeRecognition = recognition;
      updateListeningUi(true);

      recognition.lang = speechLocale;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (activeRecognition !== recognition) return;
        showToast(`Listening in ${langWord}… Speak now`);
      };

      recognition.onresult = (event) => {
        if (activeRecognition !== recognition) return;
        const parts = [];
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const piece = res && res[0] && res[0].transcript ? res[0].transcript.trim() : '';
          if (piece) parts.push(piece);
        }
        sessionTranscript = parts.join(' ').trim();
        if (sessionTranscript) {
          const combined = basePrefix ? `${basePrefix} ${sessionTranscript}` : sessionTranscript;
          if (sourceTextEl) sourceTextEl.value = combined;
          if (typeof callbacks.onInterimTranscript === 'function') {
            callbacks.onInterimTranscript(combined);
          }
        }
      };

      recognition.onerror = (ev) => {
        const errName = ev && ev.error ? ev.error : 'unknown-error';
        sessionError = errName;
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        updateListeningUi(false);

        if (errName === 'aborted' && recognition._manuallyStopped) {
          return;
        }

        const msg = mapErrorMessage(errName);
        showToast(msg);
        if (typeof callbacks.onError === 'function') {
          callbacks.onError(errName, msg);
        }
      };

      recognition.onend = () => {
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        updateListeningUi(false);

        const finalVal = sourceTextEl && sourceTextEl.value ? sourceTextEl.value.trim() : '';
        if (sessionTranscript && finalVal) {
          if (typeof callbacks.onFinalTranscript === 'function') {
            callbacks.onFinalTranscript(finalVal);
          }
        } else if (!sessionError && !recognition._manuallyStopped && !sessionTranscript) {
          showToast('No speech was captured.');
        }
      };

      recognition.start();
      return true;
    } catch (err) {
      const errCode = (err && (err.name || err.message)) || 'start-failed';
      activeRecognition = null;
      updateListeningUi(false);
      const msg = mapErrorMessage(errCode);
      showToast(msg);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError(errCode, msg);
      }
      return false;
    }
  }

  function toggle(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (activeRecognition) {
      return stop();
    }
    return start();
  }

  function init() {
    if (micBtn) {
      micBtn.addEventListener('click', toggle);
    }
  }

  return {
    init,
    start,
    stop,
    toggle,
    isListening: () => isListeningState,
    isSupported: isSpeechRecognitionSupported,
    checkPermission: checkMicrophonePermission,
  };
}
