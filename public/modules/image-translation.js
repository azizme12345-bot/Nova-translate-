/**
 * Image & Camera OCR Translation Module
 * Resizes images in browser (max 1280px, JPEG 0.85), checks <= 4 MB limit,
 * and sends to /api/image-translate without any browser OCR library.
 */

import { translateImage } from './translation-api.js';
import { getTranslationName, isRtl } from './language-manager.js';
import { showToast } from './ui-utils.js';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

function estimateDataUrlBytes(dataUrl) {
  const raw = String(dataUrl || '');
  const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

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
    if (estimateDataUrlBytes(dataUrl) > MAX_IMAGE_BYTES) {
      showToast('Photo bahut bari hai. Chhoti photo chunein.');
      return null;
    }

    scannedImageBase64 = dataUrl;
    if (previewImg) previewImg.src = dataUrl;
    if (uploadBox) uploadBox.classList.add('hidden');
    if (ocrPreviewWrap) ocrPreviewWrap.classList.remove('hidden');
    if (clearImageBtn) clearImageBtn.classList.remove('hidden');
    if (extractBtn) extractBtn.disabled = true;

    isOcrLoading = true;
    if (ocrLoadingEl) ocrLoadingEl.classList.remove('hidden');
    if (ocrResultsEl) ocrResultsEl.classList.add('hidden');
    showToast('Scanning and translating image...');

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
      showToast('Image translated!');
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
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          if (w > h) {
            h = Math.round((h * MAX_DIMENSION) / w);
            w = MAX_DIMENSION;
          } else {
            w = Math.round((w * MAX_DIMENSION) / h);
            h = MAX_DIMENSION;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        let preparedUrl = rawUrl;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          preparedUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        }

        if (estimateDataUrlBytes(preparedUrl) > MAX_IMAGE_BYTES) {
          showToast('Photo bahut bari hai. Chhoti photo chunein.');
          return;
        }

        processOcrImage(preparedUrl);
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
