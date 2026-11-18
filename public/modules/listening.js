/**
 * Text-to-Speech / Listening Module
 * Browser-only speech playback for both Source and Translation boxes:
 * 1. Cancels any prior utterance and loads browser voices (speechSynthesis + onvoiceschanged).
 * 2. Falls back seamlessly to chunked HTML5 Audio via Google client-side TTS when a device lacks
 *    a local voice for the language (common on Android for Urdu, Hindi, Arabic, etc.) or stays silent.
 */

import { getShortCode, getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';
const VOICE_GENDER_KEY = 'novaVoiceGender';
const TTS_CHUNK_MAX_LEN = 180;
const VOICE_LOAD_TIMEOUT_MS = 500;
const SPEECH_SILENCE_FALLBACK_MS = 1800;

const TTS_LANG_OVERRIDES = {
  zh: 'zh-CN',
};

const DIRECT_AUDIO_LANGS = new Set(['ur', 'hi', 'ar', 'pa', 'fa', 'ps', 'sd', 'bn']);

function ensureSpeakingAnimationStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lafzSpeakingPulseStyle')) return;
  const style = document.createElement('style');
  style.id = 'lafzSpeakingPulseStyle';
  style.textContent =
    '@keyframes lafzSpeakPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,119,6,0.35);}50%{transform:scale(1.04);box-shadow:0 0 0 6px rgba(217,119,6,0);}}' +
    '.tool-chip.speaking{animation:lafzSpeakPulse 1.15s ease-in-out infinite;}';
  document.head.appendChild(style);
}

export function splitTtsChunks(text, maxLen = TTS_CHUNK_MAX_LEN) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const chunks = [];
  let remaining = clean;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    let cut = -1;

    const punctuationMatches = [...slice.matchAll(/[.!?؟۔,;:\n]/g)];
    if (punctuationMatches.length > 0) {
      const lastPunct = punctuationMatches[punctuationMatches.length - 1];
      if (typeof lastPunct.index === 'number' && lastPunct.index >= Math.floor(maxLen * 0.4)) {
        cut = lastPunct.index + 1;
      }
    }

    if (cut === -1) {
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > Math.floor(maxLen * 0.3)) {
        cut = lastSpace;
      } else {
        cut = maxLen;
      }
    }

    const piece = remaining.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export function createListeningController(callbacks = {}) {
  let activeUtterance = null;
  let activeAudio = null;
  let activeKey = null;
  let isPausedState = false;
  let sessionSeq = 0;
  let speakTimer = null;
  let silenceTimer = null;
  let voiceGender = readSavedGender();

  const voiceGenderBtn = document.getElementById('voiceGenderBtn');
  const voiceGenderLabel = document.getElementById('voiceGenderLabel');

  function readSavedGender() {
    try {
      const g = localStorage.getItem(VOICE_GENDER_KEY);
      if (g === 'male' || g === 'female') return g;
    } catch {
      // Ignore storage failures
    }
    return 'female';
  }

  function setVoiceGender(gender) {
    voiceGender = gender === 'male' ? 'male' : 'female';
    try {
      localStorage.setItem(VOICE_GENDER_KEY, voiceGender);
    } catch {
      // Ignore storage failures
    }
    if (voiceGenderLabel) {
      voiceGenderLabel.textContent = voiceGender === 'male' ? 'Male' : 'Female';
    }
    return voiceGender;
  }

  function getVoiceGender() {
    return voiceGender;
  }

  function clearTimers() {
    if (speakTimer) {
      clearTimeout(speakTimer);
      speakTimer = null;
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function cleanupAudioElement() {
    if (!activeAudio) return;
    const audio = activeAudio;
    activeAudio = null;
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // Ignore audio cleanup errors
    }
  }

  function updateButtonsUi(key) {
    ensureSpeakingAnimationStyle();

    const sourceListenBtn = document.getElementById('sourceListenBtn');
    const listenBtn = document.getElementById('listenBtn');
    const ocrListenBtn = document.getElementById('ocrListenBtn');

    if (sourceListenBtn) {
      const isSource = key === 'source';
      sourceListenBtn.classList.toggle('speaking', isSource);
      sourceListenBtn.setAttribute('aria-pressed', String(isSource));
      sourceListenBtn.title = isSource ? 'Stop speaking' : 'Listen to pronunciation';
      sourceListenBtn.textContent = isSource ? '⏹️' : '🔊';
    }

    if (listenBtn) {
      const isTarget = key === 'target';
      listenBtn.classList.toggle('speaking', isTarget);
      listenBtn.setAttribute('aria-pressed', String(isTarget));
      listenBtn.title = isTarget ? 'Stop speaking' : 'Listen to translation';
      const labelEl = listenBtn.querySelector('.tool-chip-label');
      if (labelEl) {
        labelEl.textContent = isTarget ? 'Speaking...' : 'Listen';
      }
      const iconSpan = listenBtn.querySelector('span:first-child');
      if (iconSpan && !iconSpan.classList.contains('tool-chip-label')) {
        iconSpan.textContent = isTarget ? '⏹️' : '🔊';
      }
    }

    if (ocrListenBtn) {
      ocrListenBtn.textContent = key === 'ocr' ? '⏹️ Stop' : '🔊 Listen';
    }

    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange({ speaking: key !== null, paused: isPausedState, key });
    }
  }

  function stop() {
    let hadActive = false;
    sessionSeq++;
    isPausedState = false;

    clearTimers();

    if (activeAudio) {
      hadActive = true;
      cleanupAudioElement();
    }

    if (activeUtterance) {
      activeUtterance.onstart = null;
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
      activeUtterance = null;
    }

    if (activeKey !== null) {
      hadActive = true;
      activeKey = null;
    }

    updateButtonsUi(null);

    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused) {
          hadActive = true;
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore cancel failures
      }
    }

    return hadActive;
  }

  function pause() {
    if (activeAudio && !activeAudio.paused) {
      try {
        activeAudio.pause();
        isPausedState = true;
        updateButtonsUi(activeKey);
        return true;
      } catch {
        return false;
      }
    }
    if (!('speechSynthesis' in window) || !window.speechSynthesis.speaking || isPausedState) {
      return false;
    }
    try {
      window.speechSynthesis.pause();
      isPausedState = true;
      updateButtonsUi(activeKey);
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (activeAudio && activeAudio.paused && isPausedState) {
      try {
        activeAudio.play();
        isPausedState = false;
        updateButtonsUi(activeKey);
        return true;
      } catch {
        return false;
      }
    }
    if (!('speechSynthesis' in window) || !isPausedState) {
      return false;
    }
    try {
      window.speechSynthesis.resume();
      isPausedState = false;
      updateButtonsUi(activeKey);
      return true;
    } catch {
      return false;
    }
  }

  function togglePause() {
    if (!activeKey) return false;
    return isPausedState ? resume() : pause();
  }

  function loadBrowserVoices(onReady) {
    if (!('speechSynthesis' in window)) {
      onReady([]);
      return;
    }

    const synth = window.speechSynthesis;
    let existing = [];
    try {
      existing = synth.getVoices() || [];
    } catch {
      existing = [];
    }
    if (existing.length > 0) {
      onReady(existing);
      return;
    }

    let done = false;
    let waitTimer = null;

    function resolveVoices() {
      if (done) return;
      done = true;
      if (waitTimer) {
        clearTimeout(waitTimer);
        waitTimer = null;
      }
      try {
        if (typeof synth.removeEventListener === 'function') {
          synth.removeEventListener('voiceschanged', resolveVoices);
        }
      } catch {
        // Ignore listener removal errors
      }
      let loaded = [];
      try {
        loaded = synth.getVoices() || [];
      } catch {
        loaded = [];
      }
      onReady(loaded);
    }

    try {
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', resolveVoices);
      } else {
        const prevHandler = synth.onvoiceschanged;
        synth.onvoiceschanged = () => {
          if (typeof prevHandler === 'function') {
            try {
              prevHandler();
            } catch {
              // Ignore
            }
          }
          resolveVoices();
        };
      }
    } catch {
      // Ignore event binding errors
    }

    waitTimer = setTimeout(resolveVoices, VOICE_LOAD_TIMEOUT_MS);
  }

  function findMatchingVoice(voices, locale, langWord) {
    if (!voices || voices.length === 0) return null;
    const wantedFull = String(locale || 'en-US').toLowerCase();
    const wantedBase = wantedFull.split('-')[0];
    const wantedWord = String(langWord || '').toLowerCase();

    let chosen = null;
    let topScore = -999;

    for (let i = 0; i < voices.length; i++) {
      const voice = voices[i];
      const vLocale = String(voice.lang || '').toLowerCase().replace(/_/g, '-');
      const vBase = vLocale.split('-')[0];
      const vName = String(voice.name || '').toLowerCase();

      const isMatch =
        vLocale === wantedFull ||
        vBase === wantedBase ||
        (wantedWord && vName.includes(wantedWord));

      if (!isMatch) continue;

      let score = 0;
      if (vLocale === wantedFull) score += 40;
      else if (vBase === wantedBase) score += 20;
      else score += 5;

      if (
        vName.includes('natural') ||
        vName.includes('neural') ||
        vName.includes('online') ||
        vName.includes('wavenet')
      ) {
        score += 50;
      }
      if (vName.includes('google')) score += 35;
      if (
        vName.includes('microsoft') ||
        vName.includes('siri') ||
        vName.includes('enhanced') ||
        vName.includes('premium') ||
        vName.includes('uzma') ||
        vName.includes('asad') ||
        vName.includes('salma') ||
        vName.includes('samantha')
      ) {
        score += 20;
      }
      if (!voice.localService) score += 10;
      if (vName.includes('espeak') || vName.includes('festival')) score -= 40;

      if (voiceGender === 'female') {
        if (
          vName.includes('female') ||
          vName.includes('woman') ||
          vName.includes('uzma') ||
          vName.includes('salma') ||
          vName.includes('zira') ||
          vName.includes('samantha') ||
          vName.includes('jenny') ||
          vName.includes('aria')
        ) {
          score += 15;
        }
      } else {
        if (
          (vName.includes('male') && !vName.includes('female')) ||
          vName.includes('asad') ||
          vName.includes('david') ||
          vName.includes('guy') ||
          vName.includes('daniel')
        ) {
          score += 15;
        }
      }

      if (score > topScore) {
        topScore = score;
        chosen = voice;
      }
    }

    return chosen;
  }

  function playGoogleTtsFallback(cleanText, ttsLangCode, langWord, token, key, allowSpeechSynthRetry = false, locale = 'en-US') {
    if (token !== sessionSeq || activeKey !== key) return;
    if (typeof Audio === 'undefined') {
      stop();
      showToast(`Audio playback is not supported in this browser.`);
      return;
    }

    const chunks = splitTtsChunks(cleanText, TTS_CHUNK_MAX_LEN);
    if (chunks.length === 0) {
      stop();
      return;
    }

    let chunkIndex = 0;

    function playNextChunk() {
      if (token !== sessionSeq || activeKey !== key) return;

      if (chunkIndex >= chunks.length) {
        activeKey = null;
        isPausedState = false;
        cleanupAudioElement();
        updateButtonsUi(null);
        return;
      }

      const chunk = chunks[chunkIndex];
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
        ttsLangCode
      )}&q=${encodeURIComponent(chunk)}`;

      cleanupAudioElement();

      const audio = new Audio(ttsUrl);
      activeAudio = audio;
      audio.preload = 'auto';
      try {
        audio.referrerPolicy = 'no-referrer';
      } catch {
        // Ignore if unsupported
      }

      audio.onended = () => {
        if (token !== sessionSeq || activeAudio !== audio) return;
        chunkIndex += 1;
        playNextChunk();
      };

      audio.onerror = () => {
        if (token !== sessionSeq || activeAudio !== audio) return;
        cleanupAudioElement();

        if (
          allowSpeechSynthRetry &&
          'speechSynthesis' in window &&
          typeof SpeechSynthesisUtterance !== 'undefined'
        ) {
          try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            activeUtterance = utterance;
            utterance.lang = locale;
            utterance.onend = () => {
              if (activeUtterance !== utterance) return;
              activeUtterance = null;
              activeKey = null;
              isPausedState = false;
              updateButtonsUi(null);
            };
            utterance.onerror = () => {
              if (activeUtterance !== utterance) return;
              stop();
              showToast(`No speech audio available for ${langWord}.`);
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
            return;
          } catch {
            // Fall through to toast error
          }
        }

        stop();
        showToast(`Could not play ${langWord} speech audio.`);
      };

      try {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            if (token !== sessionSeq || activeAudio !== audio) return;
            if (typeof audio.onerror === 'function') {
              audio.onerror();
            }
          });
        }
      } catch {
        if (typeof audio.onerror === 'function') {
          audio.onerror();
        }
      }
    }

    showToast(`Speaking in ${langWord}…`);
    playNextChunk();
  }

  function play(rawText, langName, key = 'custom') {
    const clean = String(rawText || '').trim();
    if (!clean || clean === PLACEHOLDER_OUTPUT) {
      showToast('No text to speak');
      return false;
    }

    if (activeKey === key) {
      stop();
      return false;
    }

    const hadActive = stop();
    const token = sessionSeq;
    const langWord = getTranslationName(langName);
    const locale = getSpeechCode(langName);
    const shortCode = getShortCode(langName);
    const ttsLangCode = TTS_LANG_OVERRIDES[shortCode] || shortCode || 'en';

    activeKey = key;
    isPausedState = false;
    updateButtonsUi(key);

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }

    const speechSupported =
      'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

    if (DIRECT_AUDIO_LANGS.has(shortCode) || !speechSupported) {
      playGoogleTtsFallback(clean, ttsLangCode, langWord, token, key, speechSupported, locale);
      return true;
    }

    loadBrowserVoices((voices) => {
      if (token !== sessionSeq || activeKey !== key) return;

      let matched = findMatchingVoice(voices, locale, langWord);
      if (!matched && voices && voices.length > 0) {
        const baseLang = locale.split('-')[0].toLowerCase();
        matched =
          voices.find((v) => {
            const vl = String(v.lang || '').toLowerCase().replace(/_/g, '-');
            return vl === baseLang || vl.startsWith(`${baseLang}-`);
          }) || null;
      }

      // Crucial fallback: if device has no local voice for this language (e.g. Urdu, Hindi, Arabic on Android),
      // use HTML5 Audio Google TTS immediately so it does not stay silent.
      if (!matched) {
        playGoogleTtsFallback(clean, ttsLangCode, langWord, token, key, true, locale);
        return;
      }

      function dispatchSpeak() {
        if (token !== sessionSeq || activeKey !== key) return;
        try {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(clean);
          activeUtterance = utterance;
          utterance.voice = matched;
          utterance.lang = matched.lang || locale;
          utterance.volume = 1;
          utterance.rate = voiceGender === 'male' ? 0.94 : 0.98;
          utterance.pitch = voiceGender === 'male' ? 0.88 : 1.06;

          let started = false;

          utterance.onstart = () => {
            started = true;
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              silenceTimer = null;
            }
          };

          utterance.onend = () => {
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              silenceTimer = null;
            }
            if (activeUtterance !== utterance) return;
            activeUtterance = null;
            activeKey = null;
            isPausedState = false;
            updateButtonsUi(null);
          };

          utterance.onerror = (ev) => {
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              silenceTimer = null;
            }
            if (activeUtterance !== utterance) return;
            const errName = ev && ev.error ? ev.error : 'unknown-error';
            activeUtterance = null;
            if (errName === 'canceled' || errName === 'interrupted') {
              activeKey = null;
              isPausedState = false;
              updateButtonsUi(null);
              return;
            }
            playGoogleTtsFallback(clean, ttsLangCode, langWord, token, key, false, locale);
          };

          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {
            // Ignore resume safeguard errors
          }

          showToast(`Speaking in ${langWord}…`);
          window.speechSynthesis.speak(utterance);

          // If Android speechSynthesis stays silent without starting, switch to HTML5 Audio fallback.
          silenceTimer = setTimeout(() => {
            silenceTimer = null;
            if (
              token === sessionSeq &&
              activeKey === key &&
              activeUtterance === utterance &&
              !started &&
              !window.speechSynthesis.speaking
            ) {
              activeUtterance.onstart = null;
              activeUtterance.onend = null;
              activeUtterance.onerror = null;
              activeUtterance = null;
              try {
                window.speechSynthesis.cancel();
              } catch {
                // Ignore
              }
              playGoogleTtsFallback(clean, ttsLangCode, langWord, token, key, false, locale);
            }
          }, SPEECH_SILENCE_FALLBACK_MS);
        } catch {
          playGoogleTtsFallback(clean, ttsLangCode, langWord, token, key, false, locale);
        }
      }

      if (hadActive) {
        speakTimer = setTimeout(() => {
          speakTimer = null;
          dispatchSpeak();
        }, 60);
      } else {
        dispatchSpeak();
      }
    });

    return true;
  }

  function init() {
    ensureSpeakingAnimationStyle();

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // Ignore preload error
      }
    }

    if (voiceGenderLabel) {
      voiceGenderLabel.textContent = voiceGender === 'male' ? 'Male' : 'Female';
    }

    if (voiceGenderBtn) {
      voiceGenderBtn.addEventListener('click', () => {
        const next = voiceGender === 'female' ? 'male' : 'female';
        setVoiceGender(next);
        showToast(`Voice set to ${next === 'male' ? 'Male' : 'Female'}`);
      });
    }
  }

  return {
    init,
    play,
    pause,
    resume,
    togglePause,
    stop,
    getVoiceGender,
    setVoiceGender,
    isSpeaking: () => activeKey !== null,
    isPaused: () => isPausedState,
    getActiveKey: () => activeKey,
  };
}
