import React, { useRef, useState } from 'react';
import { Camera, Upload, Loader2, Image as ImageIcon, Volume2, Copy } from 'lucide-react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
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
  const [targetLang, setTargetLang] = useState('English 🇬🇧');
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ original: string; translated: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressAndProcessImage = (file: File) => {
    setIsLoading(true);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 800;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          try {
            const ocr = await ApiClient.ocrAndTranslate(compressedBase64, targetLang);
            setOcrResult({
              original: ocr.extractedText,
              translated: ocr.translatedText,
            });

            // Save to history
            onAddHistory({
              id: Math.random().toString(36).substring(2, 9),
              input: ocr.extractedText,
              output: ocr.translatedText,
              from: ocr.detectedSourceLanguage || 'Detected',
              to: targetLang,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              detectedLang: ocr.detectedSourceLanguage,
            });

            onToast('OCR Translation completed successfully!');
          } catch (err: any) {
            onToast(err.message || 'Image translation failed.');
          } finally {
            setIsLoading(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndProcessImage(file);
    }
  };

  const handleCopy = () => {
    if (ocrResult?.translated) {
      navigator.clipboard.writeText(ocrResult.translated);
      onToast('Translation copied to clipboard!');
    }
  };

  const handleSpeak = () => {
    if (!ocrResult?.translated) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(ocrResult.translated);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      onToast('Speech Synthesis is not supported in this browser.');
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2 text-lg">
          <ImageIcon className="w-5 h-5 text-emerald-600" />
          Image & Document Scanner
        </h3>
        <p className="text-sm text-gray-500">Scan signs, documents, or screenshots and translate them instantly.</p>
      </div>

      {/* Target Language Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Translate To</label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.label}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hidden inputs to separate Camera and File Picker */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Live Camera Button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isLoading}
          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
          <span>Take Photo</span>
        </button>

        {/* File / Gallery Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 shadow disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span>Upload File</span>
        </button>
      </div>

      {/* OCR & Translation Results display */}
      {ocrResult && (
        <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50 divide-y divide-gray-100">
          <div className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Extracted Text</span>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{ocrResult.original}</p>
          </div>
          <div className="p-4 space-y-3 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Translation</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSpeak}
                  className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-600 hover:text-emerald-600 transition-colors shadow-sm"
                  title="Speak translation"
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce text-emerald-600' : ''}`} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-600 hover:text-emerald-600 transition-colors shadow-sm"
                  title="Copy translation"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-800 text-base font-medium whitespace-pre-wrap leading-relaxed">
              {ocrResult.translated}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
