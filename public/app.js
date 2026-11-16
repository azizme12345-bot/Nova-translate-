(function (window, document) {
  'use strict';

  var PLACEHOLDER_OUTPUT = 'Translation will appear here...';
  var HISTORY_KEY = 'nova_translation_history';
  var SAVED_KEY = 'nova_saved_items';

  var HISTORY_VIEW_MODES = {
    translate: true,
    'text-translation': true,
    'voice-translation': true,
    image: true,
    history: true,
    saved: true,
    languages: true
  };

  var LANGUAGES = window.LAFZ_LANGUAGES || [];
  var LangHelper = window.LAFZLang;

  function readStorage(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* State */
  var activeView = 'translate';
  var historyItems = readStorage(HISTORY_KEY, []);
  var savedItems = readStorage(SAVED_KEY, []);
  var currentOutputText = '';
  var isTranslating = false;
  var lastOutputIsError = false;
  var debounceTimer = null;
  var toastTimer = null;

  /* DOM Refs */
  var yearEl = document.getElementById('year');
  var toastEl = document.getElementById('toast');
  var menuToggle = document.getElementById('menuToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var pwaInstallBtn = document.getElementById('pwaInstallBtn');
  var iosInstallModal = document.getElementById('iosInstallModal');
  var closeIosModalBtn = document.getElementById('closeIosModalBtn');

  var sourceLangEl = document.getElementById('sourceLang');
  var targetLangEl = document.getElementById('targetLang');
  var swapLangEl = document.getElementById('swapLang');
  var translateForm = document.getElementById('translateForm');
  var translateBtn = document.getElementById('translateBtn');
  var sourceTextEl = document.getElementById('sourceText');
  var outputEl = document.getElementById('output');
  var charCountEl = document.getElementById('charCount');
  var resultStatusEl = document.getElementById('resultStatus');
  var confidenceBadgeEl = document.getElementById('confidenceBadge');
  var sourceLabelHead = document.getElementById('sourceLabelHead');
  var targetLabelHead = document.getElementById('targetLabelHead');

  var micBtn = document.getElementById('micBtn');
  var pasteBtn = document.getElementById('pasteBtn');
  var clearBtn = document.getElementById('clearBtn');
  var sourceListenBtn = document.getElementById('sourceListenBtn');
  var copyBtn = document.getElementById('copyBtn');
  var listenBtn = document.getElementById('listenBtn');
  var saveBtn = document.getElementById('saveBtn');
  var shareBtn = document.getElementById('shareBtn');
  var voiceGenderBtn = document.getElementById('voiceGenderBtn');
  var voiceGenderLabel = document.getElementById('voiceGenderLabel');

  var historySearchEl = document.getElementById('historySearch');
  var clearHistoryEl = document.getElementById('clearHistory');
  var historyListEl = document.getElementById('historyList');
  var fullHistoryListEl = document.getElementById('fullHistoryList');
  var fullHistoryHeading = document.getElementById('fullHistoryHeading');
  var clearAllHistoryPageBtn = document.getElementById('clearAllHistoryPageBtn');
  var savedListEl = document.getElementById('savedList');
  var clearAllSavedBtn = document.getElementById('clearAllSavedBtn');
  var languagesCatalogGrid = document.getElementById('languagesCatalogGrid');
  var ocrSourceEl = document.getElementById('ocrSource');
  var ocrTargetEl = document.getElementById('ocrTarget');

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  function clearDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function copyTextToClipboard(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      showToast('Could not copy');
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied');
    }).catch(function () {
      showToast('Could not copy');
    });
  }

  function initLanguages() {
    var defaultSrc = document.body.getAttribute('data-default-source') || 'English 🇬🇧';
    var defaultTgt = document.body.getAttribute('data-default-target') || 'Urdu 🇵🇰';
    var selects = [sourceLangEl, targetLangEl, ocrSourceEl, ocrTargetEl];
    selects.forEach(function (sel, idx) {
      if (!sel) return;
      sel.innerHTML = LANGUAGES.map(function (l) {
        return '<option value="' + escapeHtml(l.label) + '">' + escapeHtml(l.label) + '</option>';
      }).join('');
      sel.value = idx % 2 === 0 ? defaultSrc : defaultTgt;
    });

    if (languagesCatalogGrid) {
      languagesCatalogGrid.innerHTML = LANGUAGES.map(function (l) {
        return (
          '<div class="lang-card">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
              '<strong style="font-size:16px;color:var(--navy);">' + escapeHtml(l.label) + '</strong>' +
              '<span style="font-size:11px;font-weight:700;background:#dbeafe;color:var(--blue);padding:2px 8px;border-radius:999px;text-transform:uppercase;">' + escapeHtml(l.code) + '</span>' +
            '</div>' +
            '<div style="font-size:13px;color:var(--muted);">Native Name: <strong style="color:var(--ink);">' + escapeHtml(l.nativeName) + '</strong></div>' +
            '<div style="font-size:12px;color:var(--muted);">Text &amp; Voice Translation: <strong style="color:var(--blue);">Supported</strong></div>' +
          '</div>'
        );
      }).join('');
    }
    syncTranslatorDirections();
  }

  function syncTranslatorDirections() {
    if (!sourceLangEl || !targetLangEl) return;
    var src = sourceLangEl.value || 'English 🇬🇧';
    var tgt = targetLangEl.value || 'Urdu 🇵🇰';
    var srcName = LangHelper ? LangHelper.getTranslationName(src) : src.split(' ')[0];
    var tgtName = LangHelper ? LangHelper.getTranslationName(tgt) : tgt.split(' ')[0];

    if (sourceLabelHead) sourceLabelHead.textContent = 'Source (' + srcName + ')';
    if (targetLabelHead) targetLabelHead.textContent = 'Translation (' + tgtName + ')';

    var srcRtl = LangHelper ? LangHelper.isRtl(src) : false;
    if (sourceTextEl) {
      sourceTextEl.setAttribute('dir', srcRtl ? 'rtl' : 'ltr');
      sourceTextEl.classList.toggle('rtl-text', srcRtl);
    }

    var hasResult = currentOutputText && currentOutputText !== PLACEHOLDER_OUTPUT && !isTranslating;
    var tgtRtl = (LangHelper ? LangHelper.isRtl(tgt) : false) && hasResult;
    if (outputEl) {
      outputEl.setAttribute('dir', tgtRtl ? 'rtl' : 'ltr');
      outputEl.classList.toggle('rtl-text', tgtRtl);
    }

    if (window.LAFZImage && typeof window.LAFZImage.syncDirections === 'function') {
      window.LAFZImage.syncDirections();
    }
  }

  function renderOutputState() {
    syncTranslatorDirections();
    if (!resultStatusEl || !outputEl || !confidenceBadgeEl || !translateBtn) return;

    if (isTranslating) {
      resultStatusEl.textContent = 'Translating...';
      resultStatusEl.className = 'status-pill busy';
      outputEl.innerHTML = '<span style="color:var(--blue);font-weight:500;">Translating smoothly...</span>';
      confidenceBadgeEl.classList.add('hidden');
      translateBtn.disabled = true;
      translateBtn.innerHTML = '<span>Translating...</span>';
    } else if (currentOutputText) {
      resultStatusEl.textContent = lastOutputIsError ? 'Error' : 'Ready';
      resultStatusEl.className = lastOutputIsError ? 'status-pill' : 'status-pill ready';
      outputEl.textContent = currentOutputText;
      translateBtn.disabled = false;
      translateBtn.innerHTML = '<span>Translate</span><span style="font-size:12px;opacity:0.85;">↵</span>';
    } else {
      resultStatusEl.textContent = 'Waiting';
      resultStatusEl.className = 'status-pill';
      outputEl.innerHTML = '<span class="output-placeholder">' + PLACEHOLDER_OUTPUT + '</span>';
      confidenceBadgeEl.classList.add('hidden');
      translateBtn.disabled = false;
      translateBtn.innerHTML = '<span>Translate</span><span style="font-size:12px;opacity:0.85;">↵</span>';
    }
  }

  function updateCharCount() {
    if (!sourceTextEl || !charCountEl || !clearBtn) return;
    var len = (sourceTextEl.value || '').length;
    charCountEl.textContent = len.toLocaleString() + ' / 5,000';
    clearBtn.classList.toggle('hidden', len === 0);
  }

  function addHistoryEntry(item) {
    var exists = historyItems.some(function (i) {
      return i.input.trim() === item.input.trim() && i.to === item.to;
    });
    if (exists) return;
    historyItems = [item].concat(historyItems).slice(0, 100);
    writeStorage(HISTORY_KEY, historyItems);
    renderHistory();
  }

  function deleteHistoryEntry(id) {
    historyItems = historyItems.filter(function (i) { return i.id !== id; });
    writeStorage(HISTORY_KEY, historyItems);
    renderHistory();
    showToast('History item deleted');
  }

  function clearAllHistory() {
    historyItems = [];
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderHistory();
    showToast('History cleared');
  }

  function loadEntryIntoTranslator(item) {
    if (sourceLangEl) sourceLangEl.value = item.from || 'English 🇬🇧';
    if (targetLangEl) targetLangEl.value = item.to || 'Urdu 🇵🇰';
    if (sourceTextEl) sourceTextEl.value = item.input || '';
    lastOutputIsError = false;
    currentOutputText = item.output || '';
    if (confidenceBadgeEl) confidenceBadgeEl.classList.add('hidden');
    updateCharCount();
    renderOutputState();
    switchHomeView('translate', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Loaded into translator');
  }

  function renderHistory() {
    if (clearHistoryEl) {
      clearHistoryEl.classList.toggle('hidden', historyItems.length === 0);
    }
    if (clearAllHistoryPageBtn) {
      clearAllHistoryPageBtn.classList.toggle('hidden', historyItems.length === 0);
    }
    if (fullHistoryHeading) {
      fullHistoryHeading.textContent = 'Stored History Entries (' + historyItems.length + ')';
    }

    var term = (historySearchEl && historySearchEl.value ? historySearchEl.value : '').trim().toLowerCase();
    var filtered = historyItems.filter(function (item) {
      if (!term) return true;
      return (
        item.input.toLowerCase().indexOf(term) !== -1 ||
        item.output.toLowerCase().indexOf(term) !== -1 ||
        item.from.toLowerCase().indexOf(term) !== -1 ||
        item.to.toLowerCase().indexOf(term) !== -1
      );
    });

    function buildHistoryCards(list, emptyMsg) {
      if (list.length === 0) {
        return '<div style="text-align:center;padding:32px 12px;color:var(--muted-light);font-size:14px;">' + escapeHtml(emptyMsg) + '</div>';
      }
      return list.map(function (item) {
        return (
          '<div class="history-item" data-id="' + escapeHtml(item.id) + '">' +
            '<div style="min-width:0;flex:1 1 auto;">' +
              '<div class="history-meta">' +
                '<span>' + escapeHtml(item.from.split(' ')[0]) + '</span>' +
                '<span>→</span>' +
                '<span class="to-lang">' + escapeHtml(item.to.split(' ')[0]) + '</span>' +
                (item.time ? '<span>• ' + escapeHtml(item.time) + '</span>' : '') +
              '</div>' +
              '<div class="history-src">' + escapeHtml(item.input) + '</div>' +
              '<div class="history-out">' + escapeHtml(item.output) + '</div>' +
            '</div>' +
            '<div class="history-actions">' +
              '<button type="button" class="mini-btn blue" data-action="use" data-id="' + escapeHtml(item.id) + '">Use</button>' +
              '<button type="button" class="mini-btn" data-action="copy" data-id="' + escapeHtml(item.id) + '">Copy</button>' +
              '<button type="button" class="mini-btn" data-action="speak" data-id="' + escapeHtml(item.id) + '" title="Speak">🔊</button>' +
              '<button type="button" class="mini-btn" data-action="del" data-id="' + escapeHtml(item.id) + '" title="Delete">✕</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

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
    var list = savedItems;
    if (clearAllSavedBtn) {
      clearAllSavedBtn.classList.toggle('hidden', savedItems.length === 0);
    }
    if (savedListEl) {
      if (list.length === 0) {
        savedListEl.innerHTML = '<div style="text-align:center;padding:32px 12px;color:var(--muted-light);font-size:14px;">No saved items yet.</div>';
        return;
      }
      savedListEl.innerHTML = list.map(function (item) {
        return (
          '<div class="history-item">' +
            '<div style="min-width:0;flex:1 1 auto;">' +
              '<div class="history-meta"><span>' + escapeHtml(item.from) + ' → ' + escapeHtml(item.to) + '</span><span>♡ Saved</span></div>' +
              '<div class="history-src">' + escapeHtml(item.input) + ' → ' + escapeHtml(item.output) + '</div>' +
            '</div>' +
            '<div class="history-actions">' +
              '<button type="button" class="mini-btn" data-saved-speak="' + escapeHtml(item.id) + '">🔊</button>' +
              '<button type="button" class="mini-btn" data-saved-copy="' + escapeHtml(item.id) + '">Copy</button>' +
              '<button type="button" class="mini-btn blue" data-saved-use="' + escapeHtml(item.id) + '">Translate →</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }
  }

  function runTextTranslation(textToTranslate, srcLang, tgtLang) {
    if (!window.LAFZTranslate) return;
    window.LAFZTranslate.execute(textToTranslate, srcLang, tgtLang, {
      onEmpty: function () {
        lastOutputIsError = false;
        currentOutputText = '';
        isTranslating = false;
        renderOutputState();
      },
      onStart: function () {
        lastOutputIsError = false;
        isTranslating = true;
        renderOutputState();
      },
      onSuccess: function (result, trimmed, sLang, tLang) {
        lastOutputIsError = !!result.isError;
        currentOutputText = result.translatedText || '';
        isTranslating = false;

        var fromGemini = String(result.provider || '').toLowerCase() === 'gemini';
        if (
          !result.isOffline &&
          !result.isError &&
          fromGemini &&
          typeof result.confidence === 'number' &&
          result.confidence > 0 &&
          confidenceBadgeEl
        ) {
          var pct = result.confidence <= 1 ? Math.round(result.confidence * 100) : Math.round(result.confidence);
          pct = Math.max(1, Math.min(100, pct));
          confidenceBadgeEl.textContent = pct + '% Match';
          confidenceBadgeEl.classList.remove('hidden');
        } else if (confidenceBadgeEl) {
          confidenceBadgeEl.classList.add('hidden');
        }
        renderOutputState();

        if (!result.isOffline && !result.isError && currentOutputText) {
          addHistoryEntry({
            id: Date.now().toString(),
            from: sLang,
            to: tLang,
            input: trimmed,
            output: currentOutputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      },
      onError: function (err) {
        isTranslating = false;
        lastOutputIsError = true;
        currentOutputText = (err && err.message) ? err.message : 'Translation failed. Please try again.';
        if (confidenceBadgeEl) confidenceBadgeEl.classList.add('hidden');
        renderOutputState();
        showToast(currentOutputText);
      }
    });
  }

  function triggerTranslate(textValue) {
    if (!sourceLangEl || !targetLangEl) return;
    runTextTranslation(textValue, sourceLangEl.value, targetLangEl.value);
  }

  /* View Switching inside Home Page (no subpage URLs) */
  function setMobileMenuOpen(open) {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.toggle('hidden', !open);
    menuToggle.textContent = open ? '✕' : '☰';
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function switchHomeView(view, scrollTargetId) {
    if (!HISTORY_VIEW_MODES[view]) view = 'translate';
    activeView = view;

    document.querySelectorAll('.page-view').forEach(function (el) {
      el.classList.toggle('active', el.id === 'page-' + view);
    });

    document.querySelectorAll('[data-nav]').forEach(function (btn) {
      var v = btn.getAttribute('data-nav');
      btn.classList.toggle('active', v === view || (v === 'translate' && view === 'text-translation'));
    });

    setMobileMenuOpen(false);

    if (scrollTargetId) {
      var targetEl = document.getElementById(scrollTargetId);
      if (targetEl) {
        setTimeout(function () {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Navigation Events */
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      setMobileMenuOpen(mobileMenu.classList.contains('hidden'));
    });
  }

  document.addEventListener('click', function (e) {
    var navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      e.preventDefault();
      var viewName = navBtn.getAttribute('data-nav');
      switchHomeView(viewName, '');
      return;
    }
  });

  window.addEventListener('hashchange', function () {
    var h = String(window.location.hash || '').toLowerCase();
    if (h === '#historysection') switchHomeView('translate', 'historySection');
  });

  /* Translator Form Events */
  if (sourceLangEl) {
    sourceLangEl.addEventListener('change', function () {
      syncTranslatorDirections();
      if (sourceTextEl && sourceTextEl.value.trim()) {
        runTextTranslation(sourceTextEl.value, sourceLangEl.value, targetLangEl.value);
      }
    });
  }

  if (targetLangEl) {
    targetLangEl.addEventListener('change', function () {
      syncTranslatorDirections();
      if (sourceTextEl && sourceTextEl.value.trim()) {
        runTextTranslation(sourceTextEl.value, sourceLangEl.value, targetLangEl.value);
      }
    });
  }

  if (swapLangEl && sourceLangEl && targetLangEl) {
    swapLangEl.addEventListener('click', function () {
      var tmp = sourceLangEl.value;
      sourceLangEl.value = targetLangEl.value;
      targetLangEl.value = tmp;
      if (currentOutputText && currentOutputText !== PLACEHOLDER_OUTPUT && !lastOutputIsError) {
        var prevIn = sourceTextEl ? sourceTextEl.value : '';
        if (sourceTextEl) sourceTextEl.value = currentOutputText;
        currentOutputText = prevIn;
        updateCharCount();
        renderOutputState();
      } else {
        syncTranslatorDirections();
        if (sourceTextEl && sourceTextEl.value.trim()) {
          runTextTranslation(sourceTextEl.value, sourceLangEl.value, targetLangEl.value);
        }
      }
      showToast('Languages swapped');
    });
  }

  if (sourceTextEl) {
    sourceTextEl.addEventListener('input', function () {
      updateCharCount();
      clearDebounce();
      var val = sourceTextEl.value;
      if (val.trim().length > 1) {
        debounceTimer = setTimeout(function () {
          runTextTranslation(val, sourceLangEl.value, targetLangEl.value);
        }, 350);
      } else if (!val.trim()) {
        if (window.LAFZTranslate) window.LAFZTranslate.cancelPending();
        isTranslating = false;
        lastOutputIsError = false;
        currentOutputText = '';
        renderOutputState();
      }
    });
  }

  if (translateForm) {
    translateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearDebounce();
      if (sourceTextEl && sourceLangEl && targetLangEl) {
        runTextTranslation(sourceTextEl.value, sourceLangEl.value, targetLangEl.value);
      }
    });
  }

  if (micBtn) {
    micBtn.addEventListener('click', function (e) {
      if (window.LAFZMic && typeof window.LAFZMic.handleClick === 'function') {
        window.LAFZMic.handleClick(e);
      }
    });
  }

  if (pasteBtn && sourceTextEl) {
    pasteBtn.addEventListener('click', async function () {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
        showToast('Unable to read clipboard. Please paste manually.');
        return;
      }
      try {
        var text = await navigator.clipboard.readText();
        if (text) {
          sourceTextEl.value = text;
          updateCharCount();
          runTextTranslation(text, sourceLangEl.value, targetLangEl.value);
          showToast('Text pasted from clipboard');
        } else {
          showToast('Clipboard is empty');
        }
      } catch (e) {
        showToast('Unable to read clipboard. Please paste manually.');
      }
    });
  }

  if (clearBtn && sourceTextEl) {
    clearBtn.addEventListener('click', function () {
      clearDebounce();
      if (window.LAFZTranslate) window.LAFZTranslate.cancelPending();
      isTranslating = false;
      sourceTextEl.value = '';
      lastOutputIsError = false;
      currentOutputText = '';
      updateCharCount();
      renderOutputState();
      showToast('Text cleared');
    });
  }

  if (sourceListenBtn && sourceTextEl && sourceLangEl) {
    sourceListenBtn.addEventListener('click', function () {
      if (window.LAFZListen && typeof window.LAFZListen.play === 'function') {
        window.LAFZListen.play(sourceTextEl.value, sourceLangEl.value, 'source');
      }
    });
  }

  if (listenBtn && targetLangEl) {
    listenBtn.addEventListener('click', function () {
      if (!currentOutputText || lastOutputIsError) {
        showToast('No translation to speak');
        return;
      }
      if (window.LAFZListen && typeof window.LAFZListen.play === 'function') {
        window.LAFZListen.play(currentOutputText, targetLangEl.value, 'target');
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      if (!currentOutputText || lastOutputIsError) return;
      copyTextToClipboard(currentOutputText);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (!currentOutputText || lastOutputIsError) return;
      var item = {
        id: Date.now().toString(),
        from: sourceLangEl.value,
        to: targetLangEl.value,
        input: sourceTextEl.value.trim() || 'Translation item',
        output: currentOutputText,
        timestamp: '♡ Saved'
      };
      var exists = savedItems.some(function (i) { return i.input === item.input && i.to === item.to; });
      if (!exists) {
        savedItems = [item].concat(savedItems);
        writeStorage(SAVED_KEY, savedItems);
        renderSaved();
      }
      showToast('Saved to Favorites');
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async function () {
      if (!currentOutputText || lastOutputIsError) return;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'LAFZ Translation', text: sourceTextEl.value + '\n\n' + currentOutputText });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      copyTextToClipboard(currentOutputText);
    });
  }

  if (voiceGenderLabel && window.LAFZListen) {
    voiceGenderLabel.textContent = window.LAFZListen.getVoiceGender() === 'male' ? 'Male' : 'Female';
  }
  if (voiceGenderBtn && window.LAFZListen) {
    voiceGenderBtn.addEventListener('click', function () {
      var next = window.LAFZListen.getVoiceGender() === 'female' ? 'male' : 'female';
      window.LAFZListen.setVoiceGender(next);
      if (voiceGenderLabel) voiceGenderLabel.textContent = next === 'male' ? 'Male' : 'Female';
      showToast('Voice set to ' + (next === 'male' ? 'Male' : 'Female'));
    });
  }

  /* History & Saved Events */
  if (historySearchEl) historySearchEl.addEventListener('input', renderHistory);
  if (clearHistoryEl) clearHistoryEl.addEventListener('click', clearAllHistory);
  if (clearAllHistoryPageBtn) clearAllHistoryPageBtn.addEventListener('click', clearAllHistory);

  [historyListEl, fullHistoryListEl].forEach(function (container) {
    if (!container) return;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');
      var item = historyItems.find(function (i) { return i.id === id; });
      if (!item) return;
      if (action === 'use') loadEntryIntoTranslator(item);
      else if (action === 'copy') copyTextToClipboard(item.output);
      else if (action === 'speak' && window.LAFZListen) window.LAFZListen.play(item.output, item.to, 'history');
      else if (action === 'del') deleteHistoryEntry(id);
    });
  });

  if (savedListEl) {
    savedListEl.addEventListener('click', function (e) {
      var btnSpeak = e.target.closest('[data-saved-speak]');
      var btnCopy = e.target.closest('[data-saved-copy]');
      var btnUse = e.target.closest('[data-saved-use]');
      var trigger = btnSpeak || btnCopy || btnUse;
      var id = trigger && trigger.getAttribute(btnSpeak ? 'data-saved-speak' : btnCopy ? 'data-saved-copy' : 'data-saved-use');
      var item = savedItems.find(function (i) { return i.id === id; });
      if (!item) return;
      if (btnSpeak && window.LAFZListen) window.LAFZListen.play(item.output, item.to, 'saved');
      else if (btnCopy) copyTextToClipboard(item.output);
      else if (btnUse) loadEntryIntoTranslator(item);
    });
  }

  if (clearAllSavedBtn) {
    clearAllSavedBtn.addEventListener('click', function () {
      savedItems = [];
      try { localStorage.removeItem(SAVED_KEY); } catch (e) {}
      renderSaved();
      showToast('Favorites cleared');
    });
  }

  /* PWA Service Worker Registration & Install Handling */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
  });
  if (
    pwaInstallBtn &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true)
  ) {
    pwaInstallBtn.classList.add('hidden');
  }
  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          showToast('LAFZ Translation installed!');
        }
      } else {
        showToast("Chrome menu se 'Install app' ya 'Add to Home screen' chunein.");
      }
    });
  }
  if (closeIosModalBtn && iosInstallModal) {
    closeIosModalBtn.addEventListener('click', function () {
      iosInstallModal.classList.add('hidden');
    });
    iosInstallModal.addEventListener('click', function (e) {
      if (e.target === iosInstallModal) iosInstallModal.classList.add('hidden');
    });
  }

  /* Expose Public API for modules */
  window.LAFZApp = {
    showToast: showToast,
    updateCharCount: updateCharCount,
    clearDebounce: clearDebounce,
    triggerTranslate: triggerTranslate,
    addHistoryEntry: addHistoryEntry,
    copyText: copyTextToClipboard,
    loadEntryIntoTranslator: loadEntryIntoTranslator
  };

  /* Initialize */
  if (window.LAFZImage && typeof window.LAFZImage.init === 'function') {
    window.LAFZImage.init();
  }
  initLanguages();
  updateCharCount();
  renderOutputState();
  renderHistory();
  renderSaved();

  /* Initial hash scroll support */
  var initHash = String(window.location.hash || '').toLowerCase();
  if (initHash === '#historysection') switchHomeView('translate', 'historySection');
  else switchHomeView('translate', '');
})(window, document);
