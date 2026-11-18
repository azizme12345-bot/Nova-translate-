/**
 * Main Application Controller
 * Coordinates module initialization, UI connections, and inter-module communication.
 */

import { initNavigation, initPwa, showToast, switchHomeView } from './ui-utils.js';
import { createLanguageManager } from './language-manager.js';
import { createClipboardController } from './clipboard.js';
import { createListeningController } from './listening.js';
import { createMicrophoneController } from './microphone.js';
import { createAudioModeController } from './audio-mode.js';
import { createTextTranslationController } from './text-translation.js';
import { createImageTranslationController } from './image-translation.js';
import { createHistoryManager } from './history-manager.js';

export function initApp() {
  let languageManager = null;
  let textTranslator = null;
  let imageTranslator = null;
  let listeningController = null;
  let microphoneController = null;
  let audioModeController = null;
  let clipboardController = null;
  let historyManager = null;

  function loadEntryIntoTranslator(item) {
    if (!item || !languageManager || !textTranslator) return;
    languageManager.setLanguagePair(item.from || 'English 🇬🇧', item.to || 'Urdu 🇵🇰');
    textTranslator.loadTranslation({
      input: item.input || '',
      output: item.output || '',
    });
    switchHomeView('translate', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Loaded into translator');
  }

  listeningController = createListeningController({
    onStateChange: (state) => {
      if (audioModeController) audioModeController.syncFromListening(state);
    },
  });

  microphoneController = createMicrophoneController({
    getSourceLanguage: () => (languageManager ? languageManager.getSourceLanguage() : 'English 🇬🇧'),
    onStateChange: (state) => {
      if (audioModeController) audioModeController.syncFromMicrophone(state);
    },
    onInterimTranscript: () => {
      if (textTranslator) textTranslator.updateCharCount();
    },
    onFinalTranscript: (finalText) => {
      if (textTranslator) {
        textTranslator.clearDebounce();
        textTranslator.translate(finalText);
      }
    },
  });

  audioModeController = createAudioModeController({
    microphone: microphoneController,
    listening: listeningController,
  });

  textTranslator = createTextTranslationController({
    getSourceLanguage: () => (languageManager ? languageManager.getSourceLanguage() : 'English 🇬🇧'),
    getTargetLanguage: () => (languageManager ? languageManager.getTargetLanguage() : 'Urdu 🇵🇰'),
    onSyncDirections: (hasResult) => {
      if (languageManager) languageManager.syncDirections(hasResult);
    },
    onTranslated: (entry) => {
      if (historyManager) historyManager.addEntry(entry);
    },
  });

  imageTranslator = createImageTranslationController({
    onOcrSuccess: (entry) => {
      if (historyManager) historyManager.addEntry(entry);
    },
    onCopyText: (text) => {
      if (clipboardController) clipboardController.copyText(text);
    },
    onSpeakText: (text, lang, key) => {
      if (audioModeController) audioModeController.toggleListening(text, lang, key);
    },
    onOpenInTextTranslator: (entry) => {
      loadEntryIntoTranslator(entry);
    },
  });

  languageManager = createLanguageManager({
    onDirectionsSynced: () => {
      if (imageTranslator) imageTranslator.syncDirections();
    },
    onLanguageChange: () => {
      if (textTranslator) {
        textTranslator.renderOutputState();
        const currentInput = textTranslator.getSourceText();
        if (currentInput && currentInput.trim()) {
          textTranslator.translate(currentInput);
        }
      }
    },
    onSwap: () => {
      if (textTranslator) textTranslator.handleSwap();
    },
  });

  clipboardController = createClipboardController({
    getTranslatedText: () => (textTranslator ? textTranslator.getOutputText() : ''),
    onPaste: (text) => {
      if (textTranslator) {
        textTranslator.updateCharCount();
        textTranslator.translate(text);
      }
    },
    onClear: () => {
      if (textTranslator) textTranslator.clear();
    },
  });

  historyManager = createHistoryManager({
    onUseEntry: loadEntryIntoTranslator,
    onCopyText: (text) => {
      if (clipboardController) clipboardController.copyText(text);
    },
    onSpeakEntry: (text, lang, key) => {
      if (audioModeController) audioModeController.toggleListening(text, lang, key);
    },
    getCurrentTranslation: () => {
      if (!textTranslator || !textTranslator.hasValidOutput()) return null;
      return {
        from: languageManager.getSourceLanguage(),
        to: languageManager.getTargetLanguage(),
        input: textTranslator.getSourceText(),
        output: textTranslator.getOutputText(),
      };
    },
  });

  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      audioModeController.toggleMic();
    });
  }

  const sourceListenBtn = document.getElementById('sourceListenBtn');
  if (sourceListenBtn) {
    sourceListenBtn.addEventListener('click', () => {
      audioModeController.toggleListening(
        textTranslator.getSourceText(),
        languageManager.getSourceLanguage(),
        'source'
      );
    });
  }

  const listenBtn = document.getElementById('listenBtn');
  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      const out = textTranslator.getOutputText();
      if (!out) {
        showToast('No translation to speak');
        return;
      }
      audioModeController.toggleListening(out, languageManager.getTargetLanguage(), 'target');
    });
  }

  // Initialize modules in dependency-safe order
  languageManager.init();
  listeningController.init();
  microphoneController.init();
  clipboardController.init();
  imageTranslator.init();
  textTranslator.init();
  historyManager.init();
  initNavigation();
  initPwa();

  const api = {
    languageManager,
    textTranslator,
    imageTranslator,
    listeningController,
    microphoneController,
    audioModeController,
    clipboardController,
    historyManager,
    loadEntryIntoTranslator,
    showToast,
    switchHomeView,
  };

  window.LAFZApp = api;
  return api;
}

if (typeof document !== 'undefined') {
  initApp();
}
