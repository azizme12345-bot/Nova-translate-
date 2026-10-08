import { GoogleGenAI, Type } from '@google/genai';
import { serverTranslationCache } from './cache.ts';

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
  { code: 'pt', name: 'Portuguese', label: 'Portuguese 🇵🇹', nativeName: 'Português', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', label: 'Turkish 🇹🇷', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'ru', name: 'Russian', label: 'Russian 🇷🇺', nativeName: 'Русский', direction: 'ltr' },
  { code: 'fa', name: 'Persian', label: 'Persian 🇮🇷', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ko', name: 'Korean', label: 'Korean 🇰🇷', nativeName: '한국어', direction: 'ltr' },
  { code: 'it', name: 'Italian', label: 'Italian 🇮🇹', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', label: 'Bengali 🇧🇩', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', label: 'Indonesian 🇮🇩', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', label: 'Dutch 🇳🇱', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'ps', name: 'Pashto', label: 'Pashto 🇦🇫', nativeName: 'پښتو', direction: 'rtl' },
  { code: 'sd', name: 'Sindhi', label: 'Sindhi 🇵🇰', nativeName: 'سنڌي', direction: 'rtl' },
];

/**
 * Initializes GoogleGenAI client securely, using user's custom API key or server default
 */
function getAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({
    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Ultra-fast Gemini models with full fallback support for Wi-Fi, VPN, and any version selected
const FAST_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

function resolveModelList(requestedModel?: string): string[] {
  if (!requestedModel || !requestedModel.trim()) {
    return [...FAST_MODELS];
  }
  const m = requestedModel.trim().toLowerCase();
  let mapped = requestedModel.trim();
  if (m.includes('lite')) {
    mapped = 'gemini-3.1-flash-lite';
  } else if (m.includes('latest')) {
    mapped = 'gemini-flash-latest';
  } else if (m.includes('1.5') || m.includes('2.0') || m.includes('2.5') || m.includes('3.8')) {
    mapped = 'gemini-3.8-flash';
  }
  return [mapped, ...FAST_MODELS.filter((item) => item !== mapped)];
}

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  tone?: 'natural' | 'formal' | 'casual';
  apiKey?: string;
  model?: string;
}

export interface TranslationResponse {
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  confidence: number;
  alternatives?: string[];
  details?: string;
  detectedSourceLanguage?: string;
  direction: 'ltr' | 'rtl';
  timestamp: string;
  fromCache?: boolean;
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
  apiKey?: string;
  model?: string;
}

export interface OCRTranslationResponse {
  extractedText: string;
  translatedText: string;
  detectedSourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
  alternatives?: string[];
  details?: string;
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
 * Centralized Backend Translation Service with Official Nova Translate System Prompt
 */
export class TranslationService {
  /**
   * Translates text with Server-side Caching & automatic multi-model fallback (Wi-Fi & VPN compatible)
   */
  static async translate(req: TranslationRequest, customApiKey?: string): Promise<TranslationResponse> {
    const rawText = (req.text || '').trim();
    if (!rawText) {
      throw new Error('Text to translate is required and cannot be empty.');
    }
    if (rawText.length > 5000) {
      throw new Error('Text exceeds the maximum allowed limit of 5000 characters.');
    }

    const targetLang = (req.targetLanguage || 'English').trim();
    const sourceLang = (req.sourceLanguage || 'Auto-detect').trim();
    const tone = req.tone || 'natural';
    const activeKey = customApiKey || req.apiKey;

    // 1. Check Server Cache for instant response
    const cacheKey = `trans_v4_${sourceLang}_${targetLang}_${tone}_${rawText.toLowerCase()}`;
    const cached = serverTranslationCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        timestamp: new Date().toISOString(),
      };
    }

    const isAutoDetect =
      !sourceLang ||
      sourceLang.toLowerCase().includes('auto') ||
      sourceLang.toLowerCase() === 'detect';

    const ai = getAIClient(activeKey);

    // Prioritize user's requested model if provided, followed by all FAST_MODELS as backup
    const modelsToTry = resolveModelList(req.model);

    const systemInstruction = `You are Nova Translate - A professional translation assistant AI.

CORE INSTRUCTIONS:
- Translate text accurately between languages
- Maintain context, nuance, and meaning
- Keep formatting, numbers, and punctuation intact
- Provide natural, fluent, native-sounding translations
- Tone: ${tone}
- Always respond with valid JSON format strictly matching the schema.

TRANSLATION RULES:
1. Preserve original meaning
2. Use natural expressions in target language
3. Consider cultural context
4. Maintain tone and style (${tone})
5. Provide 1-2 realistic alternative translations for ambiguous or rich terms
6. Always validate output accuracy (95%+ target)`;

    const prompt = `Translate the following input text from ${isAutoDetect ? 'detected source language' : sourceLang} to ${targetLang}:
"""
${rawText}
"""`;

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sourceLanguage: { type: Type.STRING },
                targetLanguage: { type: Type.STRING },
                originalText: { type: Type.STRING },
                translatedText: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                alternatives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                details: { type: Type.STRING },
                isRTL: { type: Type.BOOLEAN },
              },
              required: ['sourceLanguage', 'targetLanguage', 'translatedText', 'confidence'],
            },
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        // Continue to next model fallback if 503, 404, or network error
        continue;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Translation service temporarily unavailable. Please check your network (Wi-Fi/VPN) and API key.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      parsed = {
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        originalText: rawText,
        translatedText: response.text.trim(),
        confidence: 0.95,
        alternatives: [],
        details: '',
        isRTL: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(response.text),
      };
    }

    const finalTranslatedText = (parsed.translatedText || '').trim() || rawText;
    const isTargetRTL =
      parsed.isRTL ??
      /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalTranslatedText);

    const result: TranslationResponse = {
      sourceLanguage: parsed.sourceLanguage || (isAutoDetect ? 'Auto-detected' : sourceLang),
      targetLanguage: parsed.targetLanguage || targetLang,
      originalText: rawText,
      translatedText: finalTranslatedText,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives.filter((a: any) => typeof a === 'string' && a.trim() && a !== finalTranslatedText) : [],
      details: (parsed.details || '').trim(),
      detectedSourceLanguage: parsed.sourceLanguage,
      direction: isTargetRTL ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };

    serverTranslationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Fast language detection with fallback
   */
  static async detect(text: string, customApiKey?: string, modelHint?: string): Promise<DetectLanguageResponse> {
    const rawText = (text || '').trim();
    if (!rawText) {
      throw new Error('Text to detect is required.');
    }

    const ai = getAIClient(customApiKey);
    const prompt = `Identify the natural language of: "${rawText.slice(0, 300)}"`;

    const modelsToTry = resolveModelList(modelHint);

    let response: any = null;
    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                languageName: { type: Type.STRING },
                languageCode: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                direction: { type: Type.STRING },
              },
              required: ['languageName', 'languageCode'],
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
      confidence: parsed.confidence || 0.98,
      direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
    };
  }

  /**
   * Fast OCR & Visual Translation with multi-model fallback
   */
  static async ocrAndTranslate(req: OCRTranslationRequest, customApiKey?: string): Promise<OCRTranslationResponse> {
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
    const activeKey = customApiKey || req.apiKey;
    const ai = getAIClient(activeKey);

    const modelsToTry = resolveModelList(req.model);

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const textPrompt = `You are Nova Translate. Extract all text from this image and provide an accurate, fluent translation in ${targetLang}. Return strict JSON with extractedText, translatedText, and detectedSourceLanguage.`;

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [textPrompt, imagePart],
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                extractedText: { type: Type.STRING },
                translatedText: { type: Type.STRING },
                detectedSourceLanguage: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                details: { type: Type.STRING },
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
      throw lastError || new Error('Image OCR service is unavailable. Please check your network and API key.');
    }

    const parsed = JSON.parse(response.text);
    return {
      extractedText: (parsed.extractedText || '').trim(),
      translatedText: (parsed.translatedText || '').trim(),
      detectedSourceLanguage: parsed.detectedSourceLanguage || 'Detected',
      targetLanguage: targetLang,
      confidence: parsed.confidence || 0.95,
      details: parsed.details || '',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * AI Chat & Multimodal Photo Analysis Assistant
   */
  static async chatWithAI(
    req: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      imageBase64?: string;
      mimeType?: string;
      targetLanguage?: string;
      model?: string;
      apiKey?: string;
    },
    customApiKey?: string
  ): Promise<{
    reply: string;
    translatedReply?: string;
    detectedLanguage?: string;
    timestamp: string;
  }> {
    const rawMessage = (req.message || '').trim();
    if (!rawMessage && !req.imageBase64) {
      throw new Error('Message or image is required for AI Chat.');
    }

    const activeKey = customApiKey || req.apiKey;
    const ai = getAIClient(activeKey);
    const modelsToTry = resolveModelList(req.model);
    const targetLang = req.targetLanguage || 'English';

    const systemInstruction = `You are NOVA Translate AI Pro — an ultra-fast, intelligent multilingual translation, language tutor, and visual photo analysis assistant.
- Help the user with translations, idioms, grammar explanations, conversation practice, or analyzing text/objects in photos.
- Be concise, accurate, and crystal clear.
- If the user asks to translate or speaks in a specific language, provide natural translations (especially Urdu, English, Arabic, Hindi, etc.) and helpful pronunciation tips when relevant.
- Preferred target language context: ${targetLang}.`;

    const contents: any[] = [];

    if (req.history && Array.isArray(req.history)) {
      const recentHistory = req.history.slice(-8);
      for (const item of recentHistory) {
        if (item.text && item.text.trim()) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.text.trim() }],
          });
        }
      }
    }

    const userParts: any[] = [];
    if (req.imageBase64) {
      let cleanBase64 = req.imageBase64.trim();
      let detectedMime = req.mimeType || 'image/jpeg';
      if (cleanBase64.startsWith('data:')) {
        const parts = cleanBase64.split(',');
        if (parts.length > 1) {
          const match = parts[0].match(/data:(image\/[a-zA-Z0-9.+_-]+)/);
          if (match) detectedMime = match[1];
          cleanBase64 = parts[1];
        }
      }
      userParts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      });
    }

    userParts.push({
      text: rawMessage || `Analyze this image, extract any visible text, and translate/explain it in ${targetLang}.`,
    });

    contents.push({
      role: 'user',
      parts: userParts,
    });

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('AI Chat failed to respond. Please check your connection.');
    }

    return {
      reply: response.text.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Voice synthesis using Gemini 3.8 Flash Lite TTS with Male (Puck) / Female (Kore) voice support
   */
  static async synthesizeVoice(
    req: VoiceSynthesizeRequest & { gender?: 'male' | 'female'; apiKey?: string },
    customApiKey?: string
  ): Promise<VoiceSynthesizeResponse> {
    const cleanText = (req.text || '').trim().slice(0, 600);
    if (!cleanText) {
      return {
        mimeType: 'audio/wav',
        fallbackToBrowserTTS: true,
        message: 'Empty text',
      };
    }

    const gender = (req.gender || 'female').toLowerCase();
    // Prebuilt voices: 'Kore' (Female clear), 'Zephyr' (Female warm), 'Puck' (Male clear), 'Fenrir' (Male deep)
    const selectedVoice = req.voiceName || (gender === 'male' ? 'Puck' : 'Kore');

    try {
      const activeKey = customApiKey || req.apiKey;
      const ai = getAIClient(activeKey);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
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
      // Fallback gracefully if TTS model is unavailable or quota reached
    }

    return {
      mimeType: 'audio/wav',
      fallbackToBrowserTTS: true,
      message: 'Using high-speed native speech synthesis fallback.',
    };
  }

  /**
   * Lightning-Fast Audio Transcription (Voice to Text in ~1-2s) with multi-model fallback
   */
  static async transcribeAudio(
    params: { audioBase64: string; mimeType?: string; languageHint?: string; apiKey?: string; model?: string },
    customApiKey?: string
  ): Promise<{ text: string }> {
    const { audioBase64, mimeType = 'audio/wav', languageHint, model: reqModel } = params;
    if (!audioBase64) {
      throw new Error('Audio data is required for transcription.');
    }

    const activeKey = customApiKey || params.apiKey;
    const ai = getAIClient(activeKey);

    const modelsToTry = resolveModelList(reqModel || 'gemini-3.5-transcribe');

    let cleanBase64 = audioBase64;
    let detectedMime = mimeType ? mimeType.split(';')[0] : 'audio/wav';

    if (cleanBase64.includes(';base64,')) {
      const parts = cleanBase64.split(';base64,');
      const header = parts[0];
      cleanBase64 = parts[1];
      const match = header.match(/data:(audio\/[a-zA-Z0-9.+_-]+)/);
      if (match) detectedMime = match[1];
    } else if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const audioPart = {
      inlineData: {
        data: cleanBase64.trim(),
        mimeType: detectedMime || 'audio/wav',
      },
    };

    const hint = languageHint ? `Language hint: ${languageHint}.` : '';
    const prompt = `Transcribe the speech in this audio accurately into its natural script. ${hint} Output strict JSON with "text".`;

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [prompt, audioPart],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
              },
              required: ['text'],
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
      throw lastError || new Error('Could not transcribe audio. Check Wi-Fi/VPN connection and API key.');
    }

    let extractedText = '';
    try {
      const parsed = JSON.parse(response.text);
      extractedText = parsed.text || '';
    } catch {
      extractedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
    }

    return {
      text: extractedText.trim(),
    };
  }

  /**
   * Test API Key validity
   */
  static async testApiKey(customApiKey?: string, modelHint?: string): Promise<{ valid: boolean; model: string; message: string }> {
    const ai = getAIClient(customApiKey);
    const modelsToTry = resolveModelList(modelHint);

    let testResponse: any = null;
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        testResponse = await ai.models.generateContent({
          model,
          contents: 'Respond with OK if connected.',
          config: {
            maxOutputTokens: 10,
          },
        });
        if (testResponse && testResponse.text) {
          return {
            valid: true,
            model,
            message: `Google Gemini API Key verified and active on model ${model}! Wi-Fi & VPN supported.`,
          };
        }
      } catch (e: any) {
        lastErr = e;
        continue;
      }
    }
    throw lastErr || new Error('API key test failed on all available models.');
  }

  static getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}
