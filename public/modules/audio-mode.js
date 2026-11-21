/**
 * Audio Mode Coordinator
 * Guarantees ONE-AT-A-TIME operation between Microphone and Listening.
 * Switching from one mode to the other stops the active mode completely
 * and waits 300ms before starting the new mode.
 */

const SWITCH_DELAY_MS = 300;

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAudioModeController({ microphone, listening } = {}) {
  let activeMode = 'idle'; // 'idle' | 'mic' | 'listening'
  let transitionSeq = 0;

  function syncFromMicrophone(state) {
    if (state && !state.listening && activeMode === 'mic') {
      activeMode = 'idle';
    }
  }

  function syncFromListening(state) {
    if (state && !state.speaking && activeMode === 'listening') {
      activeMode = 'idle';
    }
  }

  async function toggleMic() {
    const seq = ++transitionSeq;

    if (microphone && microphone.isListening()) {
      await microphone.stop();
      if (seq === transitionSeq) {
        activeMode = 'idle';
      }
      return false;
    }

    const needStopListening =
      (listening && listening.isSpeaking()) || activeMode === 'listening';

    if (needStopListening && listening) {
      await listening.stop();
      await waitMs(SWITCH_DELAY_MS);
      if (seq !== transitionSeq) return false;
    }

    if (!microphone) return false;
    activeMode = 'mic';
    const started = await microphone.start();
    if (!started && seq === transitionSeq) {
      activeMode = 'idle';
    }
    return started;
  }

  async function toggleListening(rawText, langName, key = 'custom') {
    const seq = ++transitionSeq;

    if (listening && listening.isSpeaking() && listening.getActiveKey() === key) {
      await listening.stop();
      if (seq === transitionSeq) {
        activeMode = 'idle';
      }
      return false;
    }

    const needStopMic =
      (microphone && microphone.isListening()) || activeMode === 'mic';
    const needStopOtherListening =
      (listening && listening.isSpeaking()) || activeMode === 'listening';

    if (needStopMic && microphone) {
      await microphone.stop({ cancel: true });
      await waitMs(SWITCH_DELAY_MS);
      if (seq !== transitionSeq) return false;
    } else if (needStopOtherListening && listening) {
      await listening.stop();
      await waitMs(SWITCH_DELAY_MS);
      if (seq !== transitionSeq) return false;
    }

    if (!listening) return false;
    activeMode = 'listening';
    const started = await Promise.resolve(listening.play(rawText, langName, key));
    if (!started && seq === transitionSeq) {
      activeMode = 'idle';
    }
    return started;
  }

  async function stopAll() {
    const seq = ++transitionSeq;
    const tasks = [];
    if (microphone) tasks.push(microphone.stop({ cancel: true }));
    if (listening) tasks.push(listening.stop());
    await Promise.all(tasks);
    if (seq === transitionSeq) {
      activeMode = 'idle';
    }
  }

  return {
    toggleMic,
    toggleListening,
    stopAll,
    syncFromMicrophone,
    syncFromListening,
    getMode: () => activeMode,
  };
}
