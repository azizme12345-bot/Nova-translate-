/**
 * Clipboard Module
 * Handles copying input or translated text, pasting with permission checks,
 * clearing text input, and sharing translations safely.
 */

import { showToast } from './ui-utils.js';

export async function copyText(text) {
  const value = String(text || '');
  if (!value) {
    showToast('Nothing to copy');
    return false;
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Copied');
      return true;
    } catch {
      // Fall through to legacy selection copy fallback
    }
  }

  try {
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(helper);
    if (ok) {
      showToast('Copied');
      return true;
    }
  } catch {
    // Ignore and notify below
  }

  showToast('Could not copy');
  return false;
}

export async function pasteText() {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
    showToast('Unable to read clipboard. Please paste manually.');
    return null;
  }

  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const perm = await navigator.permissions.query({ name: 'clipboard-read' });
        if (perm && perm.state === 'denied') {
          showToast('Clipboard permission denied. Please paste manually.');
          return null;
        }
      } catch {
        // Ignore if browser does not expose clipboard-read permission descriptor
      }
    }

    const pasted = await navigator.clipboard.readText();
    if (!pasted) {
      showToast('Clipboard is empty');
      return '';
    }
    return pasted;
  } catch {
    showToast('Unable to read clipboard. Please paste manually.');
    return null;
  }
}

export function clearText(inputEl, onCleared) {
  if (inputEl && 'value' in inputEl) {
    inputEl.value = '';
  }
  if (typeof onCleared === 'function') {
    onCleared();
  }
  showToast('Text cleared');
}

export async function shareTranslation(sourceText, translatedText) {
  const output = String(translatedText || '');
  if (!output) return false;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'LAFZ Translation',
        text: `${String(sourceText || '')}\n\n${output}`,
      });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return false;
      }
    }
  }

  return copyText(output);
}

export function createClipboardController(callbacks = {}) {
  const copyBtn = document.getElementById('copyBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const shareBtn = document.getElementById('shareBtn');
  const sourceTextEl = document.getElementById('sourceText');

  function init() {
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const output = typeof callbacks.getTranslatedText === 'function' ? callbacks.getTranslatedText() : '';
        if (!output) return;
        copyText(output);
      });
    }

    if (pasteBtn && sourceTextEl) {
      pasteBtn.addEventListener('click', async () => {
        const text = await pasteText();
        if (text) {
          sourceTextEl.value = text;
          if (typeof callbacks.onPaste === 'function') {
            callbacks.onPaste(text);
          }
          showToast('Text pasted from clipboard');
        }
      });
    }

    if (clearBtn && sourceTextEl) {
      clearBtn.addEventListener('click', () => {
        clearText(sourceTextEl, callbacks.onClear);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const output = typeof callbacks.getTranslatedText === 'function' ? callbacks.getTranslatedText() : '';
        if (!output) return;
        const input = sourceTextEl ? sourceTextEl.value : '';
        shareTranslation(input, output);
      });
    }
  }

  return {
    init,
    copyText,
    pasteText,
    clearText,
    shareTranslation,
  };
}
