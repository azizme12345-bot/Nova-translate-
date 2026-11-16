/**
 * Microphone & Speech-to-Text Module
 * Uses navigator.mediaDevices.getUserMedia + MediaRecorder for continuous audio recording
 * until the user manually presses Stop, then transcribes audio via /api/speech-to-text.
 */

import { getTranslationName } from './language-manager.js';
import { transcribeAudio } from './translation-api.js';
import { showToast } from './ui-utils.js';

const PREFERRED_AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
];

export function isMediaRecordingSupported() {
  return Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder === 'function'
  );
}

export async function checkMicrophonePermission() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result ? result.state : 'prompt';
  } catch {
    return 'prompt';
  }
}

export function pickSupportedAudioMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder !== 'function') {
    return '';
  }
  if (typeof window.MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  for (let i = 0; i < PREFERRED_AUDIO_MIME_TYPES.length; i++) {
    const mime = PREFERRED_AUDIO_MIME_TYPES[i];
    try {
      if (window.MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      // Ignore probe error and try next MIME candidate
    }
  }
  return '';
}

function normalizeAudioMimeType(rawMime) {
  const base = String(rawMime || '').split(';')[0].trim().toLowerCase();
  if (base && base.startsWith('audio/')) {
    return base;
  }
  return 'audio/webm';
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read recorded audio data.'));
    reader.onloadend = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      const b64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1).trim() : dataUrl.trim();
      if (!b64) {
        reject(new Error('Recorded audio data is empty.'));
        return;
      }
      resolve(b64);
    };
    reader.readAsDataURL(blob);
  });
}

async function acquireMicrophoneStream() {
  const enhancedConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
  try {
    return await navigator.mediaDevices.getUserMedia(enhancedConstraints);
  } catch (err) {
    const errName = err && err.name ? err.name : '';
    if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw err;
  }
}

export function createMicrophoneController(callbacks = {}) {
  let activeRecorder = null;
  let activeStream = null;
  let recordedChunks = [];
  let isListeningState = false;
  let isStarting = false;
  let isTranscribing = false;
  let startCancelled = false;
  let selectedMimeType = '';
  let recordingStartMs = 0;
  let durationTimer = null;

  const micBtn = document.getElementById('micBtn');
  const micBtnLabel = document.getElementById('micBtnLabel');
  const listeningIndicator = document.getElementById('listeningIndicator');

  function clearDurationTimer() {
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
  }

  function releaseMediaTracks(streamToStop = activeStream) {
    if (!streamToStop) return;
    try {
      const tracks = streamToStop.getTracks ? streamToStop.getTracks() : [];
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore individual track stop error
        }
      });
    } catch {
      // Ignore stream cleanup error
    }
    if (streamToStop === activeStream) {
      activeStream = null;
    }
  }

  function updateListeningUi({ listening = false, transcribing = false } = {}) {
    isListeningState = Boolean(listening);
    if (micBtn) {
      micBtn.classList.toggle('recording', isListeningState);
      micBtn.disabled = Boolean(transcribing);
    }
    if (micBtnLabel) {
      micBtnLabel.textContent = isListeningState ? 'Stop' : 'Speak';
    }
    if (listeningIndicator) {
      if (isListeningState) {
        listeningIndicator.classList.remove('hidden');
        const elapsed = recordingStartMs ? Math.floor((Date.now() - recordingStartMs) / 1000) : 0;
        listeningIndicator.textContent = `● Recording ${formatDuration(elapsed)}`;
      } else if (transcribing) {
        listeningIndicator.classList.remove('hidden');
        listeningIndicator.textContent = '● Converting speech...';
      } else {
        listeningIndicator.classList.add('hidden');
        listeningIndicator.textContent = '● Listening...';
      }
    }
    if (typeof callbacks.onStateChange === 'function') {
      callbacks.onStateChange(isListeningState);
    }
  }

  function mapErrorMessage(err) {
    const code = typeof err === 'string' ? err : (err && (err.name || err.message)) || 'unknown-error';
    if (code === 'NotAllowedError' || code === 'PermissionDeniedError' || code === 'not-allowed') {
      return 'Microphone permission denied. Please allow microphone access in browser settings.';
    }
    if (code === 'NotFoundError' || code === 'DevicesNotFoundError' || code === 'audio-capture') {
      return 'No microphone device found.';
    }
    if (code === 'NotReadableError' || code === 'TrackStartError') {
      return 'Microphone is currently in use by another application.';
    }
    if (code === 'SecurityError' || code === 'insecure-context') {
      return 'Microphone recording requires HTTPS or localhost.';
    }
    if (code === 'unsupported') {
      return 'Audio recording is not supported in this browser. Please use Chrome.';
    }
    if (code === 'empty-audio') {
      return 'No audio was recorded. Tap Speak, speak clearly, then tap Stop.';
    }
    if (code === 'no-speech') {
      return 'No speech detected in recording. Please speak clearly and try again.';
    }
    if (err && typeof err === 'object' && err.message && !code.includes('Error')) {
      return err.message;
    }
    if (err && typeof err === 'object' && err.message) {
      return err.message;
    }
    return `Microphone error: ${code}`;
  }

  async function processRecordedAudio(chunks, rawMime, srcLang) {
    const blobType = rawMime || selectedMimeType || 'audio/webm';
    const audioBlob = new Blob(chunks, { type: blobType });

    if (!audioBlob || audioBlob.size === 0) {
      const msg = mapErrorMessage('empty-audio');
      showToast(msg);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError('empty-audio', msg);
      }
      return null;
    }

    isTranscribing = true;
    updateListeningUi({ listening: false, transcribing: true });

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const cleanMime = normalizeAudioMimeType(audioBlob.type || blobType);
      const langWord = getTranslationName(srcLang);

      const result = await transcribeAudio({
        audioBase64,
        mimeType: cleanMime,
        languageHint: langWord,
      });

      const transcribed = result && typeof result.text === 'string' ? result.text.trim() : '';
      if (!transcribed) {
        const msg = mapErrorMessage('no-speech');
        showToast(msg);
        if (typeof callbacks.onError === 'function') {
          callbacks.onError('no-speech', msg);
        }
        return '';
      }

      const sourceTextEl = document.getElementById('sourceText');
      const basePrefix = sourceTextEl && sourceTextEl.value ? sourceTextEl.value.trim() : '';
      const combined = basePrefix ? `${basePrefix} ${transcribed}` : transcribed;

      if (sourceTextEl) {
        sourceTextEl.value = combined;
      }
      if (typeof callbacks.onInterimTranscript === 'function') {
        callbacks.onInterimTranscript(combined);
      }
      if (typeof callbacks.onFinalTranscript === 'function') {
        callbacks.onFinalTranscript(combined);
      }
      showToast('Speech converted to text');
      return combined;
    } catch (err) {
      const msg = mapErrorMessage(err);
      showToast(msg);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError('transcription-failed', msg);
      }
      return null;
    } finally {
      isTranscribing = false;
      updateListeningUi({ listening: false, transcribing: false });
    }
  }

  function stop() {
    if (isStarting) {
      startCancelled = true;
      updateListeningUi({ listening: false, transcribing: false });
      return true;
    }

    if (!activeRecorder) {
      clearDurationTimer();
      releaseMediaTracks();
      updateListeningUi({ listening: false, transcribing: false });
      return false;
    }

    clearDurationTimer();
    const recorder = activeRecorder;
    activeRecorder = null;

    if (recorder.state === 'recording' || recorder.state === 'paused') {
      try {
        recorder.stop();
      } catch {
        releaseMediaTracks();
        updateListeningUi({ listening: false, transcribing: false });
      }
    } else {
      releaseMediaTracks();
      updateListeningUi({ listening: false, transcribing: false });
    }
    return true;
  }

  async function start() {
    if (isTranscribing) {
      showToast('Please wait, finishing previous recording...');
      return false;
    }

    if (activeRecorder || isStarting) {
      return stop();
    }

    if (typeof callbacks.onBeforeStart === 'function') {
      callbacks.onBeforeStart();
    }

    if (!isMediaRecordingSupported()) {
      const msg = mapErrorMessage('unsupported');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('unsupported', msg);
      return false;
    }

    if (window.isSecureContext === false) {
      const msg = mapErrorMessage('insecure-context');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('insecure-context', msg);
      return false;
    }

    const permState = await checkMicrophonePermission();
    if (permState === 'denied') {
      const msg = mapErrorMessage('not-allowed');
      showToast(msg);
      if (typeof callbacks.onError === 'function') callbacks.onError('not-allowed', msg);
      return false;
    }

    const srcLang =
      typeof callbacks.getSourceLanguage === 'function'
        ? callbacks.getSourceLanguage()
        : 'English 🇬🇧';
    const langWord = getTranslationName(srcLang);

    isStarting = true;
    startCancelled = false;
    recordedChunks = [];

    try {
      const stream = await acquireMicrophoneStream();

      if (startCancelled) {
        releaseMediaTracks(stream);
        isStarting = false;
        return false;
      }

      activeStream = stream;
      selectedMimeType = pickSupportedAudioMimeType();

      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const recorder = recorderOptions
        ? new window.MediaRecorder(stream, recorderOptions)
        : new window.MediaRecorder(stream);

      activeRecorder = recorder;
      isStarting = false;
      recordingStartMs = Date.now();
      updateListeningUi({ listening: true, transcribing: false });

      clearDurationTimer();
      durationTimer = setInterval(() => {
        if (isListeningState && listeningIndicator && recordingStartMs) {
          const elapsed = Math.floor((Date.now() - recordingStartMs) / 1000);
          listeningIndicator.textContent = `● Recording ${formatDuration(elapsed)}`;
        }
      }, 1000);

      recorder.ondataavailable = (ev) => {
        if (ev && ev.data && ev.data.size > 0) {
          recordedChunks.push(ev.data);
        }
      };

      recorder.onerror = (ev) => {
        clearDurationTimer();
        if (activeRecorder === recorder) {
          activeRecorder = null;
        }
        releaseMediaTracks(stream);
        updateListeningUi({ listening: false, transcribing: false });
        const recErr = (ev && ev.error) || new Error('Audio recording failed.');
        const msg = mapErrorMessage(recErr);
        showToast(msg);
        if (typeof callbacks.onError === 'function') {
          callbacks.onError('recording-error', msg);
        }
      };

      recorder.onstop = () => {
        clearDurationTimer();
        if (activeRecorder === recorder) {
          activeRecorder = null;
        }
        releaseMediaTracks(stream);
        const chunksToSend = recordedChunks.slice();
        const recorderMime = recorder.mimeType || selectedMimeType || 'audio/webm';
        recordedChunks = [];
        processRecordedAudio(chunksToSend, recorderMime, srcLang);
      };

      // Use a 250ms timeslice so chunks flush continuously on Android Chrome across long recordings
      recorder.start(250);
      showToast(`Recording in ${langWord}… Tap Stop when finished`);
      return true;
    } catch (err) {
      isStarting = false;
      startCancelled = false;
      activeRecorder = null;
      clearDurationTimer();
      releaseMediaTracks();
      updateListeningUi({ listening: false, transcribing: false });

      const errCode = (err && (err.name || err.message)) || 'start-failed';
      const msg = mapErrorMessage(err);
      showToast(msg);
      if (typeof callbacks.onError === 'function') {
        callbacks.onError(errCode, msg);
      }
      return false;
    }
  }

  function toggle(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (activeRecorder || isStarting) {
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
    isTranscribing: () => isTranscribing,
    isSupported: isMediaRecordingSupported,
    checkPermission: checkMicrophonePermission,
    pickMimeType: pickSupportedAudioMimeType,
  };
}
