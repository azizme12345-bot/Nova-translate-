/**
 * History & Saved Favorites Module
 * Manages local browser storage for recent translations and saved items.
 */

import { escapeHtml, showToast } from './ui-utils.js';

const HISTORY_KEY = 'nova_translation_history';
const SAVED_KEY = 'nova_saved_items';

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures
  }
}

export function createHistoryManager(callbacks = {}) {
  let historyItems = readStorage(HISTORY_KEY, []);
  let savedItems = readStorage(SAVED_KEY, []);

  const historySearchEl = document.getElementById('historySearch');
  const clearHistoryEl = document.getElementById('clearHistory');
  const historyListEl = document.getElementById('historyList');
  const fullHistoryListEl = document.getElementById('fullHistoryList');
  const fullHistoryHeading = document.getElementById('fullHistoryHeading');
  const clearAllHistoryPageBtn = document.getElementById('clearAllHistoryPageBtn');
  const savedListEl = document.getElementById('savedList');
  const clearAllSavedBtn = document.getElementById('clearAllSavedBtn');
  const saveBtn = document.getElementById('saveBtn');

  function buildHistoryCards(list, emptyMsg) {
    if (list.length === 0) {
      return `<div style="text-align:center;padding:32px 12px;color:var(--muted-light);font-size:14px;">${escapeHtml(emptyMsg)}</div>`;
    }
    return list
      .map(
        (item) =>
          `<div class="history-item" data-id="${escapeHtml(item.id)}">` +
          `<div style="min-width:0;flex:1 1 auto;">` +
          `<div class="history-meta">` +
          `<span>${escapeHtml(String(item.from || '').split(' ')[0])}</span>` +
          `<span>→</span>` +
          `<span class="to-lang">${escapeHtml(String(item.to || '').split(' ')[0])}</span>` +
          (item.time ? `<span>• ${escapeHtml(item.time)}</span>` : '') +
          `</div>` +
          `<div class="history-src">${escapeHtml(item.input)}</div>` +
          `<div class="history-out">${escapeHtml(item.output)}</div>` +
          `</div>` +
          `<div class="history-actions">` +
          `<button type="button" class="mini-btn blue" data-action="use" data-id="${escapeHtml(item.id)}">Use</button>` +
          `<button type="button" class="mini-btn" data-action="copy" data-id="${escapeHtml(item.id)}">Copy</button>` +
          `<button type="button" class="mini-btn" data-action="speak" data-id="${escapeHtml(item.id)}" title="Speak">🔊</button>` +
          `<button type="button" class="mini-btn" data-action="del" data-id="${escapeHtml(item.id)}" title="Delete">✕</button>` +
          `</div>` +
          `</div>`
      )
      .join('');
  }

  function renderHistory() {
    if (clearHistoryEl) clearHistoryEl.classList.toggle('hidden', historyItems.length === 0);
    if (clearAllHistoryPageBtn) clearAllHistoryPageBtn.classList.toggle('hidden', historyItems.length === 0);
    if (fullHistoryHeading) fullHistoryHeading.textContent = `Stored History Entries (${historyItems.length})`;

    const term = (historySearchEl && historySearchEl.value ? historySearchEl.value : '').trim().toLowerCase();
    const filtered = historyItems.filter((item) => {
      if (!term) return true;
      return (
        String(item.input || '').toLowerCase().includes(term) ||
        String(item.output || '').toLowerCase().includes(term) ||
        String(item.from || '').toLowerCase().includes(term) ||
        String(item.to || '').toLowerCase().includes(term)
      );
    });

    if (historyListEl) {
      historyListEl.innerHTML = buildHistoryCards(
        filtered,
        historyItems.length === 0
          ? 'No translations recorded yet. Enter text or use voice to get started.'
          : 'No matching history entries found.'
      );
    }

    if (fullHistoryListEl) {
      fullHistoryListEl.innerHTML = buildHistoryCards(
        historyItems,
        'No translations recorded yet. Start translating to build your history log.'
      );
    }
  }

  function renderSaved() {
    if (clearAllSavedBtn) {
      clearAllSavedBtn.classList.toggle('hidden', savedItems.length === 0);
    }
    if (!savedListEl) return;

    if (savedItems.length === 0) {
      savedListEl.innerHTML =
        '<div style="text-align:center;padding:32px 12px;color:var(--muted-light);font-size:14px;">No saved items yet.</div>';
      return;
    }

    savedListEl.innerHTML = savedItems
      .map(
        (item) =>
          `<div class="history-item">` +
          `<div style="min-width:0;flex:1 1 auto;">` +
          `<div class="history-meta"><span>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</span><span>♡ Saved</span></div>` +
          `<div class="history-src">${escapeHtml(item.input)} → ${escapeHtml(item.output)}</div>` +
          `</div>` +
          `<div class="history-actions">` +
          `<button type="button" class="mini-btn" data-saved-speak="${escapeHtml(item.id)}">🔊</button>` +
          `<button type="button" class="mini-btn" data-saved-copy="${escapeHtml(item.id)}">Copy</button>` +
          `<button type="button" class="mini-btn blue" data-saved-use="${escapeHtml(item.id)}">Translate →</button>` +
          `</div>` +
          `</div>`
      )
      .join('');
  }

  function addEntry({ from, to, input, output }) {
    const cleanIn = String(input || '').trim();
    const cleanOut = String(output || '').trim();
    if (!cleanIn || !cleanOut) return;

    const exists = historyItems.some(
      (i) => String(i.input || '').trim() === cleanIn && i.to === to
    );
    if (exists) return;

    const entry = {
      id: Date.now().toString(),
      from,
      to,
      input: cleanIn,
      output: cleanOut,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    historyItems = [entry, ...historyItems].slice(0, 100);
    writeStorage(HISTORY_KEY, historyItems);
    renderHistory();
  }

  function deleteEntry(id) {
    historyItems = historyItems.filter((i) => i.id !== id);
    writeStorage(HISTORY_KEY, historyItems);
    renderHistory();
    showToast('History item deleted');
  }

  function clearHistory() {
    historyItems = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore
    }
    renderHistory();
    showToast('History cleared');
  }

  function saveFavorite({ from, to, input, output }) {
    const cleanOut = String(output || '').trim();
    if (!cleanOut) return;
    const item = {
      id: Date.now().toString(),
      from,
      to,
      input: String(input || '').trim() || 'Translation item',
      output: cleanOut,
      timestamp: '♡ Saved',
    };
    const exists = savedItems.some((i) => i.input === item.input && i.to === item.to);
    if (!exists) {
      savedItems = [item, ...savedItems];
      writeStorage(SAVED_KEY, savedItems);
      renderSaved();
    }
    showToast('Saved to Favorites');
  }

  function init() {
    if (historySearchEl) historySearchEl.addEventListener('input', renderHistory);
    if (clearHistoryEl) clearHistoryEl.addEventListener('click', clearHistory);
    if (clearAllHistoryPageBtn) clearAllHistoryPageBtn.addEventListener('click', clearHistory);

    [historyListEl, fullHistoryListEl].forEach((container) => {
      if (!container) return;
      container.addEventListener('click', (e) => {
        const btn = e.target && typeof e.target.closest === 'function' ? e.target.closest('button[data-action]') : null;
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const item = historyItems.find((i) => i.id === id);
        if (!item) return;

        if (action === 'use' && typeof callbacks.onUseEntry === 'function') {
          callbacks.onUseEntry(item);
        } else if (action === 'copy' && typeof callbacks.onCopyText === 'function') {
          callbacks.onCopyText(item.output);
        } else if (action === 'speak' && typeof callbacks.onSpeakEntry === 'function') {
          callbacks.onSpeakEntry(item.output, item.to, 'history');
        } else if (action === 'del') {
          deleteEntry(id);
        }
      });
    });

    if (savedListEl) {
      savedListEl.addEventListener('click', (e) => {
        const target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        const btnSpeak = target.closest('[data-saved-speak]');
        const btnCopy = target.closest('[data-saved-copy]');
        const btnUse = target.closest('[data-saved-use]');
        const trigger = btnSpeak || btnCopy || btnUse;
        const attrName = btnSpeak ? 'data-saved-speak' : btnCopy ? 'data-saved-copy' : 'data-saved-use';
        const id = trigger && trigger.getAttribute(attrName);
        const item = savedItems.find((i) => i.id === id);
        if (!item) return;

        if (btnSpeak && typeof callbacks.onSpeakEntry === 'function') {
          callbacks.onSpeakEntry(item.output, item.to, 'saved');
        } else if (btnCopy && typeof callbacks.onCopyText === 'function') {
          callbacks.onCopyText(item.output);
        } else if (btnUse && typeof callbacks.onUseEntry === 'function') {
          callbacks.onUseEntry(item);
        }
      });
    }

    if (clearAllSavedBtn) {
      clearAllSavedBtn.addEventListener('click', () => {
        savedItems = [];
        try {
          localStorage.removeItem(SAVED_KEY);
        } catch {
          // Ignore
        }
        renderSaved();
        showToast('Favorites cleared');
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (typeof callbacks.getCurrentTranslation === 'function') {
          const current = callbacks.getCurrentTranslation();
          if (current && current.output) {
            saveFavorite(current);
          }
        }
      });
    }

    renderHistory();
    renderSaved();
  }

  return {
    init,
    addEntry,
    deleteEntry,
    clearHistory,
    saveFavorite,
    renderHistory,
    renderSaved,
    getHistoryItems: () => historyItems,
    getSavedItems: () => savedItems,
  };
}
