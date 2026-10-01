import { GoogleGenAI, Type } from '@google/genai';

/**
 * Standard list of supported languages in Nova Translate
 */
export interface LanguageOption {
  code: string;
  name: string;
  label: string;
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
 * Initializes GoogleGenAI client securely supporting both AQ. and AIzaSy keys
 */
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
  });
}

// Active supported Flash models with high availability fallback
const FLASH_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

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
 * Centralized Backend Translation Service powered by active Gemini Flash
 */
export class TranslationService {
  /**
   * Translates text from source language to target language.
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

    const ai = getAIClient();

    const prompt = `You are the translation engine of Nova Translate.
Translate the following input text accurately, fluently, and naturally into ${targetLang}.
Preserve line breaks, markdown, formatting, punctuation, and idioms.

Input text:
"""
${rawText}
"""`;

    const systemInstruction = `You are a professional AI translator.
Source language: ${isAutoDetect ? 'Detect automatically' : sourceLang}.
Target language: ${targetLang}.
Respond with a strict JSON object.`;

    let response: any = null;
    let lastError: any = null;

    for (const model of FLASH_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedText: { type: Type.STRING },
                detectedSourceLanguage: { type: Type.STRING },
                detectedLanguageCode: { type: Type.STRING },
                isRTL: { type: Type.BOOLEAN },
              },
              required: ['translatedText', 'detectedSourceLanguage'],
            },
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Translation model currently unavailable. Please try again.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      parsed = {
        translatedText: response.text.trim(),
        detectedSourceLanguage: sourceLang,
        isRTL: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(response.text),
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
   * Automatically detects language of input text using Flash model
   */
  static async detect(text: string): Promise<DetectLanguageResponse> {
    const rawText = (text || '').trim();
    if (!rawText) {
      throw new Error('Text to detect is required.');
    }

    const ai = getAIClient();
    const prompt = `Identify the natural language of the following text:
"""
${rawText.slice(0, 1000)}
"""`;

    let response: any = null;
    for (const model of FLASH_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                languageName: { type: Type.STRING },
                languageCode: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                direction: { type: Type.STRING },
              },
              required: ['languageName', 'languageCode', 'confidence', 'direction'],
            },
          },
        });
        if (response?.text) break;
      } catch {
        continue;
      }
    }

    const parsed = JSON.parse(response?.text || '{}');
    return {
      text: rawText,
      detectedLanguage: parsed.languageName || 'Unknown',
      languageCode: parsed.languageCode || 'auto',
      confidence: parsed.confidence || 0.95,
      direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
    };
  }

  /**
   * OCR & Visual Translation: Extracts text from image and translates to target language.
   */
  static async ocrAndTranslate(req: OCRTranslationRequest): Promise<OCRTranslationResponse> {
    if (!req.imageBase64) {
      throw new Error('Base64 image data is required.');
    }

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
    const ai = getAIClient();

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Perform high accuracy OCR on this image.
1. Extract all text clearly and accurately.
2. Translate all extracted text into ${targetLang}.
Respond with strict JSON matching schema.`,
    };

    let response: any = null;
    let lastError: any = null;

    for (const model of FLASH_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [textPart.text, imagePart],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                extractedText: { type: Type.STRING },
                translatedText: { type: Type.STRING },
                detectedSourceLanguage: { type: Type.STRING },
              },
              required: ['extractedText', 'translatedText', 'detectedSourceLanguage'],
            },
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Image OCR service is unavailable. Please try again.');
    }

    const parsed = JSON.parse(response.text);
    return {
      extractedText: (parsed.extractedText || '').trim(),
      translatedText: (parsed.translatedText || '').trim(),
      detectedSourceLanguage: parsed.detectedSourceLanguage || 'Detected',
      targetLanguage: targetLang,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Voice synthesis backend preparation
   */
  static async synthesizeVoice(req: VoiceSynthesizeRequest): Promise<VoiceSynthesizeResponse> {
    return {
      mimeType: 'audio/wav',
      fallbackToBrowserTTS: true,
      message: 'Browser SpeechSynthesis will render audio locally.',
    };
  }

  static getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}
