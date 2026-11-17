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
const MAX_CONTINUATION_ABORT_RETRIES = 1;
const FAST_END_THRESHOLD_MS = 400;
const CONTINUATION_DELAY_MS = 320;
const CONTINUATION_ABORT_RETRY_DELAY_MS = 450;
const STOP_FALLBACK_TIMEOUT_MS = 1200;
const TOGGLE_DEBOUNCE_MS = 250;

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

function isMicDebugEnabled() {
  if (typeof window === 'undefined' || !window.location) return false;
  try {
    const search = String(window.location.search || '');
    if (!search) return false;
    return new URLSearchParams(search).get('micdebug') === '1';
  } catch {
    return String(window.location.search || '').includes('micdebug=1');
  }
}

function formatDebugClock(ms) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
}

export function createMicrophoneController(callbacks = {}) {
  let activeRecognition = null;
  let sessionSeq = 0;
  let instanceCounter = 0;
  let lifecycleState = 'idle'; // 'idle' | 'starting' | 'listening' | 'restarting' | 'stopping'
  let isInitialized = false;
  let isListeningState = false;
  let manualStop = false;
  let fatalErrorCode = '';
  let lastErrorCode = '';
  let isContinuationLaunch = false;
  let transientRestartAbort = false;
  let continuationAbortRetries = 0;
  let lastToggleAt = 0;

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
  let stopFallbackTimer = null;

  const micDebugActive = isMicDebugEnabled();
  const micDebugEntries = [];
  let micDebugStartedSuccess = false;
  let micDebugPanel = null;
  let micDebugHeaderEl = null;
  let micDebugLogEl = null;

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function ensureMicDebugPanel() {
    if (!micDebugActive || typeof document === 'undefined' || !document.body) return null;
    if (micDebugPanel) return micDebugPanel;

    const panel = document.createElement('div');
    panel.id = 'micDebugPanel';
    panel.style.cssText =
      'position:fixed;left:8px;right:8px;bottom:8px;max-height:42vh;z-index:99999;' +
      'background:rgba(15,23,42,0.96);color:#e2e8f0;border:1px solid #38bdf8;' +
      'border-radius:10px;padding:10px;font-family:monospace;font-size:11px;' +
      'line-height:1.4;box-shadow:0 10px 25px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:6px;';

    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;';

    const title = document.createElement('strong');
    title.textContent = 'MIC DEBUG (?micdebug=1)';
    title.style.color = '#38bdf8';

    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:6px;';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText =
      'background:#0284c7;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;';
    copyBtn.addEventListener('click', () => {
      const payload = [micDebugHeaderEl ? micDebugHeaderEl.textContent : '', ...micDebugEntries].join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(
          () => showToast('Mic debug log copied'),
          () => showToast('Copy failed — select log text manually')
        );
      } else {
        showToast('Clipboard unavailable — screenshot or copy text');
      }
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText =
      'background:#334155;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;';
    clearBtn.addEventListener('click', () => {
      micDebugEntries.length = 0;
      if (micDebugLogEl) micDebugLogEl.textContent = '';
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Hide';
    closeBtn.style.cssText =
      'background:#475569;color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;';
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    btnWrap.appendChild(copyBtn);
    btnWrap.appendChild(clearBtn);
    btnWrap.appendChild(closeBtn);
    topBar.appendChild(title);
    topBar.appendChild(btnWrap);

    const statusLine = document.createElement('div');
    statusLine.style.cssText = 'color:#fde047;word-break:break-word;';
    micDebugHeaderEl = statusLine;

    const logBox = document.createElement('pre');
    logBox.style.cssText =
      'margin:0;overflow:auto;max-height:26vh;white-space:pre-wrap;word-break:break-word;' +
      'background:#020617;padding:8px;border-radius:6px;border:1px solid #1e293b;color:#f8fafc;';
    micDebugLogEl = logBox;

    panel.appendChild(topBar);
    panel.appendChild(statusLine);
    panel.appendChild(logBox);
    document.body.appendChild(panel);
    micDebugPanel = panel;
    return panel;
  }

  function updateDebugHeader() {
    if (!micDebugActive || !micDebugHeaderEl) return;
    micDebugHeaderEl.textContent =
      `lang=${currentLangCode} (${currentLangName}) | started=${micDebugStartedSuccess ? 'YES' : 'NO'} | ` +
      `state=${lifecycleState} | session=${sessionSeq} | inst=${instanceCounter}`;
  }

  function logMicDebug(eventName, details = '') {
    if (!micDebugActive) return;
    try {
      const now = Date.now();
      const relSession = sessionStartMs ? `+${now - sessionStartMs}ms` : '+0ms';
      const relInst = instanceStartMs ? `+${now - instanceStartMs}ms` : '+0ms';
      const line = `[${formatDebugClock(now)} | sess:${relSession} | inst:${relInst}] ${eventName}${
        details ? ' | ' + details : ''
      }`;
      micDebugEntries.push(line);
      if (micDebugEntries.length > 150) {
        micDebugEntries.shift();
      }
      if (typeof console !== 'undefined' && console.log) {
        console.log('[MicDebug]', line);
      }
      ensureMicDebugPanel();
      if (micDebugPanel) {
        micDebugPanel.style.display = 'flex';
      }
      updateDebugHeader();
      if (micDebugLogEl) {
        micDebugLogEl.textContent = micDebugEntries.join('\n');
        micDebugLogEl.scrollTop = micDebugLogEl.scrollHeight;
      }
    } catch {
      // Never allow diagnostic logging to affect microphone operation
    }
  }

  function clearTimers() {
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (stopFallbackTimer) {
      clearTimeout(stopFallbackTimer);
      stopFallbackTimer = null;
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
    lifecycleState = 'idle';
    isContinuationLaunch = false;
    transientRestartAbort = false;
    continuationAbortRetries = 0;

    accumulatedFinalText = joinTranscriptSegments(
      accumulatedFinalText,
      currentInstanceFinal,
      currentInstanceInterim
    );
    currentInstanceFinal = '';
    currentInstanceInterim = '';

    const finalText = getComposedText(true);
    const hasCapturedNewSpeech = Boolean(accumulatedFinalText.trim());

    logMicDebug(
      'session.finalize',
      `reason=${reason} errorCode=${errorCode || 'none'} startedSuccess=${micDebugStartedSuccess} capturedChars=${accumulatedFinalText.trim().length}`
    );

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

  function launchRecognitionInstance(seq, { fromContinuation = false } = {}) {
    if (seq !== sessionSeq || manualStop || lifecycleState === 'stopping' || activeRecognition) {
      return;
    }

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
    lifecycleState = 'starting';
    isContinuationLaunch = Boolean(fromContinuation);
    transientRestartAbort = false;
    instanceStartMs = Date.now();
    instanceCounter += 1;
    const currentInstanceId = instanceCounter;
    let instanceStarted = false;
    gotResultInInstance = false;
    currentInstanceFinal = '';
    currentInstanceInterim = '';
    lastErrorCode = '';

    recognition.lang = currentLangCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    logMicDebug(
      'instance.init',
      `id=#${currentInstanceId} lang=${recognition.lang} continuous=${recognition.continuous} ` +
        `interimResults=${recognition.interimResults} fromContinuation=${isContinuationLaunch}`
    );

    if (micDebugActive) {
      recognition.onaudiostart = () => {
        logMicDebug('onaudiostart', `id=#${currentInstanceId} seqMatch=${seq === sessionSeq}`);
      };
      recognition.onspeechstart = () => {
        logMicDebug('onspeechstart', `id=#${currentInstanceId} seqMatch=${seq === sessionSeq}`);
      };
      recognition.onspeechend = () => {
        logMicDebug('onspeechend', `id=#${currentInstanceId} seqMatch=${seq === sessionSeq}`);
      };
    }

    recognition.onstart = () => {
      instanceStarted = true;
      micDebugStartedSuccess = true;
      logMicDebug(
        'onstart',
        `id=#${currentInstanceId} lang=${currentLangCode} started=true manualStop=${manualStop} state=${lifecycleState}`
      );
      if (seq !== sessionSeq || activeRecognition !== recognition) return;
      if (manualStop || lifecycleState === 'stopping') {
        try {
          recognition.stop();
        } catch {
          // Ignore late stop error
        }
        return;
      }
      lifecycleState = 'listening';
      isContinuationLaunch = false;
      continuationAbortRetries = 0;
      updateDebugHeader();
    };

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

      logMicDebug(
        'onresult',
        `id=#${currentInstanceId} resultsLen=${event && event.results ? event.results.length : 0} ` +
          `finalChars=${currentInstanceFinal.length} interimChars=${currentInstanceInterim.length}`
      );

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
      const errName = (event && event.error) || 'unknown';
      const errMessage = (event && event.message) || '';
      logMicDebug(
        'onerror',
        `id=#${currentInstanceId} error=${errName} message=${JSON.stringify(errMessage)} ` +
          `started=${instanceStarted} manualStop=${manualStop} state=${lifecycleState} isCont=${isContinuationLaunch}`
      );
      if (seq !== sessionSeq || activeRecognition !== recognition) return;
      lastErrorCode = errName;

      if (errName === 'aborted') {
        if (manualStop || lifecycleState === 'stopping') {
          return;
        }
        // Only recover once if Android RecognitionService had not finished tearing down the previous instance
        if (isContinuationLaunch && continuationAbortRetries < MAX_CONTINUATION_ABORT_RETRIES) {
          continuationAbortRetries += 1;
          transientRestartAbort = true;
          return;
        }
        fatalErrorCode = 'aborted';
        return;
      }

      // A single 'no-speech' event on Android Chrome should not kill an active session right away
      if (errName === 'no-speech' && !manualStop && silentRestartCount < MAX_SILENT_RESTARTS) {
        return;
      }

      fatalErrorCode = errName;
    };

    recognition.onend = () => {
      logMicDebug(
        'onend',
        `id=#${currentInstanceId} started=${instanceStarted} gotResult=${gotResultInInstance} ` +
          `fatal=${fatalErrorCode || 'none'} lastErr=${lastErrorCode || 'none'} manualStop=${manualStop} state=${lifecycleState}`
      );
      if (seq !== sessionSeq || activeRecognition !== recognition) return;

      if (stopFallbackTimer) {
        clearTimeout(stopFallbackTimer);
        stopFallbackTimer = null;
      }
      activeRecognition = null;
      accumulatedFinalText = joinTranscriptSegments(
        accumulatedFinalText,
        currentInstanceFinal,
        currentInstanceInterim
      );
      currentInstanceFinal = '';
      currentInstanceInterim = '';

      if (manualStop || lifecycleState === 'stopping') {
        finalizeSession({ reason: 'manual' });
        return;
      }

      if (fatalErrorCode) {
        const code = fatalErrorCode;
        fatalErrorCode = '';
        finalizeSession({ reason: 'error', errorCode: code });
        return;
      }

      if (transientRestartAbort) {
        transientRestartAbort = false;
        lifecycleState = 'restarting';
        restartTimer = setTimeout(() => {
          restartTimer = null;
          if (seq === sessionSeq && !manualStop && lifecycleState === 'restarting') {
            launchRecognitionInstance(seq, { fromContinuation: true });
          }
        }, CONTINUATION_ABORT_RETRY_DELAY_MS);
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

      // Keep continuous recognition alive on Android Chrome after Android releases audio capture
      lifecycleState = 'restarting';
      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (seq === sessionSeq && !manualStop && lifecycleState === 'restarting') {
          launchRecognitionInstance(seq, { fromContinuation: true });
        }
      }, CONTINUATION_DELAY_MS);
    };

    try {
      logMicDebug('recognition.start.call', `id=#${currentInstanceId} lang=${currentLangCode}`);
      recognition.start();
    } catch (err) {
      logMicDebug('recognition.start.throw', `id=#${currentInstanceId} err=${err && err.message ? err.message : err}`);
      activeRecognition = null;
      finalizeSession({ reason: 'error', errorCode: 'service-not-allowed' });
    }
  }

  function stop() {
    if (lifecycleState === 'stopping') {
      return true;
    }

    if (lifecycleState === 'idle' && !isListeningState && !activeRecognition && !restartTimer) {
      return false;
    }

    manualStop = true;
    lifecycleState = 'stopping';

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    if (activeRecognition) {
      if (stopFallbackTimer) clearTimeout(stopFallbackTimer);
      stopFallbackTimer = setTimeout(() => {
        stopFallbackTimer = null;
        if (lifecycleState === 'stopping') {
          finalizeSession({ reason: 'manual' });
        }
      }, STOP_FALLBACK_TIMEOUT_MS);

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
    if (lifecycleState === 'stopping') {
      return false;
    }

    if (lifecycleState !== 'idle' || isListeningState || activeRecognition || restartTimer) {
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
    isContinuationLaunch = false;
    transientRestartAbort = false;
    continuationAbortRetries = 0;
    silentRestartCount = 0;
    consecutiveFastEndCount = 0;
    sessionStartMs = Date.now();

    sessionSeq += 1;
    const seq = sessionSeq;
    micDebugStartedSuccess = false;

    if (micDebugActive) {
      const apiName =
        typeof window !== 'undefined' && window.SpeechRecognition
          ? 'SpeechRecognition'
          : 'webkitSpeechRecognition';
      let inIframe = false;
      try {
        inIframe = typeof window !== 'undefined' && window.top !== window.self;
      } catch {
        inIframe = true;
      }
      logMicDebug(
        'session.start',
        `seq=${seq} api=${apiName} lang=${currentLangCode} secure=${Boolean(
          typeof window !== 'undefined' && window.isSecureContext
        )} iframe=${inIframe} ua=${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`
      );
    }

    updateListeningUi(true);
    startDurationTimer();
    showToast(`Listening in ${currentLangName} (${currentLangCode})… Tap Stop when finished`);

    // Invoke recognition.start() synchronously within the user tap gesture for Android Chrome
    launchRecognitionInstance(seq, { fromContinuation: false });
    return true;
  }

  function toggle(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const now = Date.now();
    if (now - lastToggleAt < TOGGLE_DEBOUNCE_MS) {
      return isListeningState;
    }
    lastToggleAt = now;

    if (lifecycleState === 'stopping') {
      return false;
    }
    if (lifecycleState !== 'idle' || isListeningState || activeRecognition || restartTimer) {
      return stop();
    }
    return start();
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;
    if (micBtn) {
      micBtn.addEventListener('click', toggle);
    }
    if (micDebugActive) {
      ensureMicDebugPanel();
      updateDebugHeader();
      logMicDebug('init', 'Diagnostic panel ready (?micdebug=1)');
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
    getLifecycleState: () => lifecycleState,
  };
}
