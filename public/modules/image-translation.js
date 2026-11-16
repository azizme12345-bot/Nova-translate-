/**
 * Image & Camera OCR Translation Module
 * Completely independent of normal text translation: handles file/camera upload,
 * preview, Canvas image resizing, OCR extraction, translation display, and errors.
 */

import { translateImage } from './translation-api.js';
import { getTranslationName, isRtl } from './language-manager.js';
import { showToast } from './ui-utils.js';

export function createImageTranslationController(callbacks = {}) {
  let scannedImageBase64 = '';
  let ocrExtractedText = '';
  let ocrTranslatedText = '';
  let isOcrLoading = false;

  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  const uploadBox = document.getElementById('uploadBox');
  const takePhotoBtn = document.getElementById('takePhotoBtn');
  const chooseFileBtn = document.getElementById('chooseFileBtn');
  const replaceImage = document.getElementById('replaceImage');
  const removeImage = document.getElementById('removeImage');
  const clearImageBtn = document.getElementById('clearImage');
  const ocrSourceEl = document.getElementById('ocrSource');
  const ocrTargetEl = document.getElementById('ocrTarget');
  const ocrSwapBtn = document.getElementById('ocrSwapBtn');
  const extractBtn = document.getElementById('extractBtn');
  const copyExtractedBtn = document.getElementById('copyExtracted');
  const copyImageResultBtn = document.getElementById('copyImageResult');
  const ocrListenBtn = document.getElementById('ocrListenBtn');
  const imageTranslateBtn = document.getElementById('imageTranslateBtn');
  const previewImg = document.getElementById('previewImg');
  const ocrPreviewWrap = document.getElementById('ocrPreviewWrap');
  const ocrLoadingEl = document.getElementById('ocrLoading');
  const ocrResultsEl = document.getElementById('ocrResults');
  const extractedTextEl = document.getElementById('extractedText');
  const imageOutputEl = document.getElementById('imageOutput');
  const ocrSourceLabel = document.getElementById('ocrSourceLabel');
  const ocrTargetLabel = document.getElementById('ocrTargetLabel');

  function syncDirections() {
    if (ocrSourceEl && ocrSourceLabel) {
      const srcName = getTranslationName(ocrSourceEl.value || 'English');
      ocrSourceLabel.textContent = `Detected Text (${srcName})`;
    }
    if (ocrTargetEl && ocrTargetLabel && imageOutputEl) {
      const tgt = ocrTargetEl.value || 'Urdu 🇵🇰';
      const tgtName = getTranslationName(tgt);
      ocrTargetLabel.textContent = `Translation (${tgtName})`;
      imageOutputEl.setAttribute('dir', isRtl(tgt) ? 'rtl' : 'ltr');
    }
  }

  async function processOcrImage(dataUrl) {
    scannedImageBase64 = dataUrl;
    if (previewImg) previewImg.src = dataUrl;
    if (uploadBox) uploadBox.classList.add('hidden');
    if (ocrPreviewWrap) ocrPreviewWrap.classList.remove('hidden');
    if (clearImageBtn) clearImageBtn.classList.remove('hidden');
    if (extractBtn) extractBtn.disabled = true;

    isOcrLoading = true;
    if (ocrLoadingEl) ocrLoadingEl.classList.remove('hidden');
    if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
    showToast('Scanning and extracting text...');

    const mimeMatch = String(dataUrl || '').match(/^data:([^;]+);base64,/);
    const detectedMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const rawB64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const src = ocrSourceEl && ocrSourceEl.value ? ocrSourceEl.value : 'English 🇬🇧';
    const tgt = ocrTargetEl && ocrTargetEl.value ? ocrTargetEl.value : 'Urdu 🇵🇰';

    try {
      const data = await translateImage({
        imageBase64: rawB64,
        mimeType: detectedMime,
        sourceLanguage: getTranslationName(src),
        targetLanguage: getTranslationName(tgt),
      });

      ocrExtractedText = data.extractedText;
      ocrTranslatedText = data.translatedText;
      if (extractedTextEl) extractedTextEl.textContent = ocrExtractedText;
      if (imageOutputEl) imageOutputEl.textContent = ocrTranslatedText;
      syncDirections();
      if (ocrResultsEl) ocrResultsEl.classList.remove('hidden');

      if (typeof callbacks.onOcrSuccess === 'function') {
        callbacks.onOcrSuccess({
          from: src,
          to: tgt,
          input: ocrExtractedText,
          output: ocrTranslatedText,
        });
      }
      showToast('Image processed successfully!');
      return data;
    } catch (err) {
      ocrExtractedText = '';
      ocrTranslatedText = '';
      if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
      showToast((err && err.message) || 'Error processing image');
      return null;
    } finally {
      isOcrLoading = false;
      if (ocrLoadingEl) ocrLoadingEl.classList.add('hidden');
      if (extractBtn) extractBtn.disabled = false;
    }
  }

  function handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Could not read the selected image file.');
    };
    reader.onload = () => {
      const rawUrl = reader.result;
      const img = new Image();
      img.onerror = () => {
        showToast('Unsupported or corrupted image. Please use JPG, PNG, or WebP.');
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        const maxDim = 1280;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
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

  function clearImage() {
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
    showToast('Image and results cleared');
  }

  function init() {
    if (uploadBox && imageInput) {
      uploadBox.addEventListener('click', () => imageInput.click());
    }
    if (takePhotoBtn && cameraInput) {
      takePhotoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cameraInput.click();
      });
    }
    if (chooseFileBtn && imageInput) {
      chooseFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageInput.click();
      });
    }
    if (replaceImage && imageInput) {
      replaceImage.addEventListener('click', () => imageInput.click());
    }
    if (removeImage) removeImage.addEventListener('click', clearImage);
    if (clearImageBtn) clearImageBtn.addEventListener('click', clearImage);

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files && e.target.files[0]);
        e.target.value = '';
      });
    }
    if (cameraInput) {
      cameraInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files && e.target.files[0]);
        e.target.value = '';
      });
    }

    if (ocrSourceEl) ocrSourceEl.addEventListener('change', syncDirections);
    if (ocrTargetEl) ocrTargetEl.addEventListener('change', syncDirections);

    if (ocrSwapBtn && ocrSourceEl && ocrTargetEl) {
      ocrSwapBtn.addEventListener('click', () => {
        const tmp = ocrSourceEl.value;
        ocrSourceEl.value = ocrTargetEl.value;
        ocrTargetEl.value = tmp;
        if (ocrExtractedText && ocrTranslatedText) {
          const prevExtracted = ocrExtractedText;
          ocrExtractedText = ocrTranslatedText;
          ocrTranslatedText = prevExtracted;
          if (extractedTextEl) extractedTextEl.textContent = ocrExtractedText;
          if (imageOutputEl) imageOutputEl.textContent = ocrTranslatedText;
        }
        syncDirections();
        showToast('Languages swapped');
      });
    }

    if (extractBtn) {
      extractBtn.addEventListener('click', () => {
        if (scannedImageBase64 && !isOcrLoading) {
          processOcrImage(scannedImageBase64);
        }
      });
    }

    if (copyExtractedBtn) {
      copyExtractedBtn.addEventListener('click', () => {
        if (!ocrExtractedText) return;
        if (typeof callbacks.onCopyText === 'function') {
          callbacks.onCopyText(ocrExtractedText);
        }
      });
    }

    if (copyImageResultBtn) {
      copyImageResultBtn.addEventListener('click', () => {
        if (!ocrTranslatedText) return;
        if (typeof callbacks.onCopyText === 'function') {
          callbacks.onCopyText(ocrTranslatedText);
        }
      });
    }

    if (ocrListenBtn && ocrTargetEl) {
      ocrListenBtn.addEventListener('click', () => {
        if (typeof callbacks.onSpeakText === 'function') {
          callbacks.onSpeakText(ocrTranslatedText, ocrTargetEl.value, 'ocr');
        }
      });
    }

    if (imageTranslateBtn && ocrSourceEl && ocrTargetEl) {
      imageTranslateBtn.addEventListener('click', () => {
        if (typeof callbacks.onOpenInTextTranslator === 'function') {
          callbacks.onOpenInTextTranslator({
            from: ocrSourceEl.value,
            to: ocrTargetEl.value,
            input: ocrExtractedText,
            output: ocrTranslatedText,
          });
        }
      });
    }
  }

  return {
    init,
    syncDirections,
    processOcrImage,
    clearImage,
    isLoading: () => isOcrLoading,
    getExtractedText: () => ocrExtractedText,
    getTranslatedText: () => ocrTranslatedText,
  };
}
