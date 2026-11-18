/**
 * Microphone Module
 * Uses ONLY the browser's built-in Web Speech API (window.SpeechRecognition / webkitSpeechRecognition).
 * No external API, no audio upload, and no API key required.
 */

import { getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const SPEECH_CODES = {
  english: 'en-US',
  urdu: 'ur-PK',
  arabic: 'ar-SA',
  punjabi: 'pa-PK',
  hindi: 'hi-IN',
};

const ABORT_RETRY_DELAY_MS = 150;
const IFRAME_BLOCKED_MSG =
  'Mic is blocked inside preview frame. Please open the app in a new browser tab to use the microphone.';

export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;

  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null
  );
}

export function isSpeechRecognitionSupported() {
  return typeof getSpeechRecognitionConstructor() === 'function';
}

export function getRecognitionLang(langValue) {
  const name = getTranslationName(langValue).trim().toLowerCase();

  if (SPEECH_CODES[name]) {
    return SPEECH_CODES[name];
  }

  return getSpeechCode(langValue) || 'en-US';
}

function isInsideIframe() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createMicrophoneController(callbacks = {}) {
  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const listeningIndicator = document.getElementById('listeningIndicator');

  let recognition = null;
  let isActive = false;
  let manualStop = false;
  let initialized = false;
  let hasRetriedAbort = false;

  let sessionPrefix = '';
  let finalTranscript = '';
  let interimTranscript = '';
  let lastTranslatedText = '';

  let currentLangCode = 'en-US';
  let currentLangName = 'English';

  let sessionStartTime = 0;
  let durationTimer = null;
  let retryTimer = null;
  let lastError = '';

  function updateUi(active) {
    isActive = Boolean(active);

    if (micBtn) {
      micBtn.classList.toggle('recording', isActive);
      micBtn.disabled = false;
      micBtn.setAttribute('aria-pressed', String(isActive));
    }

    if (micBtnLabel) {
      micBtnLabel.textContent = isActive ? 'Stop' : 'Speak';
    }

    if (listeningIndicator) {
      if (isActive) {
        listeningIndicator.classList.remove('hidden');
        listeningIndicator.textContent = `● Listening (${currentLangName})`;
      } else {
        listeningIndicator.classList.add('hidden');
        listeningIndicator.textContent = '● Listening...';
      }
    }

    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(isActive);
    }
  }

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function stopDurationTimer() {
    if (durationTimer !== null) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
  }

  function startDurationTimer() {
    stopDurationTimer();

    durationTimer = setInterval(() => {
      if (!isActive || !listeningIndicator) return;

      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      listeningIndicator.textContent =
        `● Listening (${currentLangName}) ${minutes}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
  }

  function detachHandlers(rec) {
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
  }

  function writeTranscript() {
    const combined = [sessionPrefix, finalTranscript, interimTranscript]
      .map(cleanText)
      .filter(Boolean)
      .join(' ')
      .trim();

    const sourceText = document.getElementById('sourceText');

    if (sourceText && sourceText.value !== combined) {
      sourceText.value = combined;
      sourceText.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (typeof callbacks.onInterimTranscript === 'function') {
      callbacks.onInterimTranscript(combined);
    }

    const finalCombined = [sessionPrefix, finalTranscript]
      .map(cleanText)
      .filter(Boolean)
      .join(' ')
      .trim();

    if (
      finalTranscript &&
      finalCombined &&
      finalCombined !== sessionPrefix &&
      finalCombined !== lastTranslatedText
    ) {
      lastTranslatedText = finalCombined;

      if (typeof callbacks.onFinalTranscript === 'function') {
        callbacks.onFinalTranscript(finalCombined);
      }
    }
  }

  function errorMessage(code) {
    if (
      isInsideIframe() &&
      (code === 'not-allowed' ||
        code === 'permission-denied' ||
        code === 'service-not-allowed' ||
        code === 'aborted' ||
        code === 'interrupted')
    ) {
      return IFRAME_BLOCKED_MSG;
    }

    switch (code) {
      case 'unsupported':
        return 'Speech recognition is not supported in this browser. Please use Google Chrome.';
      case 'insecure-context':
        return 'Microphone access requires HTTPS or localhost.';
      case 'not-allowed':
      case 'permission-denied':
        return 'Microphone permission is blocked. Please allow microphone access in your browser site settings and tap Speak again.';
      case 'service-not-allowed':
        return 'Speech recognition is blocked or unavailable in this browser/tab.';
      case 'audio-capture':
        return 'No microphone is available, or another app is using it.';
      case 'network':
        return 'Speech recognition network error. Check your internet connection.';
      case 'language-not-supported':
        return `Speech recognition does not support ${currentLangName} (${currentLangCode}).`;
      case 'no-speech':
        return 'No speech was detected. Tap Speak and try again.';
      case 'aborted':
      case 'interrupted':
        return 'Speech recognition was interrupted. Tap Speak to try again.';
      default:
        return `Microphone error (${code || 'unknown'}).`;
    }
  }

  function finishSession(reason = '') {
    clearRetryTimer();
    stopDurationTimer();

    if (recognition) {
      detachHandlers(recognition);
      recognition = null;
    }

    updateUi(false);

    if (interimTranscript) {
      finalTranscript = [finalTranscript, interimTranscript]
        .map(cleanText)
        .filter(Boolean)
        .join(' ');
      interimTranscript = '';
    }

    writeTranscript();

    if (manualStop) {
      showToast(finalTranscript ? 'Speech converted. Translating…' : 'Listening stopped');
      return;
    }

    if (lastError) {
      const message = errorMessage(lastError);
      showToast(message);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError(lastError, message);
      }
      return;
    }

    if (finalTranscript) {
      showToast('Speech converted. Translating…');
      return;
    }

    if (reason === 'ended') {
      const message = errorMessage('no-speech');
      showToast(message);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError('no-speech', message);
      }
    }
  }

  function launchRecognition() {
    if (manualStop) return false;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      lastError = 'unsupported';
      finishSession('error');
      return false;
    }

    try {
      const newRecognition = new SpeechRecognitionCtor();
      recognition = newRecognition;

      newRecognition.lang = currentLangCode;
      newRecognition.continuous = false;
      newRecognition.interimResults = true;
      newRecognition.maxAlternatives = 1;

      newRecognition.onstart = () => {
        if (recognition !== newRecognition) return;
        updateUi(true);
        startDurationTimer();
        if (!hasRetriedAbort) {
          showToast(`Listening in ${currentLangName}...`);
        }
      };

      newRecognition.onresult = (event) => {
        if (recognition !== newRecognition || !event || !event.results) return;

        const finalParts = [];
        const interimParts = [];

        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          const text = result && result[0] ? cleanText(result[0].transcript) : '';
          if (!text) continue;

          if (result.isFinal) {
            finalParts.push(text);
          } else {
            interimParts.push(text);
          }
        }

        finalTranscript = finalParts.join(' ');
        interimTranscript = interimParts.join(' ');

        writeTranscript();
      };

      newRecognition.onerror = (event) => {
        if (recognition !== newRecognition) return;

        const code = event && event.error ? event.error : 'unknown';

        if (manualStop && (code === 'aborted' || code === 'interrupted')) {
          return;
        }

        lastError = code;
        if (code === 'aborted' || code === 'interrupted' || code === 'no-speech') {
          console.warn('Speech Recognition interrupted:', {
            error: code,
            message: event ? event.message : '',
          });
        } else {
          console.error('Speech Recognition Error:', {
            error: code,
            message: event ? event.message : '',
          });
        }
      };

      newRecognition.onend = () => {
        if (recognition !== newRecognition) return;

        detachHandlers(newRecognition);
        recognition = null;

        const isInterruption = lastError === 'aborted' || lastError === 'interrupted';

        if (!manualStop && isInterruption && !isInsideIframe() && !hasRetriedAbort) {
          hasRetriedAbort = true;
          lastError = '';

          const partial = [sessionPrefix, finalTranscript, interimTranscript]
            .map(cleanText)
            .filter(Boolean)
            .join(' ');
          sessionPrefix = partial;
          finalTranscript = '';
          interimTranscript = '';

          clearRetryTimer();
          retryTimer = setTimeout(() => {
            retryTimer = null;
            if (!manualStop) {
              launchRecognition();
            }
          }, ABORT_RETRY_DELAY_MS);
          return;
        }

        // Ignore false aborted/interrupted if we already captured valid speech
        if (!manualStop && isInterruption && (finalTranscript || interimTranscript)) {
          lastError = '';
        }

        finishSession('ended');
      };

      updateUi(true);
      newRecognition.start();
      return true;
    } catch (error) {
      recognition = null;
      clearRetryTimer();
      stopDurationTimer();
      updateUi(false);

      const code =
        error && error.name === 'NotAllowedError'
          ? 'not-allowed'
          : 'service-not-allowed';

      const message = errorMessage(code);
      showToast(message);

      if (typeof callbacks.onError === 'function') {
        callbacks.onError(code, message);
      }

      console.error('Microphone start error:', error);
      return false;
    }
  }

  function start() {
    if (isActive || recognition || retryTimer !== null) {
      return stop();
    }

    if (typeof callbacks.onBeforeStart === 'function') {
      callbacks.onBeforeStart();
    }

    if (!isSpeechRecognitionSupported()) {
      const message = errorMessage('unsupported');
      showToast(message);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError('unsupported', message);
      }
      return false;
    }

    if (window.isSecureContext === false) {
      const message = errorMessage('insecure-context');
      showToast(message);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError('insecure-context', message);
      }
      return false;
    }

    const selectedLanguage =
      typeof callbacks.getSourceLanguage === 'function'
        ? callbacks.getSourceLanguage()
        : 'English';

    currentLangCode = getRecognitionLang(selectedLanguage);
    currentLangName = getTranslationName(selectedLanguage) || 'Selected language';

    const sourceText = document.getElementById('sourceText');
    sessionPrefix = sourceText ? cleanText(sourceText.value) : '';
    finalTranscript = '';
    interimTranscript = '';
    lastTranslatedText = '';
    lastError = '';
    manualStop = false;
    hasRetriedAbort = false;
    sessionStartTime = Date.now();

    return launchRecognition();
  }

  function stop() {
    manualStop = true;
    clearRetryTimer();

    if (!recognition) {
      stopDurationTimer();
      updateUi(false);
      return false;
    }

    try {
      recognition.stop();
    } catch (error) {
      console.error('Microphone stop error:', error);
      finishSession('manual');
    }

    return true;
  }

  function toggle(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    return isActive || recognition || retryTimer !== null ? stop() : start();
  }

  function init() {
    if (initialized || !micBtn) return;
    initialized = true;
    micBtn.addEventListener('click', toggle);
  }

  return {
    init,
    start,
    stop,
    toggle,
    isListening: () => isActive,
    isSupported: isSpeechRecognitionSupported,
    getRecognitionLang,
  };
}
