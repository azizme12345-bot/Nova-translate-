(function (window) {
  'use strict';

  var scannedImageBase64 = '';
  var ocrExtractedText = '';
  var ocrTranslatedText = '';
  var isOcrLoading = false;

  function notify(msg) {
    if (window.LAFZApp && typeof window.LAFZApp.showToast === 'function') {
      window.LAFZApp.showToast(msg);
    }
  }

  function syncDirections() {
    var ocrSourceEl = document.getElementById('ocrSource');
    var ocrTargetEl = document.getElementById('ocrTarget');
    var ocrSourceLabel = document.getElementById('ocrSourceLabel');
    var ocrTargetLabel = document.getElementById('ocrTargetLabel');
    var imageOutputEl = document.getElementById('imageOutput');

    if (ocrSourceEl && ocrSourceLabel) {
      var srcName = window.LAFZLang ? window.LAFZLang.getTranslationName(ocrSourceEl.value || 'English') : 'English';
      ocrSourceLabel.textContent = 'Detected Text (' + srcName + ')';
    }
    if (ocrTargetEl && ocrTargetLabel && imageOutputEl) {
      var ot = ocrTargetEl.value || 'Urdu 🇵🇰';
      var tgtName = window.LAFZLang ? window.LAFZLang.getTranslationName(ot) : 'Urdu';
      ocrTargetLabel.textContent = 'Translation (' + tgtName + ')';
      var isRtl = window.LAFZLang ? window.LAFZLang.isRtl(ot) : false;
      imageOutputEl.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    }
  }

  async function processOcrImage(dataUrl) {
    var previewImg = document.getElementById('previewImg');
    var uploadBox = document.getElementById('uploadBox');
    var ocrPreviewWrap = document.getElementById('ocrPreviewWrap');
    var clearImageBtn = document.getElementById('clearImage');
    var extractBtn = document.getElementById('extractBtn');
    var ocrLoadingEl = document.getElementById('ocrLoading');
    var ocrResultsEl = document.getElementById('ocrResults');
    var ocrSourceEl = document.getElementById('ocrSource');
    var ocrTargetEl = document.getElementById('ocrTarget');
    var extractedTextEl = document.getElementById('extractedText');
    var imageOutputEl = document.getElementById('imageOutput');

    scannedImageBase64 = dataUrl;
    if (previewImg) previewImg.src = dataUrl;
    if (uploadBox) uploadBox.classList.add('hidden');
    if (ocrPreviewWrap) ocrPreviewWrap.classList.remove('hidden');
    if (clearImageBtn) clearImageBtn.classList.remove('hidden');
    if (extractBtn) extractBtn.disabled = true;
    isOcrLoading = true;
    if (ocrLoadingEl) ocrLoadingEl.classList.remove('hidden');
    if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
    notify('Scanning and extracting text...');

    var mimeMatch = String(dataUrl || '').match(/^data:([^;]+);base64,/);
    var detectedMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var rawB64 = dataUrl.indexOf(',') !== -1 ? dataUrl.split(',')[1] : dataUrl;
    var src = (ocrSourceEl && ocrSourceEl.value) ? ocrSourceEl.value : 'English 🇬🇧';
    var tgt = (ocrTargetEl && ocrTargetEl.value) ? ocrTargetEl.value : 'Urdu 🇵🇰';
    var apiSrc = window.LAFZLang ? window.LAFZLang.getTranslationName(src) : src;
    var apiTgt = window.LAFZLang ? window.LAFZLang.getTranslationName(tgt) : tgt;

    try {
      var headers = window.LAFZTranslate ? window.LAFZTranslate.buildApiHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch('/api/ocr-translate', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          imageBase64: rawB64,
          mimeType: detectedMime,
          sourceLanguage: apiSrc,
          targetLanguage: apiTgt
        })
      });
      var data = window.LAFZTranslate ? await window.LAFZTranslate.parseApiResponse(res) : await res.json();
      if (!data || !data.extractedText || !data.translatedText) {
        throw new Error('No text detected in this image.');
      }
      ocrExtractedText = data.extractedText;
      ocrTranslatedText = data.translatedText;
      if (extractedTextEl) extractedTextEl.textContent = ocrExtractedText;
      if (imageOutputEl) imageOutputEl.textContent = ocrTranslatedText;
      syncDirections();
      if (ocrResultsEl) ocrResultsEl.classList.remove('hidden');

      if (window.LAFZApp && typeof window.LAFZApp.addHistoryEntry === 'function') {
        window.LAFZApp.addHistoryEntry({
          id: Date.now().toString(),
          from: src,
          to: tgt,
          input: ocrExtractedText,
          output: ocrTranslatedText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      notify('Image processed successfully!');
    } catch (err) {
      ocrExtractedText = '';
      ocrTranslatedText = '';
      if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
      notify((err && err.message) || 'Error processing image');
    } finally {
      isOcrLoading = false;
      if (ocrLoadingEl) ocrLoadingEl.classList.add('hidden');
      if (extractBtn) extractBtn.disabled = false;
    }
  }

  function handleOcrFileSelect(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () {
      notify('Could not read the selected image file.');
    };
    reader.onload = function () {
      var rawUrl = reader.result;
      var img = new Image();
      img.onerror = function () {
        notify('Unsupported or corrupted image. Please use JPG, PNG, or WebP.');
      };
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var w = img.width;
        var h = img.height;
        var maxDim = 1280;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          processOcrImage(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          processOcrImage(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  }

  function clearOcrImage() {
    var previewImg = document.getElementById('previewImg');
    var extractedTextEl = document.getElementById('extractedText');
    var imageOutputEl = document.getElementById('imageOutput');
    var ocrResultsEl = document.getElementById('ocrResults');
    var ocrPreviewWrap = document.getElementById('ocrPreviewWrap');
    var uploadBox = document.getElementById('uploadBox');
    var clearImageBtn = document.getElementById('clearImage');
    var extractBtn = document.getElementById('extractBtn');

    scannedImageBase64 = '';
    ocrExtractedText = '';
    ocrTranslatedText = '';
    if (previewImg) previewImg.src = '';
    if (extractedTextEl) extractedTextEl.textContent = '';
    if (imageOutputEl) imageOutputEl.textContent = '';
    if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
    if (ocrPreviewWrap) ocrPreviewWrap.classList.add('hidden');
    if (uploadBox) uploadBox.classList.remove('hidden');
    if (clearImageBtn) clearImageBtn.classList.add('hidden');
    if (extractBtn) extractBtn.disabled = true;
    notify('Image and results cleared');
  }

  function initImageEvents() {
    var imageInput = document.getElementById('imageInput');
    var cameraInput = document.getElementById('cameraInput');
    var uploadBox = document.getElementById('uploadBox');
    var takePhotoBtn = document.getElementById('takePhotoBtn');
    var chooseFileBtn = document.getElementById('chooseFileBtn');
    var replaceImage = document.getElementById('replaceImage');
    var removeImage = document.getElementById('removeImage');
    var clearImageBtn = document.getElementById('clearImage');
    var ocrSourceEl = document.getElementById('ocrSource');
    var ocrTargetEl = document.getElementById('ocrTarget');
    var ocrSwapBtn = document.getElementById('ocrSwapBtn');
    var extractBtn = document.getElementById('extractBtn');
    var copyExtractedBtn = document.getElementById('copyExtracted');
    var copyImageResultBtn = document.getElementById('copyImageResult');
    var ocrListenBtn = document.getElementById('ocrListenBtn');
    var imageTranslateBtn = document.getElementById('imageTranslateBtn');
    var extractedTextEl = document.getElementById('extractedText');
    var imageOutputEl = document.getElementById('imageOutput');

    if (uploadBox && imageInput) {
      uploadBox.addEventListener('click', function () { imageInput.click(); });
    }
    if (takePhotoBtn && cameraInput) {
      takePhotoBtn.addEventListener('click', function (e) { e.stopPropagation(); cameraInput.click(); });
    }
    if (chooseFileBtn && imageInput) {
      chooseFileBtn.addEventListener('click', function (e) { e.stopPropagation(); imageInput.click(); });
    }
    if (replaceImage && imageInput) {
      replaceImage.addEventListener('click', function () { imageInput.click(); });
    }
    if (removeImage) removeImage.addEventListener('click', clearOcrImage);
    if (clearImageBtn) clearImageBtn.addEventListener('click', clearOcrImage);
    if (imageInput) {
      imageInput.addEventListener('change', function (e) {
        handleOcrFileSelect(e.target.files && e.target.files[0]);
        e.target.value = '';
      });
    }
    if (cameraInput) {
      cameraInput.addEventListener('change', function (e) {
        handleOcrFileSelect(e.target.files && e.target.files[0]);
        e.target.value = '';
      });
    }
    if (ocrSourceEl) ocrSourceEl.addEventListener('change', syncDirections);
    if (ocrTargetEl) ocrTargetEl.addEventListener('change', syncDirections);
    if (ocrSwapBtn && ocrSourceEl && ocrTargetEl) {
      ocrSwapBtn.addEventListener('click', function () {
        var tmp = ocrSourceEl.value;
        ocrSourceEl.value = ocrTargetEl.value;
        ocrTargetEl.value = tmp;
        if (ocrExtractedText && ocrTranslatedText) {
          var t = ocrExtractedText;
          ocrExtractedText = ocrTranslatedText;
          ocrTranslatedText = t;
          if (extractedTextEl) extractedTextEl.textContent = ocrExtractedText;
          if (imageOutputEl) imageOutputEl.textContent = ocrTranslatedText;
        }
        syncDirections();
        notify('Languages swapped');
      });
    }
    if (extractBtn) {
      extractBtn.addEventListener('click', function () {
        if (scannedImageBase64 && !isOcrLoading) processOcrImage(scannedImageBase64);
      });
    }
    if (copyExtractedBtn) {
      copyExtractedBtn.addEventListener('click', function () {
        if (!ocrExtractedText) return;
        if (window.LAFZApp && typeof window.LAFZApp.copyText === 'function') {
          window.LAFZApp.copyText(ocrExtractedText);
        }
      });
    }
    if (copyImageResultBtn) {
      copyImageResultBtn.addEventListener('click', function () {
        if (!ocrTranslatedText) return;
        if (window.LAFZApp && typeof window.LAFZApp.copyText === 'function') {
          window.LAFZApp.copyText(ocrTranslatedText);
        }
      });
    }
    if (ocrListenBtn && ocrTargetEl) {
      ocrListenBtn.addEventListener('click', function () {
        if (window.LAFZListen && typeof window.LAFZListen.play === 'function') {
          window.LAFZListen.play(ocrTranslatedText, ocrTargetEl.value, 'ocr');
        }
      });
    }
    if (imageTranslateBtn && ocrSourceEl && ocrTargetEl) {
      imageTranslateBtn.addEventListener('click', function () {
        if (window.LAFZApp && typeof window.LAFZApp.loadEntryIntoTranslator === 'function') {
          window.LAFZApp.loadEntryIntoTranslator({
            from: ocrSourceEl.value,
            to: ocrTargetEl.value,
            input: ocrExtractedText,
            output: ocrTranslatedText
          });
        }
      });
    }
  }

  window.LAFZImage = {
    syncDirections: syncDirections,
    init: initImageEvents
  };
})(window);
