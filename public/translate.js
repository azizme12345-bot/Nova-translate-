(function (window) {
  'use strict';

  var CACHE_KEY = 'nova_translation_cache_v3';
  var FORCE_OFFLINE_KEY = 'nova_force_offline';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  var MAX_CACHE_SIZE = 250;

  var OFFLINE_DICTIONARY = {
    en_to_ur: {
      'hello': 'سلام / ہیلو',
      'welcome': 'خوش آمدید',
      'how are you': 'آپ کیسے ہیں؟',
      'thank you': 'شکریہ',
      'thanks': 'شکریہ',
      'good morning': 'صبح بخیر',
      'good evening': 'شام بخیر',
      'good night': 'شب بخیر',
      'yes': 'جی ہاں',
      'no': 'جی نہیں',
      'please': 'براہ کرم',
      'sorry': 'معذرت / معاف کیجیے',
      'goodbye': 'خدا حافظ',
      'bye': 'اللہ حافظ',
      'what is your name': 'آپ کا نام کیا ہے؟',
      'my name is': 'میرا نام ... ہے',
      'where is the bathroom': 'باتھ روم کہاں ہے؟',
      'help': 'مدد کریں',
      'i love you': 'میں آپ سے محبت کرتا ہوں',
      'how much is this': 'یہ کتنے کا ہے؟',
      'water': 'پانی',
      'food': 'کھانا',
      'hospital': 'ہسپتال',
      'doctor': 'ڈاکٹر'
    },
    ur_to_en: {
      'سلام': 'Hello / Peace be upon you',
      'ہیلو': 'Hello',
      'خوش آمدید': 'Welcome',
      'آپ کیسے ہیں': 'How are you?',
      'آپ کیسے ہیں؟': 'How are you?',
      'شکریہ': 'Thank you',
      'صبح بخیر': 'Good morning',
      'شام بخیر': 'Good evening',
      'شب بخیر': 'Good night',
      'جی ہاں': 'Yes',
      'جی نہیں': 'No',
      'براہ کرم': 'Please',
      'معذرت': 'Sorry',
      'خدا حافظ': 'Goodbye',
      'الله حافظ': 'Goodbye',
      'آپ کا نام کیا ہے؟': 'What is your name?',
      'پانی': 'Water',
      'کھانا': 'Food',
      'ہسپتال': 'Hospital',
      'مدد': 'Help'
    },
    en_to_ar: {
      'hello': 'مرحباً / السلام عليكم',
      'welcome': 'أهلاً وسهلاً',
      'how are you': 'كيف حالك؟',
      'thank you': 'شكراً جزيلاً',
      'good morning': 'صباح الخير',
      'good evening': 'مساء الخير',
      'yes': 'نعم',
      'no': 'لا',
      'please': 'من فضلك',
      'sorry': 'آسف',
      'goodbye': 'مع السلامة'
    },
    en_to_hi: {
      'hello': 'नमस्ते (Namaste)',
      'welcome': 'स्वागत है',
      'how are you': 'आप कैसे हैं?',
      'thank you': 'धन्यवाद / शुक्रिया',
      'good morning': 'सुप्रभात',
      'yes': 'हाँ',
      'no': 'नहीं',
      'please': 'कृपया',
      'sorry': 'क्षमा करें',
      'goodbye': 'अलविदा'
    },
    en_to_es: {
      'hello': 'Hola',
      'welcome': 'Bienvenido',
      'how are you': '¿Cómo estás?',
      'thank you': 'Gracias',
      'good morning': 'Buenos días',
      'yes': 'Sí',
      'no': 'No',
      'please': 'Por favor',
      'sorry': 'Lo siento',
      'goodbye': 'Adiós'
    }
  };

  var activeTranslationId = 0;

  function buildApiHeaders(extra) {
    var headers = { 'Content-Type': 'application/json' };
    if (extra) {
      Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
    }
    return headers;
  }

  async function parseApiResponse(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') !== -1) {
      var json = await res.json();
      if (!res.ok || json.ok === false || (json.success === false && json.data === undefined)) {
        var errText = typeof json.error === 'string'
          ? json.error
          : (json.error && json.error.message);
        throw new Error(errText || ('Request failed with HTTP status ' + res.status));
      }
      return json.data !== undefined ? json.data : json;
    }
    var txt = await res.text();
    if (res.status === 413 || txt.indexOf('Request Entity Too Large') !== -1 || txt.indexOf('Payload Too Large') !== -1) {
      throw new Error('The uploaded file or payload exceeds the allowed server limit. Please use a smaller file.');
    }
    if (!res.ok) {
      throw new Error(txt.slice(0, 150) || ('Server error (HTTP ' + res.status + ')'));
    }
    throw new Error('Unexpected response from server (HTTP ' + res.status + ')');
  }

  function normalizeCacheKey(text, src, tgt) {
    return encodeURIComponent(
      String(src || 'auto').trim().toLowerCase() + ':' +
      String(tgt || 'ur').trim().toLowerCase() + ':' +
      String(text || '').trim().toLowerCase()
    );
  }

  function getCachedTranslation(text, src, tgt) {
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      var key = normalizeCacheKey(text, src, tgt);
      var entry = cache[key];
      if (!entry) return null;
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        delete cache[key];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return null;
      }
      return entry.result;
    } catch (e) {
      return null;
    }
  }

  function setCachedTranslation(text, src, tgt, result) {
    if (!text || !result || !result.translatedText || result.isOffline) return;
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      var key = normalizeCacheKey(text, src, tgt);
      var keys = Object.keys(cache);
      if (keys.length >= MAX_CACHE_SIZE) {
        keys.sort(function (a, b) { return cache[a].timestamp - cache[b].timestamp; });
        keys.slice(0, keys.length - MAX_CACHE_SIZE + 1).forEach(function (k) { delete cache[k]; });
      }
      cache[key] = { result: result, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function translateOffline(text, srcLang, tgtLang) {
    var clean = text.trim();
    var lower = clean.toLowerCase();

    var srcCode = window.LAFZLang ? window.LAFZLang.getShortCode(srcLang || 'English') : 'en';
    var tgtCode = window.LAFZLang ? window.LAFZLang.getShortCode(tgtLang || 'Urdu') : 'ur';
    var dict = OFFLINE_DICTIONARY[srcCode + '_to_' + tgtCode];
    var translated = '';
    var isMissing = false;

    if (dict && dict[lower]) {
      translated = dict[lower];
    } else {
      translated = 'Translation not available offline. Please try again when online.';
      isMissing = true;
    }

    return {
      originalText: clean,
      translatedText: translated,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      confidence: null,
      provider: 'offline',
      fromCache: false,
      isOffline: true,
      isError: isMissing
    };
  }

  function cancelPending() {
    activeTranslationId++;
  }

  async function executeTranslation(textToTranslate, srcLang, tgtLang, callbacks) {
    var trimmed = String(textToTranslate || '').trim();
    var requestId = ++activeTranslationId;
    var cb = callbacks || {};

    if (!trimmed) {
      if (cb.onEmpty) cb.onEmpty();
      return;
    }

    if (cb.onStart) cb.onStart();

    try {
      var forceOffline = false;
      try { forceOffline = localStorage.getItem(FORCE_OFFLINE_KEY) === '1'; } catch (e) {}
      var online = !forceOffline && (typeof navigator !== 'undefined' ? navigator.onLine : true);

      var apiSrc = window.LAFZLang ? window.LAFZLang.getTranslationName(srcLang) : srcLang;
      var apiTgt = window.LAFZLang ? window.LAFZLang.getTranslationName(tgtLang) : tgtLang;

      var result = null;
      if (!online) {
        result = translateOffline(trimmed, srcLang, tgtLang);
      } else {
        result = getCachedTranslation(trimmed, apiSrc, apiTgt);
        if (!result) {
          var res = await fetch('/api/translate', {
            method: 'POST',
            headers: buildApiHeaders(),
            body: JSON.stringify({
              text: trimmed,
              sourceLanguage: apiSrc,
              targetLanguage: apiTgt,
              tone: 'natural'
            })
          });
          result = await parseApiResponse(res);
          if (requestId !== activeTranslationId) return;
          if (!result || !result.translatedText) {
            throw new Error('Empty translation returned from server.');
          }
          setCachedTranslation(trimmed, apiSrc, apiTgt, result);
        }
      }

      if (requestId !== activeTranslationId) return;
      if (cb.onSuccess) cb.onSuccess(result, trimmed, srcLang, tgtLang);
    } catch (err) {
      if (requestId !== activeTranslationId) return;
      if (cb.onError) cb.onError(err);
    }
  }

  window.LAFZTranslate = {
    buildApiHeaders: buildApiHeaders,
    parseApiResponse: parseApiResponse,
    cancelPending: cancelPending,
    execute: executeTranslation
  };
})(window);
