(function (window) {
  'use strict';

  var activeRecognition = null;

  function notify(msg) {
    if (window.LAFZApp && typeof window.LAFZApp.showToast === 'function') {
      window.LAFZApp.showToast(msg);
    }
  }

  function setMicListeningUi(listening) {
    var micBtn = document.getElementById('micBtn');
    var micBtnLabel = document.getElementById('micBtnLabel');
    var listeningIndicator = document.getElementById('listeningIndicator');
    if (micBtn) micBtn.classList.toggle('recording', listening);
    if (micBtnLabel) micBtnLabel.textContent = listening ? 'Stop' : 'Speak';
    if (listeningIndicator) {
      listeningIndicator.classList.toggle('hidden', !listening);
      listeningIndicator.textContent = '● Listening...';
    }
  }

  function handleMicButtonClick(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    var tapTime = Date.now();
    var debugEvents = [];

    function logEvent(name) {
      debugEvents.push(name + ': ' + (Date.now() - tapTime) + 'ms');
    }

    if (activeRecognition) {
      var recToStop = activeRecognition;
      recToStop._manuallyStopped = true;
      setMicListeningUi(false);
      try {
        recToStop.stop();
      } catch (err) {
        activeRecognition = null;
      }
      return;
    }

    if (window.LAFZListen && typeof window.LAFZListen.stop === 'function') {
      window.LAFZListen.stop();
    }

    var BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!BrowserSpeechRecognition) {
      setMicListeningUi(false);
      notify('Is browser mein voice input support nahi hai. Chrome use karein.');
      alert('error: SpeechRecognition not supported (' + (Date.now() - tapTime) + 'ms)');
      return;
    }

    if (window.isSecureContext === false) {
      setMicListeningUi(false);
      notify('Microphone sirf HTTPS ya localhost par kaam karta hai.');
      alert('error: insecure-context (' + (Date.now() - tapTime) + 'ms)');
      return;
    }

    var sourceLangEl = document.getElementById('sourceLang');
    var sourceTextEl = document.getElementById('sourceText');
    var srcLang = (sourceLangEl && sourceLangEl.value) ? sourceLangEl.value : 'English 🇬🇧';
    var langWord = window.LAFZLang ? window.LAFZLang.getTranslationName(srcLang) : srcLang.split(/\s+/)[0];
    var speechLocale = window.LAFZLang ? window.LAFZLang.getSpeechCode(srcLang) : 'en-US';
    var basePrefix = (sourceTextEl && sourceTextEl.value) ? sourceTextEl.value.trim() : '';
    var sessionTranscript = '';
    var sessionError = '';

    try {
      var recognition = new BrowserSpeechRecognition();
      recognition._manuallyStopped = false;
      activeRecognition = recognition;
      setMicListeningUi(true);

      recognition.lang = speechLocale;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = function () {
        logEvent('start');
        if (activeRecognition !== recognition) return;
        notify('Listening in ' + langWord + '… Speak now');
      };

      recognition.onaudiostart = function () {
        logEvent('audiostart');
      };

      recognition.onsoundstart = function () {
        logEvent('soundstart');
      };

      recognition.onspeechstart = function () {
        logEvent('speechstart');
      };

      recognition.onresult = function (event) {
        logEvent('result');
        if (activeRecognition !== recognition) return;
        var parts = [];
        for (var i = 0; i < event.results.length; i++) {
          var res = event.results[i];
          var piece = res && res[0] && res[0].transcript ? res[0].transcript.trim() : '';
          if (piece) parts.push(piece);
        }
        sessionTranscript = parts.join(' ').trim();
        if (sessionTranscript && sourceTextEl) {
          sourceTextEl.value = basePrefix ? (basePrefix + ' ' + sessionTranscript) : sessionTranscript;
          if (window.LAFZApp && typeof window.LAFZApp.updateCharCount === 'function') {
            window.LAFZApp.updateCharCount();
          }
        }
      };

      recognition.onerror = function (ev) {
        var errName = (ev && ev.error) ? ev.error : 'unknown-error';
        logEvent('error (' + errName + ')');
        sessionError = errName;
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        setMicListeningUi(false);

        if (errName === 'aborted' && recognition._manuallyStopped) {
          return;
        }
        if (errName === 'no-speech') {
          notify('Koi awaaz nahi suni gayi. Dobara Speak dabaa kar bolain.');
        } else if (errName === 'not-allowed' || errName === 'service-not-allowed') {
          notify('Mic permission band hai. Browser settings se Microphone allow karein.');
        } else if (errName === 'audio-capture') {
          notify('Microphone device nahi mila.');
        } else if (errName === 'network') {
          notify('Voice input ke liye internet connection zaroori hai.');
        } else {
          notify('Mic error: ' + errName);
        }
      };

      recognition.onspeechend = function () {
        logEvent('speechend');
      };

      recognition.onsoundend = function () {
        logEvent('soundend');
      };

      recognition.onaudioend = function () {
        logEvent('audioend');
      };

      recognition.onend = function () {
        logEvent('end');
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        setMicListeningUi(false);
        if (window.LAFZApp && typeof window.LAFZApp.clearDebounce === 'function') {
          window.LAFZApp.clearDebounce();
        }
        var finalVal = (sourceTextEl && sourceTextEl.value) ? sourceTextEl.value.trim() : '';
        if (sessionTranscript && finalVal && window.LAFZApp && typeof window.LAFZApp.triggerTranslate === 'function') {
          window.LAFZApp.triggerTranslate(finalVal);
        } else if (!sessionError && !recognition._manuallyStopped && !sessionTranscript) {
          notify('Koi awaaz record nahi hui.');
        }
        alert(debugEvents.join('\n'));
      };

      recognition.start();
    } catch (err) {
      var errCode = (err && (err.name || err.message)) || 'start-failed';
      logEvent('error (' + errCode + ')');
      logEvent('end');
      activeRecognition = null;
      setMicListeningUi(false);
      notify('Mic error: ' + errCode);
      alert(debugEvents.join('\n'));
    }
  }

  window.LAFZMic = {
    handleClick: handleMicButtonClick
  };
})(window);
