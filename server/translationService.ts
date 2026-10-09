import { GoogleGenAI, Type } from '@google/genai';
import { serverTranslationCache } from './cache.ts';

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

function getAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({
    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'nova-translator-pro',
      },
    },
  });
}

// Model preference list for translation & reasoning
const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  tone?: 'natural' | 'formal' | 'casual';
  apiKey?: string;
}

export interface TranslationResponse {
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  confidence: number;
  alternatives?: string[];
  details?: string;
  direction: 'ltr' | 'rtl';
  timestamp: string;
  fromCache?: boolean;
}

export class TranslationService {
  /**
   * Test a custom Gemini API key live
   */
  static async testApiKey(customApiKey?: string): Promise<{ valid: boolean; model: string; message: string }> {
    const ai = getAIClient(customApiKey);
    try {
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: 'Respond with exactly: "OK"',
        config: { temperature: 0.1 },
      });
      if (response && response.text) {
        return {
          valid: true,
          model: PRIMARY_MODEL,
          message: 'Google Gemini API key successfully verified and connected!',
        };
      }
      throw new Error('No response text received from Gemini API.');
    } catch (err: any) {
      // Try fallback model if primary model fails
      try {
        const response2 = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: 'Respond with exactly: "OK"',
          config: { temperature: 0.1 },
        });
        if (response2 && response2.text) {
          return {
            valid: true,
            model: FALLBACK_MODEL,
            message: 'Google Gemini API key verified with fallback model!',
          };
        }
      } catch {}

      return {
        valid: false,
        model: PRIMARY_MODEL,
        message: err.message || 'Invalid or inactive Google Gemini API key.',
      };
    }
  }

  /**
   * Translates text with exponential backoff for 429 and 5xx errors
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
    const sourceLang = (req.sourceLanguage || 'Auto Detect').trim();
    const tone = req.tone || 'natural';
    const activeKey = customApiKey || req.apiKey;

    const cacheKey = `trans_v6_${sourceLang}_${targetLang}_${tone}_${rawText.toLowerCase()}`;
    const cached = serverTranslationCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        timestamp: new Date().toISOString(),
      };
    }

    const isAutoDetect = !sourceLang || sourceLang.toLowerCase().includes('auto') || sourceLang.toLowerCase() === 'detect';
    const ai = getAIClient(activeKey);

    const systemInstruction = `You are Nova Translator Pro — an ultra-fast professional translation assistant.
- Translate text accurately between languages.
- Maintain context, nuance, and meaning.
- Provide natural, fluent translations.
- Tone: ${tone}.
- Return valid JSON matching the schema.`;

    const prompt = `Translate this text from ${isAutoDetect ? 'detected source language' : sourceLang} to ${targetLang}:
"""
${rawText}
"""`;

    const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 3;
      let delay = 500;

      while (attempts < maxAttempts) {
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
                  alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          const status = err?.status || err?.code || 500;
          if (status === 429 || (status >= 500 && status < 600) || err.message?.includes('rate limit') || err.message?.includes('quota') || err.message?.includes('overloaded')) {
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((res) => setTimeout(res, delay));
              delay *= 2;
              continue;
            }
          }
          break;
        }
      }
      if (response?.text) break;
    }

    if (!response || !response.text) {
      throw lastError || new Error('Translation service temporarily unavailable. Please verify API key.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      const clean = response.text.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    const finalTranslatedText = (parsed.translatedText || '').trim() || rawText;
    const isTargetRTL = parsed.isRTL ?? /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalTranslatedText);

    const result: TranslationResponse = {
      sourceLanguage: parsed.sourceLanguage || (isAutoDetect ? 'Auto-detected' : sourceLang),
      targetLanguage: parsed.targetLanguage || targetLang,
      originalText: rawText,
      translatedText: finalTranslatedText,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.99,
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives.filter((a: any) => typeof a === 'string' && a.trim() && a !== finalTranslatedText) : [],
      details: (parsed.details || '').trim(),
      direction: isTargetRTL ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };

    serverTranslationCache.set(cacheKey, result);
    return result;
  }

  static async detect(text: string, customApiKey?: string): Promise<{ detectedLanguage: string; languageCode: string; direction: 'ltr' | 'rtl' }> {
    const rawText = (text || '').trim();
    if (!rawText) throw new Error('Text required');

    const ai = getAIClient(customApiKey);
    const prompt = `Identify the natural language of: "${rawText.slice(0, 150)}". Return JSON with {"languageName": "English", "languageCode": "en", "direction": "ltr"}.`;

    try {
      const res = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: { temperature: 0.1 },
      });
      const clean = (res.text || '').replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        detectedLanguage: parsed.languageName || 'English',
        languageCode: parsed.languageCode || 'en',
        direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
      };
    } catch {
      return { detectedLanguage: 'English', languageCode: 'en', direction: 'ltr' };
    }
  }

  static async transcribeAudio(
    params: { audioBase64: string; mimeType?: string; languageHint?: string; apiKey?: string },
    customApiKey?: string
  ): Promise<{ text: string }> {
    const { audioBase64, mimeType = 'audio/webm', languageHint } = params;
    if (!audioBase64) throw new Error('Audio data required');

    const activeKey = customApiKey || params.apiKey;
    const ai = getAIClient(activeKey);

    let cleanBase64 = audioBase64;
    let detectedMime = mimeType ? mimeType.split(';')[0] : 'audio/webm';
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }

    const audioPart = {
      inlineData: {
        data: cleanBase64.trim(),
        mimeType: detectedMime || 'audio/webm',
      },
    };

    const hint = languageHint ? `Language hint: ${languageHint}.` : '';
    const prompt = `Transcribe this speech accurately. ${hint} Output only the transcribed text with no extra commentary or quotes.`;

    const res = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: [prompt, audioPart],
      config: { temperature: 0.1 },
    });

    return { text: (res.text || '').trim() };
  }

  static async ocrAndTranslate(
    params: { imageBase64: string; mimeType?: string; sourceLanguage?: string; targetLanguage?: string; apiKey?: string },
    customApiKey?: string
  ): Promise<{ extractedText: string; translatedText: string; detectedSourceLanguage: string; targetLanguage: string; timestamp: string }> {
    const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'Urdu', sourceLanguage } = params;
    const activeKey = customApiKey || params.apiKey;
    const ai = getAIClient(activeKey);

    let cleanBase64 = imageBase64 || '';
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    if (!cleanBase64) {
      throw new Error('Image data is missing or empty.');
    }

    // Sanitize MIME type to valid image types
    let detectedMime = (mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'image/jpeg');
    if (!detectedMime.startsWith('image/')) {
      detectedMime = 'image/jpeg';
    }

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: detectedMime,
      },
    };

    const prompt = `Analyze this image carefully. Extract all readable text accurately. Detect the source language, and translate the extracted text into ${targetLanguage}.
Respond ONLY with a valid JSON object in this format:
{
  "extractedText": "exact extracted text from image",
  "translatedText": "translation in ${targetLanguage}",
  "detectedSourceLanguage": "name of source language"
}`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let res: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        res = await ai.models.generateContent({
          model,
          contents: [prompt, imagePart],
          config: {
            temperature: 0.1,
          },
        });
        if (res?.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`OCR model ${model} failed:`, err?.message || err);
      }
    }

    if (!res || !res.text) {
      throw lastError || new Error('OCR vision translation failed. Please check your Gemini API key or try another image.');
    }

    const clean = (res.text || '').replace(/```json\n?|\n?```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      const ext = (parsed.extractedText || '').trim();
      const trn = (parsed.translatedText || parsed.translation || '').trim();

      return {
        extractedText: ext || 'No text detected in this image.',
        translatedText: trn || (targetLanguage.includes('Urdu') ? 'تصویر میں کوئی تحریر نہیں ملی۔' : 'No text detected in this image.'),
        detectedSourceLanguage: parsed.detectedSourceLanguage || sourceLanguage || 'Auto-detected',
        targetLanguage,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        extractedText: clean || 'No text detected in this image.',
        translatedText: clean || (targetLanguage.includes('Urdu') ? 'تصویر میں کوئی تحریر نہیں ملی۔' : 'No text detected in this image.'),
        detectedSourceLanguage: sourceLanguage || 'Auto-detected',
        targetLanguage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async chat(
    params: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      imageBase64?: string;
      mimeType?: string;
      targetLanguage?: string;
    },
    customApiKey?: string
  ): Promise<{ reply: string; timestamp: string }> {
    const activeKey = customApiKey;
    const ai = getAIClient(activeKey);
    const targetLang = params.targetLanguage || 'Urdu';

    const systemInstruction = `You are Nova AI Workspace Assistant & Multilingual Translator.
- You can converse, answer questions, analyze image inputs, and provide translations.
- Respond in clear, helpful ${targetLang} or bilingual format as appropriate.
- Keep output concise, polite, and well-structured.`;

    const contents: any[] = [];

    if (params.imageBase64) {
      let cleanBase64 = params.imageBase64;
      if (cleanBase64.includes(';base64,')) cleanBase64 = cleanBase64.split(';base64,')[1];
      contents.push({
        inlineData: {
          data: cleanBase64.trim(),
          mimeType: params.mimeType || 'image/jpeg',
        },
      });
    }

    contents.push(params.message || 'Please assist with this request.');

    const res = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return {
      reply: (res.text || '').trim(),
      timestamp: new Date().toISOString(),
    };
  }

  static async synthesizeVoice(params: { text: string; language?: string; voiceName?: string; apiKey?: string }, customApiKey?: string): Promise<{ audioContent: string; fallbackToBrowserTTS: boolean }> {
    return { audioContent: '', fallbackToBrowserTTS: true };
  }

  static getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}
