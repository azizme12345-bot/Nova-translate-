import React, { useRef, useState, useEffect } from 'react';
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
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    if (translatedText && extractedText) {
      const prevExt = extractedText;
      setExtractedText(translatedText);
      setTranslatedText(prevExt);
    }
    onToast('زبانیں تبدیل کر دی گئیں');
  };

  const processImageBase64 = async (base64Url: string, mimeType = 'image/jpeg') => {
    setScannedImage(base64Url);
    const base64Data = base64Url.includes(',') ? base64Url.split(',')[1] : base64Url;

    setIsLoading(true);
    onToast('تصویر سکین اور ترجمہ کی جا رہی ہے...');

    try {
      const cleanMime = (mimeType && mimeType.startsWith('image/')) ? mimeType : 'image/jpeg';
      const res = await ApiClient.ocrAndTranslate({
        imageBase64: base64Data,
        mimeType: cleanMime,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });

      const ext = res.extractedText || 'کوئی متن نہیں ملا';
      const trn = res.translatedText || 'کوئی ترجمہ دستیاب نہیں';

      setExtractedText(ext);
      setTranslatedText(trn);

      onAddHistory({
        id: Date.now().toString(),
        from: sourceLang,
        to: targetLang,
        input: ext,
        output: trn,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      onToast('کیمرہ سکین مکمل ہو گیا!');
    } catch (err: any) {
      onToast(err.message || 'تصویر کا ترجمہ کرنے میں خرابی');
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          processImageBase64(dataUrl, 'image/jpeg');
        } else {
          processImageBase64(rawUrl, file.type || 'image/jpeg');
        }
      };
      img.onerror = () => {
        processImageBase64(rawUrl, file.type || 'image/jpeg');
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetake = () => {
    setScannedImage(null);
    setExtractedText('');
    setTranslatedText('');
    fileInputRef.current?.click();
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text) return;
    if (isSpeaking) {
      GlobalAudioPlayer.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    onToast('آواز چل رہی ہے...');
    GlobalAudioPlayer.play(text, lang, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const isTargetUrdu = targetLang.includes('Urdu') || targetLang.includes('Arabic') || targetLang.includes('Punjabi');

  return (
    <div className="flex flex-col flex-1 bg-[#f0f0f0] rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header matching green bar */}
      <div className="bg-[#2e7d32] text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 transition"
          >
            ← واپس
          </button>
          <span className="font-bold tracking-wide text-sm sm:text-base">
            کیمرہ سکینر • {sourceLang.split(' ')[0]} ↔ {targetLang.split(' ')[0]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwap}
            className="bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-md text-xs font-bold transition"
            title="زبانیں تبدیل کریں"
          >
            ⇄ تبدیل کریں
          </button>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-600">ذریعہ:</span>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:border-emerald-600"
          >
            {(languages || [{ code: 'en', label: 'English 🇬🇧' }, { code: 'ur', label: 'Urdu 🇵🇰' }]).map((l) => (
              <option key={l.code} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>

          <span className="font-semibold text-gray-600 ml-2">مقصد:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 focus:outline-none focus:border-emerald-600"
          >
            {(languages || [{ code: 'en', label: 'English 🇬🇧' }, { code: 'ur', label: 'Urdu 🇵🇰' }]).map((l) => (
              <option key={l.code} value={l.label}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="text-[#2e7d32] font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          📁 Import File
        </button>
      </div>

      {/* Main Viewfinder / Scanner Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-4 items-center justify-center">
        {!scannedImage && !isLoading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center gap-4 max-w-md w-full">
            <div className="w-16 h-16 bg-emerald-50 text-[#2e7d32] rounded-full flex items-center justify-center text-3xl">
              📸
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">کیمرہ سکینر اور فوٹو ترجمہ</h2>
              <p className="text-xs text-gray-500 mt-1">
                کوئی بھی تحریر، سائن بورڈ یا دستاویز کی تصویر لیں اور اس کا فوری ترجمہ حاصل کریں۔
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#2e7d32] hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition flex items-center gap-2 text-sm flex-1 justify-center cursor-pointer"
              >
                📸 Take Another Photo
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-5 py-3 rounded-xl font-bold shadow-sm transition flex items-center gap-2 text-sm flex-1 justify-center cursor-pointer"
              >
                📁 Import File
              </button>
            </div>
          </div>
        )}

        {/* Scanned Image Preview */}
        {scannedImage && (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-4/3 max-h-[300px] w-full max-w-md mx-auto flex items-center justify-center shadow-inner border border-gray-700">
            <img
              src={scannedImage}
              alt="Scanned frame"
              className="w-full h-full object-contain bg-black"
            />
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center gap-3 max-w-md w-full">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-sm tracking-wide text-gray-800">تصویر کا تجزیہ ہو رہا ہے...</span>
            <span className="text-xs text-gray-500">جیمینی اے آئی کے ذریعے متن پڑھا اور ترجمہ کیا جا رہا ہے</span>
          </div>
        )}

        {/* Retake & Import File Buttons when image scanned */}
        {scannedImage && !isLoading && (
          <div className="flex items-center justify-center gap-3 py-1 flex-wrap">
            <button
              type="button"
              onClick={handleRetake}
              className="bg-[#2e7d32] hover:bg-emerald-700 text-white text-xs sm:text-sm px-5 py-2.5 rounded-full font-bold shadow transition flex items-center gap-2 cursor-pointer"
            >
              📸 Take Another Photo
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs sm:text-sm px-5 py-2.5 rounded-full font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              📁 Import File
            </button>
          </div>
        )}

        {/* Translation Results Card */}
        {(extractedText || translatedText) && !isLoading && (
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col gap-3 w-full max-w-md">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#2e7d32] uppercase tracking-wide">
                ترجمہ کا نتیجہ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSpeak(translatedText, targetLang)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                    isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  🔊 {isSpeaking ? 'رکیں' : 'سنیں'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs text-gray-500 font-medium">اصل تحریر:</div>
              <div className="text-sm bg-gray-50 p-2.5 rounded-lg text-gray-800">{extractedText}</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs text-gray-500 font-medium">ترجمہ ({targetLang}):</div>
              <div
                className={`text-base font-bold text-gray-900 bg-emerald-50/50 p-3 rounded-lg ${
                  isTargetUrdu ? 'font-urdu text-right text-lg' : 'text-left'
                }`}
                dir={isTargetUrdu ? 'rtl' : 'ltr'}
              >
                {translatedText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
