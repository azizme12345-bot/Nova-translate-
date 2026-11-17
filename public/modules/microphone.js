
/**
 * Microphone Module
 * Browser Speech Recognition API
 * No external API or API key required.
 */

import { getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const SPEECH_CODES = {
  english: 'en-US',
  urdu: 'ur-PK',
  arabic: 'ar-SA',
  punjabi: 'pa-PK'
};

export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;

  return window.SpeechRecognition ||
         window.webkitSpeechRecognition ||
         null;
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

  let sessionPrefix = '';
  let finalTranscript = '';
  let interimTranscript = '';
  let lastTranslatedText = '';

  let currentLangCode = 'en-US';
  let currentLangName = 'English';

  let sessionStartTime = 0;
  let durationTimer = null;
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
        listeningIndicator.textContent =
          `● Listening (${currentLangName})`;
      } else {
        listeningIndicator.classList.add('hidden');
        listeningIndicator.textContent = '● Listening...';
      }
    }

    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(isActive);
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

      const elapsed = Math.floor(
        (Date.now() - sessionStartTime) / 1000
      );

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      listeningIndicator.textContent =
        `● Listening (${currentLangName}) ${minutes}:${String(seconds).padStart(2, '0')}`;

    }, 1000);
  }

  function writeTranscript() {

    const combined = [
      sessionPrefix,
      finalTranscript,
      interimTranscript
    ]
      .map(cleanText)
      .filter(Boolean)
      .join(' ')
      .trim();

    const sourceText = document.getElementById('sourceText');

    if (sourceText && sourceText.value !== combined) {
      sourceText.value = combined;

      sourceText.dispatchEvent(
        new Event('input', { bubbles: true })
      );
    }

    if (typeof callbacks.onInterimTranscript === 'function') {
      callbacks.onInterimTranscript(combined);
    }

    const finalCombined = [
      sessionPrefix,
      finalTranscript
    ]
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

    switch (code) {

      case 'unsupported':
        return 'Speech recognition is not supported in this browser. Please use Google Chrome.';

      case 'insecure-context':
        return 'Microphone access requires HTTPS or localhost.';

      case 'not-allowed':
      case 'permission-denied':
        return 'Microphone permission denied. Allow microphone access in Chrome settings.';

      case 'service-not-allowed':
        return 'The browser blocked its speech recognition service.';

      case 'audio-capture':
        return 'No microphone is available, or another app is using it.';

      case 'network':
        return 'Speech recognition network error. Check your internet connection.';

      case 'language-not-supported':
        return `Speech recognition does not support ${currentLangName} (${currentLangCode}).`;

      case 'no-speech':
        return 'No speech was detected. Tap Speak and try again.';

      case 'aborted':
        return 'The browser interrupted speech recognition. Tap Speak to try again.';

      default:
        return `Microphone error (${code || 'unknown'}).`;
    }
  }

  function finishSession(reason = '') {

    stopDurationTimer();

    recognition = null;

    updateUi(false);

    interimTranscript = '';

    writeTranscript();

    if (manualStop) {

      showToast(
        finalTranscript
          ? 'Speech converted. Translating…'
          : 'Listening stopped'
      );

    } else if (lastError) {

      const message = errorMessage(lastError);

      showToast(message);

      if (typeof callbacks.onError === 'function') {
        callbacks.onError(lastError, message);
      }

    } else if (finalTranscript) {

      showToast('Speech captured. You can continue or tap Speak again.');

    } else if (reason === 'ended') {

      const message = errorMessage('no-speech');

      showToast(message);

      if (typeof callbacks.onError === 'function') {
        callbacks.onError('no-speech', message);
      }
    }
  }

  function start() {

    if (isActive || recognition) {
      return stop();
    }

    if (typeof callbacks.onBeforeStart === 'function') {
      callbacks.onBeforeStart();
    }

    const SpeechRecognitionCtor =
      getSpeechRecognitionConstructor();

    if (!SpeechRecognitionCtor) {

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

    currentLangName =
      getTranslationName(selectedLanguage) || 'Selected language';

    const sourceText = document.getElementById('sourceText');

    sessionPrefix = sourceText
      ? cleanText(sourceText.value)
      : '';

    finalTranscript = '';
    interimTranscript = '';
    lastTranslatedText = '';
    lastError = '';
    manualStop = false;

    sessionStartTime = Date.now();

    try {

      const newRecognition = new SpeechRecognitionCtor();

      recognition = newRecognition;

      newRecognition.lang = currentLangCode;
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.maxAlternatives = 1;

      newRecognition.onstart = () => {

        if (recognition !== newRecognition) return;

        updateUi(true);

        startDurationTimer();

        showToast(`Listening in ${currentLangName}...`);
      };

      newRecognition.onresult = (event) => {

        if (recognition !== newRecognition) return;

        if (!event || !event.results) return;

        const finalParts = [];
        const interimParts = [];

        for (
          let index = 0;
          index < event.results.length;
          index++
        ) {

          const result = event.results[index];

          const text = result && result[0]
            ? cleanText(result[0].transcript)
            : '';

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

        const code =
          event && event.error
            ? event.error
            : 'unknown';

        if (!(code === 'aborted' && manualStop)) {
          lastError = code;
        }

        console.error('Speech Recognition Error:', {
          error: code,
          message: event ? event.message : ''
        });
      };

      newRecognition.onend = () => {

        if (recognition !== newRecognition) return;

        finishSession('ended');
      };

      // Start directly from the user's microphone button tap.
      updateUi(true);

      newRecognition.start();

      return true;

    } catch (error) {

      recognition = null;

      stopDurationTimer();

      updateUi(false);

      const code =
        error && error.name === 'NotAllowedError'
          ? 'not-allowed'
          : error && error.name === 'InvalidStateError'
            ? 'service-not-allowed'
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

  function stop() {

    if (!recognition) {

      stopDurationTimer();

      updateUi(false);

      return false;
    }

    manualStop = true;

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

    return isActive || recognition
      ? stop()
      : start();
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
    getRecognitionLang
  };
}
