import React, { useState } from 'react';
import { ApiClient, LanguageOption, OCRResult } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface CameraSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onToast: (msg: string) => void;
}

export const CameraSection: React.FC<CameraSectionProps> = ({
  languages,
  onAddHistory,
  onToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('English 🇬🇧');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      onToast('Image size exceeds 12MB limit.');
      return;
    }

    setSelectedFile(file);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartScan = async () => {
    if (!previewUrl) {
      onToast('Please select or capture an image first.');
      return;
    }

    setIsScanning(true);
    onToast('Scanning image with AI OCR…');

    try {
      const mimeType = selectedFile?.type || 'image/jpeg';
      const result = await ApiClient.ocrAndTranslate(previewUrl, targetLang, mimeType);

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
