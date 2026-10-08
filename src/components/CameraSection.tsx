import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  Loader2,
  Image as ImageIcon,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Maximize2,
  X,
  Type,
  Eye,
  FileText,
  Share2
} from 'lucide-react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';
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
  const [targetLang, setTargetLang] = useState('Urdu 🇵🇰');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeakingOriginal, setIsSpeakingOriginal] = useState(false);
  const [isSpeakingTranslation, setIsSpeakingTranslation] = useState(false);
  const [audioProgressText, setAudioProgressText] = useState('');

  // Enhanced Clarity & Display State
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [viewMode, setViewMode] = useState<'split' | 'translation_only' | 'original_only'>('split');
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRtlLanguage = (lang: string) => {
    const lower = (lang || '').toLowerCase();
    return (
      lower.includes('urdu') ||
      lower.includes('arabic') ||
      lower.includes('persian') ||
      lower.includes('pashto') ||
      lower.includes('sindhi') ||
      lower.includes('hebrew')
    );
  };

  const stopAllAudio = () => {
    GlobalAudioPlayer.stop();
    setIsSpeakingOriginal(false);
    setIsSpeakingTranslation(false);
    setAudioProgressText('');
  };

  const playVoice = (text: string, langName: string, isOriginal: boolean) => {
    const clean = (text || '').trim();
    if (!clean) {
      onToast('No text to read aloud.');
      return;
    }

    if ((isOriginal && isSpeakingOriginal) || (!isOriginal && isSpeakingTranslation)) {
      stopAllAudio();
      onToast('Audio playback stopped.');
      return;
    }

    stopAllAudio();

    if (isOriginal) {
      setIsSpeakingOriginal(true);
      onToast('Reading original text audio...');
    } else {
      setIsSpeakingTranslation(true);
      onToast('Reading translated audio...');
    }

    GlobalAudioPlayer.play(clean, langName, {
      onStart: () => {
        if (isOriginal) setIsSpeakingOriginal(true);
        else setIsSpeakingTranslation(true);
      },
      onProgress: (cur, tot) => {
        if (tot > 1) {
          setAudioProgressText(`(${cur}/${tot})`);
        } else {
          setAudioProgressText('');
        }
      },
      onEnd: () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
        setAudioProgressText('');
      },
      onError: () => {
        setIsSpeakingOriginal(false);
        setIsSpeakingTranslation(false);
        setAudioProgressText('');
      },
    });
  };

  const processImage = async (base64Image: string) => {
    setScannedImage(base64Image);
    setIsLoading(true);
    stopAllAudio();
    onToast('Scanning image with OCR & translating clearly...');

    try {
      const ocr = await ApiClient.ocrAndTranslate(base64Image, targetLang);
      const originalClean = (ocr.extractedText || '').trim();
      const translatedClean = (ocr.translatedText || '').trim();

      setExtractedText(originalClean || 'No readable text detected in this image.');
      setTranslatedText(translatedClean || 'No translation available.');
      setDetectedLang(ocr.detectedSourceLanguage || 'Detected');

      if (originalClean && translatedClean) {
        onAddHistory({
          id: Date.now().toString(),
          input: originalClean,
          output: translatedClean,
          from: ocr.detectedSourceLanguage || 'Image Scan',
          to: targetLang,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detectedLang: ocr.detectedSourceLanguage,
        });
        onToast('Image scanned and translated with crystal-clear clarity!');
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

        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
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
    e.target.value = '';
  };

  const handleRetake = () => {
    setScannedImage(null);
    setExtractedText('');
    setTranslatedText('');
    setDetectedLang(null);
    setIsFullscreenModal(false);
    stopAllAudio();
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    onToast('Copied crystal-clear translation to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!translatedText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nova Translate - Scanned Document Translation',
          text: translatedText,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleReTranslate = async (newTargetLang: string) => {
    setTargetLang(newTargetLang);
    if (!scannedImage) return;

    setIsLoading(true);
    stopAllAudio();
    try {
      const ocr = await ApiClient.ocrAndTranslate(scannedImage, newTargetLang);
      setTranslatedText(ocr.translatedText || '');
      onToast(`Translation updated clearly into ${newTargetLang}.`);
    } catch (err: any) {
      onToast(err.message || 'Re-translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const fontSizeClasses = {
    normal: 'text-base sm:text-lg leading-relaxed',
    large: 'text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose font-medium',
    xlarge: 'text-xl sm:text-2xl md:text-3xl leading-loose font-semibold',
  };

  const isTargetRtl = isRtlLanguage(targetLang);
  const isSourceRtl = detectedLang ? isRtlLanguage(detectedLang) : false;

  return (
    <section className="section active" id="camera-section">
      <div className="hero">
        <div>
          <div className="eyebrow">IMAGE OCR & DOCUMENT TRANSLATION</div>
          <h1>Camera & Photo Scanner</h1>
          <p className="subtitle">
            Scan documents, book pages, or signs and view the crystal-clear translation right here.
          </p>
        </div>
      </div>

      <div className="workspace max-w-5xl mx-auto space-y-6">
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

        {/* Target Language & Top Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Translate Scanned Photo To:
          </label>
          <select
            value={targetLang}
            onChange={(e) => handleReTranslate(e.target.value)}
            className="select w-full sm:w-72 font-semibold text-sm"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Empty State: Prompt to Take Photo */}
        {!scannedImage && (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-5 border border-emerald-400/30 shadow-inner">
              <Camera className="w-10 h-10 text-emerald-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Scan Any Photo, Page or Sign</h2>
            <p className="text-emerald-100/90 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
              Capture or upload any image. The translated text will appear in large, clean, high-contrast typography right on this screen.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading}
                type="button"
                className="w-full py-4 px-6 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded-2xl font-extrabold flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-500/25 transition-all transform active:scale-95 disabled:opacity-50 text-base"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                <span>Take Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                type="button"
                className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold flex items-center justify-center gap-3 shadow transition-colors disabled:opacity-50 text-base"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                <span>Upload from Gallery</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-8 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 rounded-3xl flex flex-col items-center justify-center gap-3.5 text-center shadow-lg animate-pulse">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              Extracting text and translating clearly into {targetLang}...
            </span>
            <span className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 max-w-md">
              Please wait a moment while the OCR engine scans every word in high detail.
            </span>
          </div>
        )}

        {/* Scanned Image & Crystal Clear Results Display */}
        {scannedImage && (
          <div className="space-y-5">
            {/* View Mode & Control Header */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {/* View mode toggle tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('translation_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'translation_only'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Translation Only (Clear View)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('original_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'original_only'
                      ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Original Text
                </button>
              </div>

              {/* Font Size & Action buttons */}
              <div className="flex items-center gap-2">
                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFontSize('normal')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      fontSize === 'normal'
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                    title="Normal text size"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      fontSize === 'large'
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                    title="Large readable text"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('xlarge')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      fontSize === 'xlarge'
                        ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm'
                        : 'text-gray-500'
                    }`}
                    title="Extra Large text"
                  >
                    A++
                  </button>
                </div>

                <button
                  onClick={() => setIsFullscreenModal(true)}
                  type="button"
                  className="mini py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold text-xs"
                  title="Expand to Fullscreen View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </button>

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  type="button"
                  className="mini py-1.5 px-3 bg-gray-100 dark:bg-gray-700 text-xs font-bold"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  New Photo
                </button>

                <button
                  onClick={handleRetake}
                  type="button"
                  className="mini py-1.5 px-2.5 text-xs text-gray-500 hover:text-red-600"
                  title="Reset and clear scanner"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Layout based on viewMode */}
            <div
              className={`grid gap-6 items-start ${
                viewMode === 'split'
                  ? 'grid-cols-1 lg:grid-cols-12'
                  : 'grid-cols-1 max-w-4xl mx-auto'
              }`}
            >
              {/* Photo Preview (Only shown in Split View or when needed) */}
              {viewMode === 'split' && (
                <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      Scanned Photo:
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      {detectedLang ? `Detected: ${detectedLang}` : 'Scanned'}
                    </span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full flex items-center justify-center bg-gray-900/5 dark:bg-black/40 min-h-[260px] max-h-[440px]">
                    <img
                      src={scannedImage}
                      alt="Scanned photo"
                      className="max-h-[440px] w-auto object-contain rounded-xl shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Translation Content Area */}
              <div className={`${viewMode === 'split' ? 'lg:col-span-7' : 'w-full'} space-y-5`}>
                {/* Crystal-Clear Translation Card */}
                {viewMode !== 'original_only' && (
                  <div className="workspace border-2 border-emerald-500/80 rounded-3xl shadow-md overflow-hidden transition-all p-0">
                    {/* Header with high contrast */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          صاف ترجمہ (Translation in {targetLang})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => playVoice(translatedText, targetLang, false)}
                          type="button"
                          className={`mini text-xs py-1.5 px-3 font-bold ${
                            isSpeakingTranslation
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                          }`}
                          title="Listen to translation"
                        >
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          {isSpeakingTranslation ? `⏹ Stop ${audioProgressText}` : '🔊 Listen'}
                        </button>
                        <button
                          onClick={handleCopy}
                          type="button"
                          className="mini text-xs py-1.5 px-3 bg-white dark:bg-gray-800 font-bold border border-gray-200"
                          title="Copy translation"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={handleShare}
                          type="button"
                          className="mini text-xs py-1.5 px-3 bg-white dark:bg-gray-800 font-bold border border-gray-200"
                          title="Share translation"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>

                    {/* Main Crystal-Clear Text Body */}
                    <div
                      dir={isTargetRtl ? 'rtl' : 'ltr'}
                      className={`p-6 sm:p-8 whitespace-pre-wrap min-h-[160px] max-h-[500px] overflow-y-auto selection:bg-emerald-200 ${
                        isTargetRtl ? 'text-right' : 'text-left'
                      } ${fontSizeClasses[fontSize]}`}
                      style={{
                        color: 'var(--text)',
                        fontFamily: isTargetRtl
                          ? "'Noto Nastaliq Urdu', 'Urdu Typesetting', 'Jameel Noori Nastaleeq', 'Segoe UI', system-ui, sans-serif"
                          : 'inherit',
                      }}
                    >
                      {translatedText || (
                        <span className="italic" style={{ color: 'var(--muted)' }}>Translation will appear here...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Extracted Original Text Card */}
                {viewMode !== 'translation_only' && (
                  <div className="workspace border border-[var(--border)] rounded-3xl shadow-sm overflow-hidden p-0">
                    <div className="p-3.5 bg-gray-100 dark:bg-gray-800/80 border-b border-[var(--border)] flex items-center justify-between text-xs font-bold" style={{ color: 'var(--text)' }}>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        اصل عبارت (Extracted Original Text - {detectedLang || 'Detected'})
                      </span>
                      <button
                        onClick={() => playVoice(extractedText, detectedLang || 'English', true)}
                        type="button"
                        className={`mini text-xs py-1 ${isSpeakingOriginal ? 'bg-emerald-600 text-white' : ''}`}
                        title="Listen to original text"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        {isSpeakingOriginal ? `⏹ Stop ${audioProgressText}` : '🔊 Listen'}
                      </button>
                    </div>
                    <div
                      dir={isSourceRtl ? 'rtl' : 'ltr'}
                      className={`p-5 text-base sm:text-lg font-bold whitespace-pre-wrap max-h-60 overflow-y-auto ${
                        isSourceRtl ? 'text-right' : 'text-left'
                      }`}
                      style={{
                        color: 'var(--text)',
                        fontFamily: isSourceRtl
                          ? "'Noto Nastaliq Urdu', 'Urdu Typesetting', 'Jameel Noori Nastaleeq', 'Segoe UI', system-ui, sans-serif"
                          : 'inherit',
                      }}
                    >
                      {extractedText || 'Extracting text...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Reading Modal */}
      {isFullscreenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[var(--surface)] border-2 border-emerald-500 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span className="text-base sm:text-lg font-extrabold text-emerald-950 dark:text-emerald-200">
                  صاف مکمل ترجمہ (Full Screen Translation - {targetLang})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Font Size controls in modal */}
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setFontSize('normal')}
                    className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'normal' ? 'bg-emerald-600 text-white' : ''}`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'large' ? 'bg-emerald-600 text-white' : ''}`}
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('xlarge')}
                    className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'xlarge' ? 'bg-emerald-600 text-white' : ''}`}
                  >
                    A++
                  </button>
                </div>

                <button
                  onClick={() => playVoice(translatedText, targetLang, false)}
                  type="button"
                  className="mini py-1.5 px-3 bg-emerald-600 text-white text-xs font-bold"
                >
                  <Volume2 className="w-4 h-4" />
                  {isSpeakingTranslation ? 'Stop' : 'Listen'}
                </button>

                <button
                  onClick={handleCopy}
                  type="button"
                  className="mini py-1.5 px-3 bg-white dark:bg-gray-800 text-xs font-bold"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <button
                  onClick={() => setIsFullscreenModal(false)}
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              dir={isTargetRtl ? 'rtl' : 'ltr'}
              className={`p-6 sm:p-10 overflow-y-auto whitespace-pre-wrap font-semibold ${
                isTargetRtl ? 'text-right' : 'text-left'
              } ${fontSizeClasses[fontSize]}`}
              style={{
                color: 'var(--text)',
                fontFamily: isTargetRtl
                  ? "'Noto Nastaliq Urdu', 'Urdu Typesetting', 'Jameel Noori Nastaleeq', 'Segoe UI', system-ui, sans-serif"
                  : 'inherit',
              }}
            >
              {translatedText}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
