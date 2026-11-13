import React, { useRef, useState } from 'react';
import { ApiClient, LanguageOption } from '../services/apiClient.ts';
import { GlobalAudioPlayer } from '../services/audioPlayer.ts';
import { HistoryItem } from '../types.ts';

interface CameraSectionProps {
  languages: LanguageOption[];
  onAddHistory: (item: HistoryItem) => void;
  onToast: (msg: string) => void;
  onBack: () => void;
  onUseInTranslator?: (sourceText: string, translatedText: string, from: string, to: string) => void;
}

export const CameraSection: React.FC<CameraSectionProps> = ({
  languages,
  onAddHistory,
  onToast,
  onBack,
  onUseInTranslator,
}) => {
  const [sourceLang, setSourceLang] = useState('English 🇬🇧');
  const [targetLang, setTargetLang] = useState('Urdu 🇵🇰');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState('');
  const [translated, setTranslated] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    if (translated && extracted) {
      const prevExt = extracted;
      setExtracted(translated);
      setTranslated(prevExt);
    }
    onToast('Languages swapped');
  };

  const processImageBase64 = async (base64Url: string, mimeType = 'image/jpeg') => {
    setScannedImage(base64Url);
    const base64Data = base64Url.includes(',') ? base64Url.split(',')[1] : base64Url;

    setIsLoading(true);
    onToast('Scanning and extracting text...');

    try {
      const cleanMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
      const res = await ApiClient.ocrAndTranslate({
        imageBase64: base64Data,
        mimeType: cleanMime,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });

      const ext = res.extractedText || 'No text found';
      const trn = res.translatedText || 'No translation available';

      setExtracted(ext);
      setTranslated(trn);

      onAddHistory({
        id: Date.now().toString(),
        from: sourceLang,
        to: targetLang,
        input: ext,
        output: trn,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      onToast('Image processed successfully!');
    } catch (err: any) {
      onToast(err.message || 'Error processing image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
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
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          processImageBase64(compressed, 'image/jpeg');
        } else {
          processImageBase64(rawUrl, file.type || 'image/jpeg');
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearImage = () => {
    setScannedImage(null);
    setExtracted('');
    setTranslated('');
    onToast('Image and results cleared');
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text) return;
    if (isSpeaking) {
      GlobalAudioPlayer.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    onToast('Playing pronunciation...');
    GlobalAudioPlayer.play(text, lang, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const isTargetUrdu =
    targetLang.includes('Urdu') || targetLang.includes('Arabic') || targetLang.includes('Punjabi');

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6">
      {/* Hidden File Inputs */}
      <input
        id="imageInput"
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs sm:text-sm font-bold text-[#1d5fb8] hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          ← Back to Translator
        </button>

        <span className="text-xs font-bold text-[#6b7a8f] uppercase tracking-wider">
          Camera &amp; Photo OCR
        </span>
      </div>

      {/* Main OCR Card */}
      <div className="lafz-card p-4 sm:p-7 flex flex-col gap-6">
        {/* Languages Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e3eaf3] min-w-0 w-full">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto min-w-0">
            <select
              id="ocrSource"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="lafz-select flex-1 sm:flex-initial min-w-0 max-w-full text-xs sm:text-sm font-semibold cursor-pointer"
              aria-label="OCR Source Language"
            >
              {(languages || [
                { code: 'en', label: 'English 🇬🇧' },
                { code: 'ur', label: 'Urdu 🇵🇰' },
              ]).map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSwap}
              className="shrink-0 border border-[#e3eaf3] bg-[#fafcfe] hover:bg-[#eaf2fc] text-[#1d5fb8] rounded-xl p-2.5 sm:px-3 sm:py-2 text-sm font-bold transition transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
              title="Swap Languages"
            >
              ⇄
            </button>

            <select
              id="ocrTarget"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="lafz-select flex-1 sm:flex-initial min-w-0 max-w-full text-xs sm:text-sm font-semibold cursor-pointer"
              aria-label="OCR Target Language"
            >
              {(languages || [
                { code: 'en', label: 'English 🇬🇧' },
                { code: 'ur', label: 'Urdu 🇵🇰' },
              ]).map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="extractBtn"
              type="button"
              disabled={isLoading || !scannedImage}
              onClick={() => scannedImage && processImageBase64(scannedImage)}
              className="lafz-primary-btn text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
            >
              {isLoading ? 'Processing...' : 'Translate Image'}
            </button>
            {scannedImage && (
              <button
                id="clearImage"
                type="button"
                onClick={handleClearImage}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-xl transition cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Upload & Scanner Box */}
        {!scannedImage ? (
          <div
            id="uploadBox"
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed border-[#e3eaf3] hover:border-[#2f7de0] bg-[#fafcfe] hover:bg-[#f1f7ff] rounded-3xl p-6 sm:p-12 flex flex-col items-center justify-center text-center gap-4 cursor-pointer transition group min-w-0 w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#eaf2fc] text-[#1d5fb8] flex items-center justify-center text-3xl group-hover:scale-110 transition shadow-xs">
              📸
            </div>
            <div className="min-w-0 w-full">
              <h2
                className="text-lg sm:text-xl font-bold text-[#0f2a4a]"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Upload an Image or Take a Photo
              </h2>
              <p className="text-xs sm:text-sm text-[#6b7a8f] mt-1 max-w-md mx-auto">
                Supports JPG, PNG, and WebP documents, signs, menus, and receipts.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="lafz-primary-btn text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>📷</span> Take Photo
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  imageInputRef.current?.click();
                }}
                className="bg-white border border-[#e3eaf3] hover:bg-[#eaf2fc] text-[#1d5fb8] font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                📁 Choose File
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 min-w-0 w-full">
            {/* Scanned Image Preview Container */}
            <div
              id="imagePreview"
              className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#e3eaf3] max-h-72 flex items-center justify-center w-full"
            >
              <img
                src={scannedImage}
                alt="Uploaded scan preview"
                className="max-h-72 max-w-full w-auto object-contain mx-auto"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  id="replaceImage"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md transition cursor-pointer"
                >
                  Replace
                </button>
                <button
                  id="removeImage"
                  type="button"
                  onClick={handleClearImage}
                  className="bg-red-600/80 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-md transition cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-8 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] text-center flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[#1d5fb8] border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold text-sm text-[#0f2a4a]">
                  Detecting and translating text...
                </span>
              </div>
            )}

            {/* Results Grid */}
            {!isLoading && (extracted || translated) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0 w-full">
                {/* Extracted Text Box */}
                <div className="min-w-0 w-full border border-[#e3eaf3] bg-[#fafcfe] rounded-2xl p-4 flex flex-col justify-between min-h-[200px]">
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#6b7a8f] mb-2">
                      <span className="truncate">Detected Text ({sourceLang.split(' ')[0]})</span>
                      <button
                        id="copyExtracted"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(extracted);
                          onToast('Copied original text');
                        }}
                        className="text-[#1d5fb8] hover:underline cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <div
                      id="extractedText"
                      className="text-sm text-[#16263b] whitespace-pre-wrap break-words leading-relaxed select-text"
                    >
                      {extracted}
                    </div>
                  </div>
                </div>

                {/* Translated Result Box */}
                <div className="min-w-0 w-full border border-[#e3eaf3] bg-white rounded-2xl p-4 flex flex-col justify-between min-h-[200px] shadow-xs">
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#6b7a8f] mb-2">
                      <span className="text-[#1d5fb8] truncate">Translation ({targetLang.split(' ')[0]})</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSpeak(translated, targetLang)}
                          className="text-[#1d5fb8] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          🔊 {isSpeaking ? 'Stop' : 'Listen'}
                        </button>
                        <button
                          id="copyImageResult"
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(translated);
                            onToast('Copied translation!');
                          }}
                          className="text-[#1d5fb8] hover:underline cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div
                      id="imageOutput"
                      dir={isTargetUrdu ? 'rtl' : 'ltr'}
                      className={`text-base font-semibold text-[#0f2a4a] whitespace-pre-wrap break-words leading-relaxed select-text ${
                        isTargetUrdu ? 'font-urdu text-lg' : ''
                      }`}
                    >
                      {translated}
                    </div>
                  </div>

                  {onUseInTranslator && (
                    <div className="pt-3 border-t border-[#e3eaf3] mt-3 flex justify-end">
                      <button
                        id="imageTranslateBtn"
                        type="button"
                        onClick={() => onUseInTranslator(extracted, translated, sourceLang, targetLang)}
                        className="text-xs font-bold text-[#1d5fb8] hover:underline cursor-pointer"
                      >
                        Open in Text Translator →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
