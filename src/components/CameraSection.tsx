import React, { useState, useRef, useEffect } from 'react';
import { ApiClient, LanguageOption, OCRResult } from '../services/apiClient.ts';
import { HistoryItem } from '../types.ts';

interface CameraSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onToast: (msg: string) => void;
}

/**
 * Client-side image compressor: scales down images to a maximum width/height of 800px
 * and compresses to JPEG quality 0.6 before sending payload to server.
 */
function compressImage(file: File | Blob, maxDimension = 800, quality = 0.6): Promise<{ base64: string; mimeType: string }> {
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
          resolve({ base64: readerEvent.target?.result as string, mimeType: 'image/jpeg' });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve({ base64: compressedBase64, mimeType });
      };
      img.onerror = () => reject(new Error('Failed to process image.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image.'));
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

  // Live Camera Viewfinder State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startLiveCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      onToast('Camera started. Align text and tap Snap.');
    } catch {
      onToast('Could not access camera. Please allow camera permissions or upload an image.');
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureLiveSnap = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setPreviewUrl(dataUrl);
        setCompressedMime('image/jpeg');
        setOcrResult(null);
        stopLiveCamera();
        onToast('Photo snapped and compressed! Ready to scan.');
      }
    } catch {
      onToast('Failed to snap photo.');
    }
  };

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      onToast('Compressing image…');
      const { base64, mimeType } = await compressImage(file);
      setPreviewUrl(base64);
      setCompressedMime(mimeType);
      setOcrResult(null);
      stopLiveCamera();
      onToast('Image ready for scan.');
    } catch {
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
      onToast('Please snap or upload an image first.');
      return;
    }

    setIsScanning(true);
    onToast('Scanning image with AI OCR…');

    try {
      const result = await ApiClient.ocrAndTranslate(previewUrl, targetLang, compressedMime);
      setOcrResult(result);
      onToast('Text extracted and translated successfully!');

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
      onToast(err.message || 'OCR processing failed. Please try again.');
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
          <p className="subtitle">Snap photos with live camera or upload images for instant AI text translation.</p>
        </div>
      </div>

      <div className="workspace" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📷</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 10px' }}>
          Scan text from an image / تصویر سے ترجمہ کریں
        </h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>
          Capture road signs, documents, menus, or photos for accurate Gemini Flash translation.
        </p>

        <div style={{ maxWidth: '420px', margin: '0 auto 20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'left' }}>
            Translate into / میں ترجمہ کریں:
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

        {/* Action Buttons: Live Snap vs Gallery */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          {!isCameraActive ? (
            <button
              className="primary"
              onClick={startLiveCamera}
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              📸 Open Live Camera Snap
            </button>
          ) : (
            <button
              className="mini"
              onClick={stopLiveCamera}
              type="button"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              ✕ Close Camera
            </button>
          )}

          <input
            type="file"
            id="camera-upload-input"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="camera-upload-input"
            className="mini"
            style={{
              cursor: 'pointer',
              padding: '12px 20px',
              height: 'auto',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            📁 Choose Photo / File
          </label>
        </div>

        {/* Live Camera Viewfinder */}
        {isCameraActive && (
          <div
            style={{
              maxWidth: '460px',
              margin: '0 auto 20px',
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#000',
              border: '2px solid var(--accent)',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxHeight: '360px', objectFit: 'cover' }}
            />
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center' }}>
              <button
                className="primary"
                onClick={captureLiveSnap}
                type="button"
                style={{ fontSize: '16px', fontWeight: 'bold', padding: '10px 24px' }}
              >
                📸 Capture Snap Now
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {previewUrl && (
          <div style={{ margin: '20px auto', maxWidth: '340px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '8px' }}>
              ✓ Image Ready (Optimized & Compressed)
            </p>
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

        <div style={{ marginTop: '16px' }}>
          <button
            className="primary"
            onClick={handleStartScan}
            disabled={isScanning || !previewUrl}
            type="button"
            style={{ minWidth: '200px' }}
          >
            {isScanning ? '⏳ Scanning with AI…' : '🚀 Start OCR Scan'}
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
              <div className="output" style={{ minHeight: '140px' }}>
                {ocrResult.extractedText || 'No text recognized.'}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panelhead">
              <span>Translated Text ({ocrResult.targetLanguage})</span>
              <button
                className="mini"
                onClick={() => copyResult(ocrResult.translatedText)}
                type="button"
              >
                📋 Copy
              </button>
            </div>
            <div className="panelbody">
              <div
                className="output"
                style={{
                  minHeight: '140px',
                  direction: /[\u0600-\u06FF\u0750-\u077F]/.test(ocrResult.translatedText) ? 'rtl' : 'ltr',
                  fontWeight: 600,
                }}
              >
                {ocrResult.translatedText}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
