import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Standard list of supported languages in Nova Translate
 */
export interface LanguageOption {
  code: string;
  name: string;
  label: string; // e.g. "Urdu 🇵🇰"
  nativeName: string;
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ur', name: 'Urdu', label: 'Urdu 🇵🇰', nativeName: 'اردو', direction: 'rtl' },
  { code: 'en', name: 'English', label: 'English 🇬🇧', nativeName: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', label: 'Arabic 🇸🇦', nativeName: 'العربية', direction: 'rtl' },
  { code: 'pa', name: 'Punjabi', label: 'Punjabi 🇵🇰', nativeName: 'پنجابی / ਪੰਜਾਬੀ', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', label: 'Hindi 🇮🇳', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', label: 'Japanese 🇯🇵', nativeName: '日本語', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', label: 'Chinese 🇨🇳', nativeName: '中文 (简体)', direction: 'ltr' },
  { code: 'fr', name: 'French', label: 'French 🇫🇷', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', label: 'German 🇩🇪', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'es', name: 'Spanish', label: 'Spanish 🇪🇸', nativeName: 'Español', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', label: 'Turkish 🇹🇷', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'ru', name: 'Russian', label: 'Russian 🇷🇺', nativeName: 'Русский', direction: 'ltr' },
  { code: 'fa', name: 'Persian', label: 'Persian 🇮🇷', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ko', name: 'Korean', label: 'Korean 🇰🇷', nativeName: '한국어', direction: 'ltr' },
  { code: 'it', name: 'Italian', label: 'Italian 🇮🇹', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', label: 'Portuguese 🇵🇹', nativeName: 'Português', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', label: 'Bengali 🇧🇩', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', label: 'Indonesian 🇮🇩', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', label: 'Dutch 🇳🇱', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'ps', name: 'Pashto', label: 'Pashto 🇦🇫', nativeName: 'پښتو', direction: 'rtl' },
  { code: 'sd', name: 'Sindhi', label: 'Sindhi 🇵🇰', nativeName: 'سنڌي', direction: 'rtl' },
];

/**
 * Initializes GoogleGenerativeAI client supporting both standard ('AIzaSy...')
 * and Service Account / REST format keys ('AQ....') via process.env.GEMINI_API_KEY.
 */
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY Missing in Environment Variables');
  }

  return new GoogleGenerativeAI(apiKey.trim());
}

/**
 * Strict 1.5 Flash generative model instance
 */
export const getGenerativeModel = (systemInstruction?: string) => {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
};

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  tone?: 'natural' | 'formal' | 'casual';
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  direction: 'ltr' | 'rtl';
  timestamp: string;
}

export interface DetectLanguageResponse {
  text: string;
  detectedLanguage: string;
  languageCode: string;
  confidence: number;
  direction: 'ltr' | 'rtl';
}

export interface OCRTranslationRequest {
  imageBase64: string;
  mimeType?: string;
  targetLanguage: string;
}

export interface OCRTranslationResponse {
  extractedText: string;
  translatedText: string;
  detectedSourceLanguage: string;
  targetLanguage: string;
  timestamp: string;
}

export interface VoiceSynthesizeRequest {
  text: string;
  language?: string;
  voiceName?: string;
}

export interface VoiceSynthesizeResponse {
  audioBase64?: string;
  mimeType: string;
  fallbackToBrowserTTS: boolean;
  message?: string;
}

/**
 * Centralized Backend Translation Service powered by gemini-1.5-flash
 */
export class TranslationService {
  /**
   * Translates text from source language to target language.
   * If source language is Auto or unspecified, performs automatic detection.
   */
  static async translate(req: TranslationRequest): Promise<TranslationResponse> {
    const rawText = (req.text || '').trim();
    if (!rawText) {
      throw new Error('Text to translate is required and cannot be empty.');
    }
    if (rawText.length > 5000) {
      throw new Error('Text exceeds the maximum allowed limit of 5000 characters.');
    }

    const targetLang = (req.targetLanguage || 'English').trim();
    const sourceLang = (req.sourceLanguage || 'Auto-detect').trim();
    const isAutoDetect =
      !sourceLang ||
      sourceLang.toLowerCase().includes('auto') ||
      sourceLang.toLowerCase() === 'detect';

    const prompt = `You are the translation engine of Nova Translate.
Translate the following input text accurately, fluently, and naturally into ${targetLang}.
Preserve line breaks, formatting, punctuation, and idioms.

Input text:
"""
${rawText}
"""

Respond with a JSON object in this format:
{
  "translatedText": "the translated string in ${targetLang}",
  "detectedSourceLanguage": "the detected language name of the source text (e.g. Urdu, English, Arabic)",
  "detectedLanguageCode": "two letter ISO 639-1 code if identifiable",
  "isRTL": true or false depending on whether ${targetLang} is right-to-left
}`;

    const systemInstruction = `You are a professional AI translator.
Source language instruction: ${isAutoDetect ? 'Detect source language automatically.' : `Source language is ${sourceLang}.`}
Target language: ${targetLang}.
Respond with a strict JSON object.`;

    const model = getGenerativeModel(systemInstruction);
    const result = await model.generateContent(prompt);
    const outputText = result.response.text() || '{}';

    let parsed: {
      translatedText?: string;
      detectedSourceLanguage?: string;
      detectedLanguageCode?: string;
      isRTL?: boolean;
    };

    try {
      parsed = JSON.parse(outputText);
    } catch {
      parsed = {
        translatedText: outputText.trim(),
        detectedSourceLanguage: sourceLang,
        isRTL: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(outputText),
      };
    }

    const finalTranslatedText = (parsed.translatedText || '').trim() || rawText;
    const isTargetRTL =
      parsed.isRTL ??
      /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalTranslatedText);

    return {
      originalText: rawText,
      translatedText: finalTranslatedText,
      sourceLanguage: isAutoDetect ? (parsed.detectedSourceLanguage || 'Detected') : sourceLang,
      detectedSourceLanguage: parsed.detectedSourceLanguage,
      targetLanguage: targetLang,
      direction: isTargetRTL ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Automatically detects language of input text using gemini-1.5-flash.
   */
  static async detect(text: string): Promise<DetectLanguageResponse> {
    const rawText = (text || '').trim();
    if (!rawText) {
      throw new Error('Text to detect is required.');
    }

    const prompt = `Identify the natural language of the following text:
"""
${rawText.slice(0, 1000)}
"""

Return a JSON object:
{
  "languageName": "English / Urdu / Arabic / Spanish / etc",
  "languageCode": "two letter ISO 639-1 code",
  "confidence": 0.95,
  "direction": "ltr" or "rtl"
}`;

    const model = getGenerativeModel('You are an expert language identifier. Return strict JSON.');
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text() || '{}');

    return {
      text: rawText,
      detectedLanguage: parsed.languageName || 'Unknown',
      languageCode: parsed.languageCode || 'auto',
      confidence: parsed.confidence || 0.95,
      direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
    };
  }

  /**
   * OCR & Translation: Extracts text from an image and translates it to target language using gemini-1.5-flash.
   */
  static async ocrAndTranslate(req: OCRTranslationRequest): Promise<OCRTranslationResponse> {
    if (!req.imageBase64) {
      throw new Error('Base64 image data is required.');
    }

    // Clean base64 header if present (e.g. data:image/png;base64,...)
    let cleanBase64 = req.imageBase64;
    let detectedMime = req.mimeType || 'image/jpeg';
    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      const header = parts[0];
      cleanBase64 = parts[1];
      const match = header.match(/data:(image\/[a-zA-Z0-9.+_-]+)/);
      if (match) detectedMime = match[1];
    }

    const targetLang = (req.targetLanguage || 'English').trim();
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const prompt = `Perform OCR on this image. Extract all text clearly and accurately.
Then translate all extracted text into ${targetLang}.
Return a strict JSON object with:
{
  "extractedText": "all extracted text from image",
  "translatedText": "the translated version in ${targetLang}",
  "detectedSourceLanguage": "language of text in image"
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const parsed = JSON.parse(result.response.text() || '{}');

    return {
      extractedText: (parsed.extractedText || '').trim(),
      translatedText: (parsed.translatedText || '').trim(),
      detectedSourceLanguage: parsed.detectedSourceLanguage || 'Detected',
      targetLanguage: targetLang,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Voice synthesis backend preparation using gemini-1.5-flash fallback.
   */
  static async synthesizeVoice(req: VoiceSynthesizeRequest): Promise<VoiceSynthesizeResponse> {
    const rawText = (req.text || '').trim();
    if (!rawText) {
      throw new Error('Text for voice synthesis is required.');
    }

    // Browser SpeechSynthesis will render audio locally
    return {
      mimeType: 'audio/wav',
      fallbackToBrowserTTS: true,
      message: 'Browser SpeechSynthesis will render audio locally.',
    };
  }

  /**
   * Returns list of supported languages.
   */
  static getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}
