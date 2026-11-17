/**
 * Microphone & Browser Speech Recognition Module
 * Uses ONLY the browser's built-in Web Speech API (window.SpeechRecognition / webkitSpeechRecognition).
 * No external API, no MediaRecorder, no server speech-to-text endpoint, and no API key.
 */

import { getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const SPEECH_RECOGNITION_CODES = {
  english: 'en-US',
  urdu: 'ur-PK',
  arabic: 'ar-SA',
  punjabi: 'pa-PK',
};

const MAX_SILENT_RESTARTS = 3;
const MAX_CONSECUTIVE_FAST_ENDS = 2;
const FAST_END_THRESHOLD_MS = 400;
const CONTINUATION_DELAY_MS = 120;

export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return typeof getSpeechRecognitionConstructor() === 'function';
}

export function getRecognitionLang(langValue) {
  const name = getTranslationName(langValue).trim().toLowerCase();
  if (SPEECH_RECOGNITION_CODES[name]) {
    return SPEECH_RECOGNITION_CODES[name];
  }
  return getSpeechCode(langValue) || 'en-US';
}

function joinTranscriptSegments(...parts) {
  return parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function createMicrophoneController(callbacks = {}) {
  let activeRecognition = null;
  let sessionSeq = 0;
  let isListeningState = false;
  let manualStop = false;
  let fatalErrorCode = '';
  let lastErrorCode = '';

  let sessionPrefix = '';
  let accumulatedFinalText = '';
  let currentInstanceFinal = '';
  let currentInstanceInterim = '';
  let lastDispatchedFinal = '';
  let gotAnyResultInSession = false;

  let currentLangCode = 'en-US';
  let currentLangName = 'English';
  let sessionStartMs = 0;
  let instanceStartMs = 0;
  let gotResultInInstance = false;
  let silentRestartCount = 0;
  let consecutiveFastEndCount = 0;

  let durationTimer = null;
  let restartTimer = null;

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function clearTimers() {
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function updateListeningUi(listening) {
    isListeningState = Boolean(listening);
    if (micBtn) {
      micBtn.classList.toggle('recording', isListeningState);
      micBtn.disabled = false;
    }
    if (micBtnLabel) {
      micBtnLabel.textContent = isListeningState ? 'Stop' : 'Speak';
    }
    if (listeningIndicator) {
      if (isListeningState) {
        listeningIndicator.classList.remove('hidden');
        const elapsed = sessionStartMs ? Math.floor((Date.now() - sessionStartMs) / 1000) : 0;
        listeningIndicator.textContent = `● Listening (${currentLangName}) ${formatDuration(elapsed)}`;
      } else {
        listeningIndicator.classList.add('hidden');
        listeningIndicator.textContent = '● Listening...';
      }
    }
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(isListeningState);
    }
  }

  function startDurationTimer() {
    if (durationTimer) clearInterval(durationTimer);
    durationTimer = setInterval(() => {
      if (isListeningState && listeningIndicator && sessionStartMs) {
        const elapsed = Math.floor((Date.now() - sessionStartMs) / 1000);
        listeningIndicator.textContent = `● Listening (${currentLangName}) ${formatDuration(elapsed)}`;
      }
    }, 1000);
  }

  function mapErrorMessage(code) {
    switch (code) {
      case 'unsupported':
        return 'Browser speech recognition is not supported here. Please use Google Chrome.';
      case 'insecure-context':
        return 'Microphone speech recognition requires HTTPS or localhost.';
      case 'not-allowed':
      case 'permission-denied':
        return 'Microphone permission denied. Please allow microphone access in browser settings and try again.';
      case 'service-not-allowed':
      case 'service-unavailable':
        return 'Speech recognition service is unavailable on this browser or device.';
      case 'audio-capture':
        return 'No working microphone found or microphone is in use by another app.';
      case 'network':
        return 'Network error during speech recognition. Check your connection and tap Speak to retry.';
      case 'language-not-supported':
        return `${currentLangName} (${currentLangCode}) speech recognition is not supported by your browser.`;
      case 'no-speech':
        return 'No speech detected. Tap Speak and speak clearly into your microphone.';
      case 'aborted':
        return 'Speech recognition was interrupted. Tap Speak to start again.';
      case 'unexpected-end':
        return `Speech recognition stopped unexpectedly${
          gotAnyResultInSession ? '' : ` for ${currentLangName} (${currentLangCode})`
        }. Tap Speak to try again.`;
      default:
        return `Microphone error (${code || 'unknown'}). Tap Speak to try again.`;
    }
  }

  function getComposedText(includeInterim = true) {
    const newSpeech = includeInterim
      ? joinTranscriptSegments(accumulatedFinalText, currentInstanceFinal, currentInstanceInterim)
      : joinTranscriptSegments(accumulatedFinalText, currentInstanceFinal);
    return joinTranscriptSegments(sessionPrefix, newSpeech);
  }

  function syncSourceInput(fullText) {
    const sourceTextEl = document.getElementById('sourceText');
    if (sourceTextEl && sourceTextEl.value !== fullText) {
      sourceTextEl.value = fullText;
    }
    if (typeof callbacks.onInterimTranscript === 'function') {
      callbacks.onInterimTranscript(fullText);
    }
  }

  function dispatchTranslationIfChanged(fullText) {
    const clean = String(fullText || '').trim();
    if (!clean || clean === sessionPrefix || clean === lastDispatchedFinal) {
      return;
    }
    lastDispatchedFinal = clean;
    if (typeof callbacks.onFinalTranscript === 'function') {
      callbacks.onFinalTranscript(clean);
    }
  }

  function finalizeSession({ reason = 'manual', errorCode = '' } = {}) {
    clearTimers();
    activeRecognition = null;

    accumulatedFinalText = joinTranscriptSegments(
      accumulatedFinalText,
      currentInstanceFinal,
      reason === 'manual' ? currentInstanceInterim : ''
    );
    currentInstanceFinal = '';
    currentInstanceInterim = '';

    const finalText = getComposedText(true);
    const hasCapturedNewSpeech = Boolean(accumulatedFinalText.trim());

    if (finalText) {
      syncSourceInput(finalText);
    }

    updateListeningUi(false);

    if (hasCapturedNewSpeech) {
      dispatchTranslationIfChanged(finalText);
    }

    if (reason === 'manual') {
      showToast(hasCapturedNewSpeech ? 'Speech converted and translating…' : 'Listening stopped');
      return;
    }

    const codeToShow = errorCode || 'unexpected-end';
    const message = mapErrorMessage(codeToShow);
    showToast(message);
    if (typeof callbacks.onError === 'function') {
      callbacks.onError(codeToShow, message);
    }
  }

  function launchRecognitionInstance(seq) {
    if (seq !== sessionSeq || manualStop) return;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      finalizeSession({ reason: 'error', errorCode: 'unsupported' });
      return;
    }

    let recognition;
    try {
      recognition = new SpeechRecognitionCtor();
    } catch {
      finalizeSession({ reason: 'error', errorCode: 'service-not-allowed' });
      return;
    }

    activeRecognition = recognition;
    instanceStartMs = Date.now();
    gotResultInInstance = false;
    currentInstanceFinal = '';
    currentInstanceInterim = '';
    lastErrorCode = '';

    recognition.lang = currentLangCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (seq !== sessionSeq || activeRecognition !== recognition) return;

      const finalParts = [];
      const interimParts = [];

      if (event && event.results) {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const piece = String(result[0].transcript || '').trim();
          if (!piece) continue;
          if (result.isFinal) {
            finalParts.push(piece);
          } else {
            interimParts.push(piece);
          }
        }
      }

      currentInstanceFinal = finalParts.join(' ').trim();
      currentInstanceInterim = interimParts.join(' ').trim();

      if (currentInstanceFinal || currentInstanceInterim) {
        gotResultInInstance = true;
        gotAnyResultInSession = true;
        silentRestartCount = 0;
        consecutiveFastEndCount = 0;
      }

      const fullDisplayText = getComposedText(true);
      syncSourceInput(fullDisplayText);

      if (currentInstanceFinal) {
        const stableText = getComposedText(false);
        dispatchTranslationIfChanged(stableText);
      }
    };

    recognition.onerror = (event) => {
      if (seq !== sessionSeq || activeRecognition !== recognition) return;
      const errName = (event && event.error) || 'unknown';
      lastErrorCode = errName;

      if (errName === 'aborted' && manualStop) {
        return;
      }

      // A single 'no-speech' event on Android Chrome should not kill an active session right away
      if (errName === 'no-speech' && !manualStop && silentRestartCount < MAX_SILENT_RESTARTS) {
        return;
      }

      fatalErrorCode = errName;
    };

    recognition.onend = () => {
      if (seq !== sessionSeq || activeRecognition !== recognition) return;

      activeRecognition = null;
      accumulatedFinalText = joinTranscriptSegments(accumulatedFinalText, currentInstanceFinal);
      currentInstanceFinal = '';
      currentInstanceInterim = '';

      if (manualStop) {
        finalizeSession({ reason: 'manual' });
        return;
      }

      if (fatalErrorCode) {
        const code = fatalErrorCode;
        fatalErrorCode = '';
        finalizeSession({ reason: 'error', errorCode: code });
        return;
      }

      const elapsedMs = Date.now() - instanceStartMs;
      if (elapsedMs < FAST_END_THRESHOLD_MS && !gotResultInInstance) {
        consecutiveFastEndCount += 1;
      } else {
        consecutiveFastEndCount = 0;
      }

      if (!gotResultInInstance) {
        silentRestartCount += 1;
      }

      if (consecutiveFastEndCount >= MAX_CONSECUTIVE_FAST_ENDS) {
        const code =
          lastErrorCode && lastErrorCode !== 'no-speech'
            ? lastErrorCode
            : 'unexpected-end';
        finalizeSession({ reason: 'error', errorCode: code });
        return;
      }

      if (silentRestartCount > MAX_SILENT_RESTARTS) {
        finalizeSession({
          reason: 'error',
          errorCode: lastErrorCode === 'no-speech' ? 'no-speech' : 'unexpected-end',
        });
        return;
      }

      // Keep continuous recognition alive on Android Chrome when an utterance/pause ends the instance
      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (seq === sessionSeq && !manualStop) {
          launchRecognitionInstance(seq);
        }
      }, CONTINUATION_DELAY_MS);
    };

    try {
      recognition.start();
    } catch {
      activeRecognition = null;
      finalizeSession({ reason: 'error', errorCode: 'service-not-allowed' });
    }
  }

  function stop() {
    if (!isListeningState && !activeRecognition && !restartTimer) {
      return false;
    }

    manualStop = true;

    if (restartTimer) {
      finalizeSession({ reason: 'manual' });
      return true;
    }

    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        finalizeSession({ reason: 'manual' });
      }
      return true;
    }

    finalizeSession({ reason: 'manual' });
    return true;
  }

  function start() {
    if (isListeningState || activeRecognition || restartTimer) {
      return stop();
    }

    if (typeof callbacks.onBeforeStart === 'function') {
      callbacks.onBeforeStart();
    }

    if (!isSpeechRecognitionSupported()) {
      const msg = mapErrorMessage('unsupported');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('unsupported', msg);
      return false;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const msg = mapErrorMessage('insecure-context');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('insecure-context', msg);
      return false;
    }

    const srcLang =
      typeof callbacks.getSourceLanguage === 'function'
        ? callbacks.getSourceLanguage()
        : 'English 🇬🇧';
    currentLangCode = getRecognitionLang(srcLang);
    currentLangName = getTranslationName(srcLang);

    const sourceTextEl = document.getElementById('sourceText');
    sessionPrefix = sourceTextEl && sourceTextEl.value ? sourceTextEl.value.trim() : '';
    accumulatedFinalText = '';
    currentInstanceFinal = '';
    currentInstanceInterim = '';
    lastDispatchedFinal = '';
    gotAnyResultInSession = false;

    manualStop = false;
    fatalErrorCode = '';
    lastErrorCode = '';
    silentRestartCount = 0;
    consecutiveFastEndCount = 0;
    sessionStartMs = Date.now();

    sessionSeq += 1;
    const seq = sessionSeq;

    updateListeningUi(true);
    startDurationTimer();
    showToast(`Listening in ${currentLangName} (${currentLangCode})… Tap Stop when finished`);

    // Invoke recognition.start() synchronously within the user tap gesture for Android Chrome
    launchRecognitionInstance(seq);
    return true;
  }

  function toggle(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isListeningState || activeRecognition || restartTimer) {
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
    getRecognitionLang,
  };
}
