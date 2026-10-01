import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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
 * Initializes Google GenAI client securely using server-side environment variables.
 */
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

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
 * Centralized Backend Translation Service
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

    const ai = getAIClient();

    const prompt = `You are the core translation engine of Nova Translate, an elite multi-lingual translation system.
Translate the following input text accurately, fluently, and naturally into ${targetLang}.
Preserve line breaks, markdown/formatting, punctuation, tone, and idioms without adding commentary, prefixes, or notes.

Input text:
"""
${rawText}
"""
`;

    const systemInstruction = `You are a professional AI translator.
Source language instruction: ${isAutoDetect ? 'Detect source language automatically.' : `Source language is ${sourceLang}.`}
Target language: ${targetLang}.
Respond with a strict JSON object matching the requested schema.`;

    // Fast and robust models in order of priority
    const candidateModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let response: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.2,
              thinkingConfig: model.startsWith('gemini-3') ? { thinkingLevel: ThinkingLevel.MINIMAL } : undefined,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  translatedText: {
                    type: Type.STRING,
                    description: 'The clean translated text in the target language.',
                  },
                  detectedSourceLanguage: {
                    type: Type.STRING,
                    description: 'The detected language name of the source text (e.g., Urdu, English, Arabic).',
                  },
                  detectedLanguageCode: {
                    type: Type.STRING,
                    description: 'Two-letter ISO 639-1 code if identifiable.',
                  },
                  isRTL: {
                    type: Type.BOOLEAN,
                    description: 'True if the target language is right-to-left.',
                  },
                },
                required: ['translatedText', 'detectedSourceLanguage'],
              },
            },
          });
          if (response?.text) break;
        } catch (err: any) {
          lastError = err;
          // If 503 or 429, wait a moment and try next
          if (err.status === 503 || err.status === 429 || err.message?.includes('503')) {
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          } else {
            break;
          }
        }
      }
      if (response?.text) break;
    }

    if (!response || !response.text) {
      throw lastError || new Error('Translation model currently unavailable. Please try again.');
    }

    const outputText = response.text || '{}';
    let parsed: {
      translatedText?: string;
      detectedSourceLanguage?: string;
      detectedLanguageCode?: string;
      isRTL?: boolean;
    };

    try {
      parsed = JSON.parse(outputText);
    } catch {
      // Fallback if parsing fails
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
   * Automatically detects language of input text.
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

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            languageName: { type: Type.STRING, description: 'E.g., Urdu, English, Arabic, Spanish' },
            languageCode: { type: Type.STRING, description: 'ISO 639-1 two-letter code, e.g. ur, en, ar' },
            confidence: { type: Type.NUMBER, description: 'Confidence between 0.0 and 1.0' },
            direction: { type: Type.STRING, description: 'ltr or rtl' },
          },
          required: ['languageName', 'languageCode', 'confidence', 'direction'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      text: rawText,
      detectedLanguage: parsed.languageName || 'Unknown',
      languageCode: parsed.languageCode || 'auto',
      confidence: parsed.confidence || 0.95,
      direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
    };
  }

  /**
   * OCR & Translation: Extracts text from an image and translates it to target language.
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
    const ai = getAIClient();

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Perform OCR on this image. Extract all text clearly and accurately.
Then translate all extracted text into ${targetLang}.
Return a JSON object with 'extractedText', 'translatedText', and 'detectedSourceLanguage'.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: { type: Type.STRING, description: 'All text recognized in the image' },
            translatedText: { type: Type.STRING, description: 'The translated version in the target language' },
            detectedSourceLanguage: { type: Type.STRING, description: 'Language of the text in the image' },
          },
          required: ['extractedText', 'translatedText', 'detectedSourceLanguage'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      extractedText: (parsed.extractedText || '').trim(),
      translatedText: (parsed.translatedText || '').trim(),
      detectedSourceLanguage: parsed.detectedSourceLanguage || 'Detected',
      targetLanguage: targetLang,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Voice synthesis backend preparation.
   * Attempts high-fidelity Gemini TTS audio generation; provides fallback info for browser speech synthesis.
   */
  static async synthesizeVoice(req: VoiceSynthesizeRequest): Promise<VoiceSynthesizeResponse> {
    const rawText = (req.text || '').trim();
    if (!rawText) {
      throw new Error('Text for voice synthesis is required.');
    }

    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: rawText.slice(0, 1000) }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: (req.voiceName as any) || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return {
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          fallbackToBrowserTTS: false,
        };
      }
    } catch {
      // Fallback seamlessly to client-side SpeechSynthesis if TTS quota or regional voice is constrained
    }

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
