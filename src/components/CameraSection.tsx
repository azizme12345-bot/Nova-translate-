import React, { useState } from 'react';
import { ApiClient, LanguageOption, OCRResult } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface CameraSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onToast: (msg: string) => void;
}

/**
 * Client-side image compressor: scales down high-resolution images to max 1280px
 * and compresses to JPEG (quality 0.82) to avoid network bottlenecks and 413 payload errors.
 */
function compressImage(file: File, maxDimension = 1280, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback to raw base64 if canvas context is unavailable
          resolve({ base64: readerEvent.target?.result as string, mimeType: file.type || 'image/jpeg' });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve({ base64: compressedBase64, mimeType });
      };
      img.onerror = () => reject(new Error('Failed to load image for processing.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const CameraSection: React.FC<CameraSectionProps> = ({
  languages,
  onAddHistory,
  onToast,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedMime, setCompressedMime] = useState<string>('image/jpeg');
  const [targetLang, setTargetLang] = useState('English 🇬🇧');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      onToast('Optimizing image…');
      const { base64, mimeType } = await compressImage(file);
      setPreviewUrl(base64);
      setCompressedMime(mimeType);
      setOcrResult(null);
      onToast('Image ready for scan.');
    } catch {
      // Fallback to direct read
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setCompressedMime(file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartScan = async () => {
    if (!previewUrl) {
      onToast('Please select or capture an image first.');
      return;
    }

    setIsScanning(true);
    onToast('Scanning image with AI OCR…');

    try {
      const result = await ApiClient.ocrAndTranslate(previewUrl, targetLang, compressedMime);

      setOcrResult(result);
      onToast('Image text extracted and translated successfully!');

      if (result.extractedText && result.translatedText) {
        onAddHistory({
          id: Date.now().toString(),
          from: `${result.detectedSourceLanguage || 'Image OCR'} 📷`,
          to: result.targetLanguage,
          input: result.extractedText,
          output: result.translatedText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err: any) {
      onToast(err.message || 'OCR processing failed. Check backend configuration.');
    } finally {
      setIsScanning(false);
    }
  };

  const copyResult = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast('Copied to clipboard');
    } catch {
      onToast('Failed to copy');
    }
  };

  return (
    <section className="section active" id="camera">
      <div className="hero">
        <div>
          <div className="eyebrow">VISUAL TRANSLATION</div>
          <h1>Camera & Image</h1>
          <p className="subtitle">Upload or capture an image to extract text and translate with AI.</p>
        </div>
      </div>

      <div className="workspace" style={{ textAlign: 'center', padding: '35px 20px' }}>
        <div style={{ fontSize: '50px', marginBottom: '8px' }}>📷</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 10px' }}>
          Scan text from an image
        </h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>
          Upload photos, signs, documents, or menus for real-time AI recognition and translation.
        </p>

        <div style={{ maxWidth: '420px', margin: '0 auto 20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'left' }}>
            Translate into:
          </label>
          <select
            className="select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            id="image"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="image"
            className="mini"
            style={{
              cursor: 'pointer',
              padding: '12px 24px',
              height: 'auto',
              borderRadius: '12px',
              display: 'inline-flex',
              fontSize: '14px',
            }}
          >
            📁 Choose Image / Take Photo
          </label>
        </div>

        {previewUrl && (
          <div style={{ margin: '20px auto', maxWidth: '340px' }}>
            <img
              src={previewUrl}
              alt="Scan Preview"
              style={{
                width: '100%',
                maxHeight: '260px',
                objectFit: 'contain',
                borderRadius: '14px',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button
            className="primary"
            onClick={handleStartScan}
            disabled={isScanning || !previewUrl}
            type="button"
          >
            {isScanning ? '⏳ Scanning & Translating…' : 'Start Scan'}
          </button>
        </div>
      </div>

      {/* OCR Results Display */}
      {ocrResult && (
        <div className="editorgrid" style={{ marginTop: '20px' }}>
          <div className="panel">
            <div className="panelhead">
              <span>Extracted Text ({ocrResult.detectedSourceLanguage || 'Detected'})</span>
              <button
                className="mini"
                onClick={() => copyResult(ocrResult.extractedText)}
                type="button"
              >
                📋 Copy
              </button>
            </div>
            <div className="panelbody">
              <div className="output" style={{ color: 'var(--text)' }}>
                {ocrResult.extractedText || 'No text detected in image.'}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panelhead">
              <span>Translation ({ocrResult.targetLanguage})</span>
              <button
                className="mini"
                onClick={() => copyResult(ocrResult.translatedText)}
                type="button"
              >
                📋 Copy
              </button>
            </div>
            <div className="panelbody">
              <div className="output" style={{ color: 'var(--text)' }}>
                {ocrResult.translatedText}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
