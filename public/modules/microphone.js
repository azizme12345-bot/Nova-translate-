/**
 * Microphone Speech-to-Text Module
 * Records audio with browser MediaRecorder (max 30 seconds auto-stop),
 * converts to base64, sends to /api/speech-to-text, puts transcribed text
 * into Source box, and forwards it for /api/translate translation.
 */

import { transcribeAudio } from './translation-api.js';
import { showToast } from './ui-utils.js';

const MAX_RECORDING_MS = 30000;

function pickSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (MediaRecorder.isTypeSupported(candidates[i])) {
      return candidates[i];
    }
  }
  return '';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function createMicrophoneController(callbacks = {}) {
  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];
  let maxDurationTimer = null;
  let activeAbortController = null;
  let isListening = false;
  let isTranscribing = false;
  let cancelRequested = false;
  let baseText = '';
  let stopWaiters = [];

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const sourceTextEl = document.getElementById('sourceText');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function clearMaxDurationTimer() {
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }
  }

  function releaseMediaStream() {
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore track cleanup failures
      }
      mediaStream = null;
    }
  }

  function resolveStopWaiters() {
    if (stopWaiters.length === 0) return;
    const waiters = stopWaiters.splice(0, stopWaiters.length);
    waiters.forEach((resolve) => resolve(true));
  }

  function updateUi(active, processing = false) {
    if (micBtn) {
      micBtn.classList.toggle('recording', active);
      micBtn.setAttribute('aria-pressed', String(active));
      micBtn.disabled = processing;
    }
    if (micBtnLabel) {
      micBtnLabel.textContent = processing ? 'Wait...' : active ? 'Stop' : 'Speak';
    }
    if (listeningIndicator) {
      listeningIndicator.classList.toggle('hidden', !active);
    }
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange({ listening: active || processing });
    }
  }

  function composeSourceValue(spoken) {
    const cleanSpoken = String(spoken || '').trim();
    if (!baseText) return cleanSpoken;
    if (!cleanSpoken) return baseText;
    return `${baseText} ${cleanSpoken}`;
  }

  function isSupported() {
    return (
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices) &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  async function processRecording(blob, mimeType) {
    if (!blob || blob.size === 0) {
      isTranscribing = false;
      updateUi(false, false);
      showToast('Awaaz record nahi hui. Dobara koshish karein.');
      return;
    }

    const controller = new AbortController();
    activeAbortController = controller;
    isTranscribing = true;
    updateUi(false, true);

    try {
      const dataUrl = await blobToDataUrl(blob);
      const sourceLang =
        typeof callbacks.getSourceLanguage === 'function'
          ? callbacks.getSourceLanguage()
          : 'English 🇬🇧';

      const result = await transcribeAudio(
        {
          audioBase64: dataUrl,
          mimeType: mimeType || blob.type || 'audio/webm',
          sourceLanguage: sourceLang,
        },
        { signal: controller.signal }
      );

      if (cancelRequested) return;

      const spokenText = String(result && result.text ? result.text : '').trim();
      if (!spokenText) {
        showToast('Awaaz mein koi alfaz samajh nahi aaye.');
        return;
      }

      const fullValue = composeSourceValue(spokenText);
      if (sourceTextEl) {
        sourceTextEl.value = fullValue;
      }
      if (typeof callbacks.onInterimTranscript === 'function') {
        callbacks.onInterimTranscript(fullValue);
      }
      if (typeof callbacks.onFinalTranscript === 'function' && fullValue.trim()) {
        callbacks.onFinalTranscript(fullValue);
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      showToast((err && err.message) || 'Speech-to-text failed.');
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
      isTranscribing = false;
      updateUi(false, false);
    }
  }

  async function start() {
    if (isListening || isTranscribing) return true;

    if (!isSupported()) {
      showToast('Is browser mein mic recording support nahi hai.');
      return false;
    }

    cancelRequested = false;
    baseText = sourceTextEl ? sourceTextEl.value.trim() : '';
    audioChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelRequested) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      mediaStream = stream;
      const chosenMime = pickSupportedAudioMimeType();
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      mediaRecorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event && event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearMaxDurationTimer();
        isListening = false;
        mediaRecorder = null;
        releaseMediaStream();
        updateUi(false, false);
        resolveStopWaiters();
        showToast('Mic recording error.');
      };

      recorder.onstop = () => {
        clearMaxDurationTimer();
        const recordedMime = recorder.mimeType || chosenMime || 'audio/webm';
        const chunks = audioChunks.slice();
        audioChunks = [];
        isListening = false;
        mediaRecorder = null;
        releaseMediaStream();
        resolveStopWaiters();

        if (cancelRequested) {
          updateUi(false, false);
          return;
        }

        const blob = new Blob(chunks, { type: recordedMime });
        void processRecording(blob, recordedMime);
      };

      isListening = true;
      updateUi(true, false);
      recorder.start();

      clearMaxDurationTimer();
      maxDurationTimer = setTimeout(() => {
        if (mediaRecorder === recorder && isListening) {
          try {
            recorder.stop();
          } catch {
            // Ignore stop error on timeout
          }
        }
      }, MAX_RECORDING_MS);

      return true;
    } catch (err) {
      clearMaxDurationTimer();
      isListening = false;
      mediaRecorder = null;
      releaseMediaStream();
      updateUi(false, false);
      resolveStopWaiters();
      showToast((err && err.message) || 'Mic access failed.');
      return false;
    }
  }

  function stop(options = {}) {
    const abortRequest = Boolean(options && options.cancel);
    if (abortRequest) {
      cancelRequested = true;
    }

    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
      isTranscribing = false;
    }

    clearMaxDurationTimer();

    if (!isListening || !mediaRecorder) {
      isListening = false;
      mediaRecorder = null;
      releaseMediaStream();
      updateUi(false, false);
      resolveStopWaiters();
      return Promise.resolve(false);
    }

    const activeRecorder = mediaRecorder;
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        resolve(true);
      };

      const safetyTimer = setTimeout(() => {
        isListening = false;
        if (mediaRecorder === activeRecorder) {
          mediaRecorder = null;
        }
        releaseMediaStream();
        updateUi(false, false);
        done();
      }, 500);

      stopWaiters.push(done);

      try {
        if (activeRecorder.state !== 'inactive') {
          activeRecorder.stop();
        } else {
          isListening = false;
          mediaRecorder = null;
          releaseMediaStream();
          updateUi(false, false);
          done();
        }
      } catch {
        isListening = false;
        mediaRecorder = null;
        releaseMediaStream();
        updateUi(false, false);
        done();
      }
    });
  }

  function init() {
    updateUi(false, false);
  }

  return {
    init,
    start,
    stop,
    isListening: () => isListening || isTranscribing,
    isSupported,
  };
}
