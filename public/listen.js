(function (window) {
  'use strict';

  var PLACEHOLDER_OUTPUT = 'Translation will appear here...';
  var VOICE_GENDER_KEY = 'novaVoiceGender';

  var activeAudioUtterance = null;
  var activeAudioKey = null;
  var audioSessionSeq = 0;
  var audioSpeakTimer = null;
  var voiceGender = getSavedVoiceGender();

  function getSavedVoiceGender() {
    try {
      var g = localStorage.getItem(VOICE_GENDER_KEY);
      if (g === 'male' || g === 'female') return g;
    } catch (e) {}
    return 'female';
  }

  function setVoiceGender(gender) {
    voiceGender = gender === 'male' ? 'male' : 'female';
    try { localStorage.setItem(VOICE_GENDER_KEY, voiceGender); } catch (e) {}
    return voiceGender;
  }

  function getVoiceGender() {
    return voiceGender;
  }

  function updateListenButtonsUi(activeKey) {
    var sourceListenBtn = document.getElementById('sourceListenBtn');
    var listenBtn = document.getElementById('listenBtn');
    var ocrListenBtn = document.getElementById('ocrListenBtn');
    if (sourceListenBtn) sourceListenBtn.classList.toggle('speaking', activeKey === 'source');
    if (listenBtn) listenBtn.classList.toggle('speaking', activeKey === 'target');
    if (ocrListenBtn) {
      ocrListenBtn.textContent = activeKey === 'ocr' ? '🔊 Stop' : '🔊 Listen';
    }
  }

  function haltBrowserSpeech() {
    var hadActive = false;
    audioSessionSeq++;
    if (audioSpeakTimer) {
      clearTimeout(audioSpeakTimer);
      audioSpeakTimer = null;
    }
    if (activeAudioUtterance) {
      activeAudioUtterance.onend = null;
      activeAudioUtterance.onerror = null;
      activeAudioUtterance = null;
    }
    if (activeAudioKey !== null) {
      hadActive = true;
      activeAudioKey = null;
    }
    updateListenButtonsUi(null);
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          hadActive = true;
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    }
    return hadActive;
  }

  function loadBrowserVoices(onReady) {
    var synth = window.speechSynthesis;
    var existing = [];
    try {
      existing = synth.getVoices() || [];
    } catch (e) {}
    if (existing.length > 0) {
      onReady(existing);
      return;
    }

    var done = false;
    var waitTimer = null;

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
      } catch (e) {}
      var loaded = [];
      try {
        loaded = synth.getVoices() || [];
      } catch (e) {}
      onReady(loaded);
    }

    try {
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', resolveVoices);
      } else {
        var prevHandler = synth.onvoiceschanged;
        synth.onvoiceschanged = function () {
          if (typeof prevHandler === 'function') {
            try { prevHandler(); } catch (e) {}
          }
          resolveVoices();
        };
      }
    } catch (e) {}

    waitTimer = setTimeout(resolveVoices, 500);
  }

  function findMatchingVoice(voices, locale, langWord) {
    if (!voices || voices.length === 0) return null;
    var wantedFull = String(locale || 'en-US').toLowerCase();
    var wantedBase = wantedFull.split('-')[0];
    var wantedWord = String(langWord || '').toLowerCase();

    var chosen = null;
    var topScore = -999;

    for (var i = 0; i < voices.length; i++) {
      var voice = voices[i];
      var vLocale = String(voice.lang || '').toLowerCase().replace(/_/g, '-');
      var vBase = vLocale.split('-')[0];
      var vName = String(voice.name || '').toLowerCase();

      var isMatch =
        vLocale === wantedFull ||
        vBase === wantedBase ||
        (wantedWord && vName.indexOf(wantedWord) !== -1);

      if (!isMatch) continue;

      var score = 0;
      if (vLocale === wantedFull) score += 40;
      else if (vBase === wantedBase) score += 20;
      else score += 5;

      if (
        vName.indexOf('natural') !== -1 ||
        vName.indexOf('neural') !== -1 ||
        vName.indexOf('online') !== -1 ||
        vName.indexOf('wavenet') !== -1
      ) {
        score += 50;
      }
      if (vName.indexOf('google') !== -1) score += 35;
      if (
        vName.indexOf('microsoft') !== -1 ||
        vName.indexOf('siri') !== -1 ||
        vName.indexOf('enhanced') !== -1 ||
        vName.indexOf('premium') !== -1 ||
        vName.indexOf('uzma') !== -1 ||
        vName.indexOf('asad') !== -1 ||
        vName.indexOf('salma') !== -1 ||
        vName.indexOf('samantha') !== -1
      ) {
        score += 20;
      }
      if (!voice.localService) score += 10;
      if (vName.indexOf('espeak') !== -1 || vName.indexOf('festival') !== -1) score -= 40;

      if (voiceGender === 'female') {
        if (
          vName.indexOf('female') !== -1 ||
          vName.indexOf('woman') !== -1 ||
          vName.indexOf('uzma') !== -1 ||
          vName.indexOf('salma') !== -1 ||
          vName.indexOf('zira') !== -1 ||
          vName.indexOf('samantha') !== -1 ||
          vName.indexOf('jenny') !== -1 ||
          vName.indexOf('aria') !== -1
        ) {
          score += 15;
        }
      } else {
        if (
          (vName.indexOf('male') !== -1 && vName.indexOf('female') === -1) ||
          vName.indexOf('asad') !== -1 ||
          vName.indexOf('david') !== -1 ||
          vName.indexOf('guy') !== -1 ||
          vName.indexOf('daniel') !== -1
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

  function notify(msg) {
    if (window.LAFZApp && typeof window.LAFZApp.showToast === 'function') {
      window.LAFZApp.showToast(msg);
    }
  }

  function playBrowserSpeech(rawText, langName, key) {
    var clean = String(rawText || '').trim();
    if (!clean || clean === PLACEHOLDER_OUTPUT) {
      notify('No text to speak');
      return;
    }
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      notify('Speech synthesis is not supported in this browser.');
      return;
    }

    if (activeAudioKey === key) {
      haltBrowserSpeech();
      return;
    }

    var hadActive = haltBrowserSpeech();
    var token = audioSessionSeq;
    var langWord = window.LAFZLang ? window.LAFZLang.getTranslationName(langName) : String(langName || 'English').split(/\s+/)[0];
    var locale = window.LAFZLang ? window.LAFZLang.getSpeechCode(langName) : 'en-US';

    activeAudioKey = key;
    updateListenButtonsUi(key);

    loadBrowserVoices(function (voices) {
      if (token !== audioSessionSeq || activeAudioKey !== key) return;

      var matched = findMatchingVoice(voices, locale, langWord);
      if (!matched && voices && voices.length > 0) {
        var baseLang = locale.split('-')[0].toLowerCase();
        matched = voices.find(function (v) {
          var vl = String(v.lang || '').toLowerCase().replace(/_/g, '-');
          return vl === baseLang || vl.indexOf(baseLang + '-') === 0;
        }) || null;
      }

      if (voices && voices.length > 0 && !matched) {
        activeAudioKey = null;
        activeAudioUtterance = null;
        updateListenButtonsUi(null);
        notify('Is device par ' + langWord + ' ki awaaz (TTS voice) mojood nahi hai.');
        return;
      }

      function dispatchSpeak() {
        if (token !== audioSessionSeq || activeAudioKey !== key) return;
        try {
          var utterance = new SpeechSynthesisUtterance(clean);
          activeAudioUtterance = utterance;
          if (matched) {
            utterance.voice = matched;
            utterance.lang = matched.lang || locale;
          } else {
            utterance.lang = locale;
          }
          utterance.volume = 1;
          utterance.rate = voiceGender === 'male' ? 0.94 : 0.98;
          utterance.pitch = voiceGender === 'male' ? 0.88 : 1.06;

          utterance.onend = function () {
            if (activeAudioUtterance !== utterance) return;
            activeAudioUtterance = null;
            activeAudioKey = null;
            updateListenButtonsUi(null);
          };

          utterance.onerror = function (ev) {
            if (activeAudioUtterance !== utterance) return;
            var errName = (ev && ev.error) ? ev.error : 'unknown-error';
            activeAudioUtterance = null;
            activeAudioKey = null;
            updateListenButtonsUi(null);
            if (errName === 'canceled' || errName === 'interrupted') return;
            notify('Speech error: ' + errName);
          };

          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch (e) {}

          notify('Speaking in ' + langWord + '…');
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          haltBrowserSpeech();
          notify('Speech error: ' + ((err && (err.message || err.name)) || 'failed'));
        }
      }

      if (hadActive) {
        audioSpeakTimer = setTimeout(function () {
          audioSpeakTimer = null;
          dispatchSpeak();
        }, 60);
      } else {
        dispatchSpeak();
      }
    });
  }

  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }

  window.LAFZListen = {
    play: playBrowserSpeech,
    stop: haltBrowserSpeech,
    getVoiceGender: getVoiceGender,
    setVoiceGender: setVoiceGender
  };
})(window);
