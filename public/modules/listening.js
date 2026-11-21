/**
 * Text-to-Speech / Listening Module
 * Uses server-side Gemini TTS (/api/tts returning WAV) and browser Audio playback.
 * Completely removes browser speechSynthesis usage.
 */

import { synthesizeSpeech } from './translation-api.js';
import { getTranslationName } from './language-manager.js';
import { showToast } from './ui-utils.js';

const PLACEHOLDER_OUTPUT = 'Translation will appear here...';
const VOICE_GENDER_KEY = 'novaVoiceGender';

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

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'audio/wav' });
}

export function createListeningController(callbacks = {}) {
  let activeAudio = null;
  let activeObjectUrl = '';
  let activeAbortController = null;
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

  function revokeActiveUrl() {
    if (activeObjectUrl) {
      try {
        URL.revokeObjectURL(activeObjectUrl);
      } catch {
        // Ignore revoke errors
      }
      activeObjectUrl = '';
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

  function stopSync() {
    let hadActive = false;
    sessionSeq++;
    isPausedState = false;

    if (activeAbortController) {
      hadActive = true;
      activeAbortController.abort();
      activeAbortController = null;
    }

    if (activeAudio) {
      hadActive = true;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      try {
        activeAudio.pause();
        activeAudio.src = '';
      } catch {
        // Ignore audio stop failures
      }
      activeAudio = null;
    }

    revokeActiveUrl();

    if (activeKey !== null) {
      hadActive = true;
      activeKey = null;
    }

    updateButtonsUi(null);
    return hadActive;
  }

  function stop() {
    const hadActive = stopSync();
    return Promise.resolve(hadActive);
  }

  function pause() {
    if (!activeAudio || activeAudio.paused || isPausedState) {
      return false;
    }
    try {
      activeAudio.pause();
      isPausedState = true;
      updateButtonsUi(activeKey);
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (!activeAudio || !isPausedState) {
      return false;
    }
    try {
      void activeAudio.play();
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

  async function play(rawText, langName, key = 'custom') {
    const clean = String(rawText || '').trim();
    if (!clean || clean === PLACEHOLDER_OUTPUT) {
      showToast('No text to speak');
      return false;
    }

    if (activeKey === key) {
      stopSync();
      return false;
    }

    if (typeof Audio === 'undefined') {
      showToast('Is browser mein audio playback support nahi hai.');
      return false;
    }

    stopSync();
    const token = sessionSeq;
    const langWord = getTranslationName(langName);
    const controller = new AbortController();
    activeAbortController = controller;
    activeKey = key;
    isPausedState = false;
    updateButtonsUi(key);

    try {
      const data = await synthesizeSpeech(
        {
          text: clean,
          language: langWord,
          voiceGender,
        },
        { signal: controller.signal }
      );

      if (token !== sessionSeq || activeKey !== key) {
        return false;
      }

      if (activeAbortController === controller) {
        activeAbortController = null;
      }

      const wavBlob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
      const objectUrl = URL.createObjectURL(wavBlob);
      activeObjectUrl = objectUrl;

      const audio = new Audio(objectUrl);
      activeAudio = audio;

      audio.onended = () => {
        if (token !== sessionSeq || activeAudio !== audio) return;
        activeAudio = null;
        activeKey = null;
        isPausedState = false;
        revokeActiveUrl();
        updateButtonsUi(null);
      };

      audio.onerror = () => {
        if (token !== sessionSeq || activeAudio !== audio) return;
        activeAudio = null;
        activeKey = null;
        isPausedState = false;
        revokeActiveUrl();
        updateButtonsUi(null);
        showToast('Audio playback failed.');
      };

      await audio.play();
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return false;
      }
      if (token === sessionSeq) {
        if (activeAbortController === controller) {
          activeAbortController = null;
        }
        activeAudio = null;
        activeKey = null;
        isPausedState = false;
        revokeActiveUrl();
        updateButtonsUi(null);
        showToast((err && err.message) || 'Audio generation failed.');
      }
      return false;
    }
  }

  function init() {
    ensureSpeakingAnimationStyle();

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
