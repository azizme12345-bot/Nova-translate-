import React, { useRef, useState } from 'react';
import { Camera, Upload, Loader2, Image as ImageIcon, Volume2, Copy, Check, RotateCcw, Sparkles } from 'lucide-react';
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
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeakingOriginal, setIsSpeakingOriginal] = useState(false);
  const [isSpeakingTranslation, setIsSpeakingTranslation] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getLanguageSpeechCode = (langName: string): string => {
    if (!langName) return 'en-US';
    if (langName.includes('Urdu')) return 'ur-PK';
    if (langName.includes('English')) return 'en-US';
    if (langName.includes('Arabic')) return 'ar-SA';
    if (langName.includes('Hindi')) return 'hi-IN';
    if (langName.includes('Punjabi')) return 'pa-IN';
    if (langName.includes('French')) return 'fr-FR';
    if (langName.includes('German')) return 'de-DE';
    if (langName.includes('Spanish')) return 'es-ES';
    if (langName.includes('Chinese')) return 'zh-CN';
    if (langName.includes('Japanese')) return 'ja-JP';
    if (langName.includes('Russian')) return 'ru-RU';
    if (langName.includes('Turkish')) return 'tr-TR';
    return 'en-US';
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeakingOriginal(false);
    setIsSpeakingTranslation(false);
  };

  const playVoice = (text: string, langName: string, isOriginal: boolean) => {
    const clean = (text || '').trim();
    if (!clean) {
      onToast('No text to read aloud.');
      return;
    }

    stopAllAudio();

    if ((isOriginal && isSpeakingOriginal) || (!isOriginal && isSpeakingTranslation)) {
      onToast('Audio playback stopped.');
      return;
    }

    try {
      const audioUrl = ApiClient.getTtsAudioUrl(clean, langName);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        if (isOriginal) {
          setIsSpeakingOriginal(true);
          onToast('Playing original text audio...');
        } else {
          setIsSpeakingTranslation(true);
          onToast('Playing translated audio...');
        }
      };

      audio.onended = () => {
        audioRef.current = null;
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      audio.onerror = () => {
        fallbackBrowserVoice(clean, langName, isOriginal);
      };

      audio.play().catch(() => {
        fallbackBrowserVoice(clean, langName, isOriginal);
      });
    } catch {
      fallbackBrowserVoice(clean, langName, isOriginal);
    }
  };

  const fallbackBrowserVoice = (clean: string, langName: string, isOriginal: boolean) => {
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = getLanguageSpeechCode(langName);

      utterance.onstart = () => {
        if (isOriginal) setIsSpeakingOriginal(true);
        else setIsSpeakingTranslation(true);
      };

      utterance.onend = () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      utterance.onerror = () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingOriginal(false);
      setIsSpeakingTranslation(false);
    }
  };

  const processImage = async (base64Image: string) => {
    setScannedImage(base64Image);
    setIsLoading(true);
    stopAllAudio();
    onToast('Scanning image and extracting text...');

    try {
      const ocr = await ApiClient.ocrAndTranslate(base64Image, targetLang);
      setExtractedText(ocr.extractedText || 'No readable text detected in this image.');
      setTranslatedText(ocr.translatedText || '');
      setDetectedLang(ocr.detectedSourceLanguage || 'Detected');

      if (ocr.extractedText && ocr.translatedText) {
        onAddHistory({
          id: Date.now().toString(),
          input: ocr.extractedText,
          output: ocr.translatedText,
          from: ocr.detectedSourceLanguage || 'Image Scan',
          to: targetLang,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detectedLang: ocr.detectedSourceLanguage,
        });
        onToast('Image translated successfully and kept in scanner.');
      } else {
        onToast('Image processed. No text was found.');
      }
    } catch (err: any) {
      onToast(err.message || 'Image translation failed. Please try another photo.');
    } finally {
      setIsLoading(false);
    }
  };

  const compressAndProcessImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          processImage(compressedBase64);
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
    // reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRetake = () => {
    setScannedImage(null);
    setExtractedText('');
    setTranslatedText('');
    setDetectedLang(null);
    stopAllAudio();
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    onToast('Copied translation to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReTranslate = async (newTargetLang: string) => {
    setTargetLang(newTargetLang);
    if (!scannedImage) return;

    setIsLoading(true);
    try {
      const ocr = await ApiClient.ocrAndTranslate(scannedImage, newTargetLang);
      setTranslatedText(ocr.translatedText || '');
      onToast(`Translation updated to ${newTargetLang}.`);
    } catch (err: any) {
      onToast(err.message || 'Re-translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section active" id="camera-section">
      <div className="hero">
        <div>
          <div className="eyebrow">IMAGE OCR & DOCUMENT TRANSLATION</div>
          <h1>Camera & Photo Scanner</h1>
          <p className="subtitle">Scan photos, signboards, book pages, or documents and view the translation right here.</p>
        </div>
      </div>

      <div className="workspace max-w-4xl mx-auto space-y-6">
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

        {/* Target Language Selector */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Translate Scanned Image To:
          </label>
          <select
            value={targetLang}
            onChange={(e) => handleReTranslate(e.target.value)}
            className="select w-full sm:w-64 font-medium"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons if No Photo is Loaded */}
        {!scannedImage && (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
              <Camera className="w-8 h-8 text-emerald-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scan Any Photo or Document</h2>
            <p className="text-emerald-100/90 text-sm max-w-md mx-auto mb-6">
              Take a photo with your camera or upload an image from your device. The photo and translation will stay right here in the scanner.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading}
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <span>Take Photo with Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span>Upload Image from Gallery</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-center animate-pulse shadow-sm">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              Analyzing photo, extracting text, and translating to {targetLang}...
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              Please wait a moment while the AI OCR engine processes the image.
            </span>
          </div>
        )}

        {/* Scanned Image & Results Display (Keeps photo in the scanner) */}
        {scannedImage && (
          <div className="space-y-6">
            {/* Header controls for Scanner view */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Scanned Photo & Translation
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  type="button"
                  className="mini bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-xs font-semibold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take New Photo
                </button>
                <button
                  onClick={handleRetake}
                  type="button"
                  className="mini text-xs text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Side-by-Side: Scanned Photo Preview + Extracted/Translated Text */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Image Preview Box */}
              <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 w-full text-left">
                  Original Scanned Photo:
                </div>
                <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[380px] w-full flex items-center justify-center bg-black/5 dark:bg-black/30">
                  <img
                    src={scannedImage}
                    alt="Scanned photo"
                    className="max-h-[380px] w-auto object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Translation Results Box */}
              <div className="lg:col-span-7 space-y-4">
                {/* Extracted Original Text */}
                <div className="panel bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="panelhead p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                    <span>Extracted Text ({detectedLang || 'Detected'})</span>
                    <button
                      onClick={() => playVoice(extractedText, detectedLang || 'English', true)}
                      type="button"
                      className="mini text-xs py-1"
                      title="Listen to original text"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      {isSpeakingOriginal ? '⏹ Stop' : '🔊 Listen'}
                    </button>
                  </div>
                  <div className="p-4 text-sm text-gray-800 dark:text-gray-100 font-medium whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {extractedText || 'Extracting text...'}
                  </div>
                </div>

                {/* Translated Output */}
                <div className="panel bg-white dark:bg-gray-800 border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-sm">
                  <div className="panelhead p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Translation ({targetLang})
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => playVoice(translatedText, targetLang, false)}
                        type="button"
                        className="mini text-xs py-1 bg-white dark:bg-gray-800 text-emerald-700"
                        title="Listen to translation"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        {isSpeakingTranslation ? '⏹ Stop' : '🔊 Listen'}
                      </button>
                      <button
                        onClick={handleCopy}
                        type="button"
                        className="mini text-xs py-1 bg-white dark:bg-gray-800"
                        title="Copy translation"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 text-base text-gray-900 dark:text-gray-100 font-semibold whitespace-pre-wrap min-h-[100px] max-h-56 overflow-y-auto">
                    {translatedText || (
                      <span className="text-gray-400 italic">Translation will appear here...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
