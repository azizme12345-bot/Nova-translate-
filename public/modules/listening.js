/**
 * Text-to-Speech / Listening Module
 * Uses browser native window.speechSynthesis only.
 * Shows clear message if device lacks a voice for the selected language.
 */

import { getSpeechCode, getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';
const VOICE_GENDER_KEY = 'novaVoiceGender';
const VOICE_LOAD_TIMEOUT_MS = 500;

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

export function createListeningController(callbacks = {}) {
  let activeUtterance = null;
  let activeKey = null;
  let isPausedState = false;
  let sessionSeq = 0;
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

  function stopSync() {
    let hadActive = false;
    sessionSeq++;
    isPausedState = false;

    if (activeUtterance) {
      hadActive = true;
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

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending ||
          window.speechSynthesis.paused
        ) {
          hadActive = true;
        }
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel failures
      }
    }

    return hadActive;
  }

  function stop() {
    const hadActive = stopSync();
    if (!hadActive) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 40);
    });
  }

  function pause() {
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
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
        // Ignore
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
      // Ignore
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
        vName.includes('premium')
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
      } else if (
        (vName.includes('male') && !vName.includes('female')) ||
        vName.includes('asad') ||
        vName.includes('david') ||
        vName.includes('guy') ||
        vName.includes('daniel')
      ) {
        score += 15;
      }

      if (score > topScore) {
        topScore = score;
        chosen = voice;
      }
    }

    return chosen;
  }

  function play(rawText, langName, key = 'custom') {
    const clean = String(rawText || '').trim();
    if (!clean || clean === PLACEHOLDER_OUTPUT) {
      showToast('No text to speak');
      return false;
    }

    if (activeKey === key) {
      stopSync();
      return false;
    }

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      showToast('Is device par speech synthesis support nahi hai.');
      return false;
    }

    stopSync();
    const token = sessionSeq;
    const langWord = getTranslationName(langName);
    const locale = getSpeechCode(langName);

    activeKey = key;
    isPausedState = false;
    updateButtonsUi(key);

    loadBrowserVoices((voices) => {
      if (token !== sessionSeq || activeKey !== key) return;

      const matched = findMatchingVoice(voices, locale, langWord);
      if (!matched) {
        activeUtterance = null;
        activeKey = null;
        isPausedState = false;
        updateButtonsUi(null);
        showToast(`Is device par ${langWord} ki awaaz nahi hai.`);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);
        activeUtterance = utterance;
        utterance.voice = matched;
        utterance.lang = matched.lang || locale;
        utterance.volume = 1;
        utterance.rate = voiceGender === 'male' ? 0.94 : 0.98;
        utterance.pitch = voiceGender === 'male' ? 0.88 : 1.06;

        utterance.onend = () => {
          if (token !== sessionSeq || activeUtterance !== utterance) return;
          activeUtterance = null;
          activeKey = null;
          isPausedState = false;
          updateButtonsUi(null);
        };

        utterance.onerror = (ev) => {
          if (token !== sessionSeq || activeUtterance !== utterance) return;
          const errName = ev && ev.error ? String(ev.error) : 'unknown';
          activeUtterance = null;
          activeKey = null;
          isPausedState = false;
          updateButtonsUi(null);
          if (errName !== 'canceled' && errName !== 'interrupted') {
            showToast(`Speech error: ${errName}`);
          }
        };

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {
          // Ignore
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        activeUtterance = null;
        activeKey = null;
        isPausedState = false;
        updateButtonsUi(null);
        showToast(`Speech error: ${(err && err.message) || 'speak-failed'}`);
      }
    });

    return true;
  }

  function init() {
    ensureSpeakingAnimationStyle();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // Ignore
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
