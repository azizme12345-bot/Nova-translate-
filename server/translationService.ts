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

const LANG_CODE_TABLE: Record<string, string> = {
  English: 'en',
  Urdu: 'ur',
  Arabic: 'ar',
  Punjabi: 'pa',
  Hindi: 'hi',
  Japanese: 'ja',
  Chinese: 'zh-CN',
  French: 'fr',
  German: 'de',
  Spanish: 'es',
  Portuguese: 'pt',
  Turkish: 'tr',
  Russian: 'ru',
  Persian: 'fa',
  Korean: 'ko',
  Italian: 'it',
  Bengali: 'bn',
  Indonesian: 'id',
  Dutch: 'nl',
  Pashto: 'ps',
  Sindhi: 'sd',
};

function getEnvGeminiKey(): string {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return '';
  }
  return key;
}

function getAIClient(): GoogleGenAI {
  const apiKey = getEnvGeminiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function isAuthError(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    msg.indexOf('API key not valid') !== -1 ||
    msg.indexOf('API_KEY_INVALID') !== -1 ||
    msg.indexOf('UNAUTHENTICATED') !== -1 ||
    msg.indexOf('PERMISSION_DENIED') !== -1
  );
}

function getLangCode(langName: string): string {
  const raw = (langName || '').trim();
  const firstWord = raw.split(/\s+/)[0] || '';
  return LANG_CODE_TABLE[firstWord] || 'en';
}

async function fallbackTranslateViaGtx(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  try {
    const firstSrcWord = (sourceLang || '').trim().split(/\s+/)[0];
    const isAuto = !sourceLang || firstSrcWord === 'Auto' || firstSrcWord === 'Detect' || sourceLang.toLowerCase() === 'auto';
    const sl = isAuto ? 'auto' : getLangCode(sourceLang);
    const tl = getLangCode(targetLang);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const joined = data[0].map((part: any) => (Array.isArray(part) ? part[0] : '')).join('').trim();
      return joined || null;
    }
  } catch {}
  return null;
}

const PRIMARY_MODEL = 'gemini-2.5-flash';
const LITE_MODEL = 'gemini-2.5-flash-lite';
const TEXT_MODELS = [PRIMARY_MODEL, LITE_MODEL, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
const AUDIO_MODELS = [PRIMARY_MODEL, LITE_MODEL, 'gemini-3.5-transcribe', 'gemini-4-hydrogen'];

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  tone?: 'natural' | 'formal' | 'casual';
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
  static async testApiKey(): Promise<{ valid: boolean; model: string; message: string }> {
    try {
      const ai = getAIClient();
      for (const model of TEXT_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: 'Respond with exactly: "OK"',
          });
          if (response && response.text) {
            return {
              valid: true,
              model,
              message: 'GEMINI_API_KEY successfully verified and connected!',
            };
          }
        } catch (err: any) {
          console.error('[testApiKey]', model, err?.message || err);
          if (isAuthError(err)) {
            return {
              valid: false,
              model,
              message: err?.message || 'Invalid GEMINI_API_KEY.',
            };
          }
        }
      }
      return {
        valid: false,
        model: PRIMARY_MODEL,
        message: 'Gemini API request failed.',
      };
    } catch (err: any) {
      return {
        valid: false,
        model: PRIMARY_MODEL,
        message: err?.message || 'GEMINI_API_KEY is not configured on the server.',
      };
    }
  }

  static async translate(req: TranslationRequest): Promise<TranslationResponse> {
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

    const cacheKey = `trans_v6_${sourceLang}_${targetLang}_${tone}_${rawText.toLowerCase()}`;
    const cached = serverTranslationCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        timestamp: new Date().toISOString(),
      };
    }

    const firstSrcWord = sourceLang.split(/\s+/)[0];
    const isAutoDetect = !sourceLang || firstSrcWord === 'Auto' || firstSrcWord === 'Detect' || sourceLang.toLowerCase() === 'auto';

    const systemInstruction = `You are LAFZ Translation — an ultra-fast professional translation assistant.
- Translate text accurately between languages.
- Maintain context, nuance, and meaning.
- Provide natural, fluent translations.
- Tone: ${tone}.
- Return valid JSON matching the schema.`;

    const prompt = `Translate this text from ${isAutoDetect ? 'detected source language' : sourceLang} to ${targetLang}:
"""
${rawText}
"""`;

    let response: any = null;
    let lastError: any = null;

    try {
      const ai = getAIClient();
      for (const model of TEXT_MODELS) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  sourceLanguage: { type: Type.STRING },
                  targetLanguage: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  isRTL: { type: Type.BOOLEAN },
                },
                required: ['sourceLanguage', 'targetLanguage', 'translatedText', 'confidence'],
              },
            },
          });
          if (response?.text) break;
        } catch (err: any) {
          lastError = err;
          console.error('[translate]', model, err?.message || err);
          if (isAuthError(err)) break;
        }
      }
    } catch (err: any) {
      lastError = err;
    }

    if (!response || !response.text) {
      const gtxOut = await fallbackTranslateViaGtx(rawText, sourceLang, targetLang);
      if (gtxOut) {
        const isTargetRTL = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(gtxOut);
        const fallbackResult: TranslationResponse = {
          sourceLanguage: isAutoDetect ? 'Auto-detected' : sourceLang,
          targetLanguage: targetLang,
          originalText: rawText,
          translatedText: gtxOut,
          confidence: 0.98,
          alternatives: [],
          details: '',
          direction: isTargetRTL ? 'rtl' : 'ltr',
          timestamp: new Date().toISOString(),
          fromCache: false,
        };
        serverTranslationCache.set(cacheKey, fallbackResult);
        return fallbackResult;
      }
      throw new Error(lastError?.message || 'Translation failed on server.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      const clean = response.text.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    const finalTranslatedText = (parsed.translatedText || '').trim();
    if (!finalTranslatedText) {
      throw new Error('Translation returned empty result from Gemini.');
    }

    const isTargetRTL = parsed.isRTL ?? /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalTranslatedText);

    const result: TranslationResponse = {
      sourceLanguage: parsed.sourceLanguage || (isAutoDetect ? 'Auto-detected' : sourceLang),
      targetLanguage: parsed.targetLanguage || targetLang,
      originalText: rawText,
      translatedText: finalTranslatedText,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.99,
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.filter((a: any) => typeof a === 'string' && a.trim() && a !== finalTranslatedText)
        : [],
      details: (parsed.details || '').trim(),
      direction: isTargetRTL ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };

    serverTranslationCache.set(cacheKey, result);
    return result;
  }

  static async detect(text: string): Promise<{ detectedLanguage: string; languageCode: string; direction: 'ltr' | 'rtl' }> {
    const rawText = (text || '').trim();
    if (!rawText) throw new Error('Text required');

    const ai = getAIClient();
    const prompt = `Identify the natural language of: "${rawText.slice(0, 150)}". Return JSON matching {"languageName": "English", "languageCode": "en", "direction": "ltr"}.`;

    let lastError: any = null;
    for (const model of TEXT_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                languageName: { type: Type.STRING },
                languageCode: { type: Type.STRING },
                direction: { type: Type.STRING },
              },
              required: ['languageName', 'languageCode', 'direction'],
            },
          },
        });
        if (res?.text) {
          const clean = res.text.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (!parsed.languageName) {
            throw new Error('Failed to detect language from Gemini response.');
          }
          return {
            detectedLanguage: parsed.languageName,
            languageCode: parsed.languageCode || getLangCode(parsed.languageName),
            direction: parsed.direction === 'rtl' ? 'rtl' : 'ltr',
          };
        }
      } catch (err: any) {
        lastError = err;
        console.error('[detect]', model, err?.message || err);
        if (isAuthError(err)) break;
      }
    }

    throw new Error(lastError?.message || 'Language detection failed on server.');
  }

  static async transcribeAudio(params: {
    audioBase64: string;
    mimeType?: string;
    languageHint?: string;
    targetLanguage?: string;
  }): Promise<{ text: string; translatedText?: string }> {
    const { audioBase64, mimeType = 'audio/webm', languageHint, targetLanguage } = params;
    if (!audioBase64) throw new Error('Audio data required');

    const ai = getAIClient();

    let cleanBase64 = audioBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',').slice(1).join(',');
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    if (!cleanBase64) {
      throw new Error('Recorded audio data is empty.');
    }

    let detectedMime = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/webm';
    if (!detectedMime.startsWith('audio/')) {
      detectedMime = 'audio/webm';
    }

    const audioPart = {
      inlineData: {
        data: cleanBase64,
        mimeType: detectedMime,
      },
    };

    const cleanHint = languageHint ? languageHint.replace(/[^\p{L}\s]/gu, '').trim() : '';
    const transcribePrompt = cleanHint
      ? `Transcribe all spoken words in this audio accurately in ${cleanHint}. Output ONLY the exact transcribed text with no commentary, labels, or quotes. If there is only silence or no intelligible speech, output [NO_SPEECH].`
      : `Transcribe all spoken words in this audio accurately. Output ONLY the exact transcribed text with no commentary, labels, or quotes. If there is only silence or no intelligible speech, output [NO_SPEECH].`;

    let transcribedText = '';
    let succeededOnce = false;
    let lastError: any = null;

    for (const model of AUDIO_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: { parts: [audioPart, { text: transcribePrompt }] },
        });
        succeededOnce = true;
        const raw = (res?.text || '').trim();
        if (raw && raw !== '[NO_SPEECH]' && !/^\[?no[_\s]?speech\]?$/i.test(raw)) {
          transcribedText = raw.replace(/^["']|["']$/g, '').trim();
        }
        break;
      } catch (err: any) {
        lastError = err;
        console.error('[transcribeAudio]', model, err?.message || err);
        if (isAuthError(err)) break;
      }
    }

    if (!succeededOnce && lastError) {
      throw new Error(lastError?.message || 'Speech transcription failed on server.');
    }

    if (!transcribedText) {
      return { text: '' };
    }

    if (targetLanguage) {
      const translation = await TranslationService.translate({
        text: transcribedText,
        sourceLanguage: languageHint,
        targetLanguage,
      });
      return {
        text: transcribedText,
        translatedText: translation.translatedText,
      };
    }

    return { text: transcribedText };
  }

  static async ocrAndTranslate(params: {
    imageBase64: string;
    mimeType?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  }): Promise<{ extractedText: string; translatedText: string; detectedSourceLanguage: string; targetLanguage: string; timestamp: string }> {
    const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'Urdu', sourceLanguage } = params;
    const ai = getAIClient();

    let cleanBase64 = imageBase64 || '';
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    if (!cleanBase64) {
      throw new Error('Image data is missing or empty.');
    }

    let detectedMime = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'image/jpeg';
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
Respond ONLY with a valid JSON object matching the schema.`;

    let res: any = null;
    let lastError: any = null;

    for (const model of TEXT_MODELS) {
      try {
        res = await ai.models.generateContent({
          model,
          contents: { parts: [imagePart, { text: prompt }] },
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
        if (res?.text) break;
      } catch (err: any) {
        lastError = err;
        console.error('[ocrAndTranslate]', model, err?.message || err);
        if (isAuthError(err)) break;
      }
    }

    if (!res || !res.text) {
      throw new Error(lastError?.message || 'Camera OCR failed on server.');
    }

    const clean = (res.text || '').replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean);
    const ext = (parsed.extractedText || '').trim();
    const trn = (parsed.translatedText || parsed.translation || '').trim();

    if (!ext) {
      throw new Error('No text detected in this image.');
    }
    if (!trn) {
      throw new Error('Translation failed for extracted image text.');
    }

    return {
      extractedText: ext,
      translatedText: trn,
      detectedSourceLanguage: parsed.detectedSourceLanguage || sourceLanguage || 'Auto-detected',
      targetLanguage,
      timestamp: new Date().toISOString(),
    };
  }

  static async chat(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    imageBase64?: string;
    mimeType?: string;
    targetLanguage?: string;
  }): Promise<{ reply: string; timestamp: string }> {
    const ai = getAIClient();
    const targetLang = params.targetLanguage || 'Urdu';

    const systemInstruction = `You are LAFZ Translation Assistant & Multilingual Translator.
- You can converse, answer questions, analyze image inputs, and provide translations.
- Respond in clear, helpful ${targetLang} or bilingual format as appropriate.
- Keep output concise, polite, and well-structured.`;

    const parts: any[] = [];

    if (params.imageBase64) {
      let cleanBase64 = params.imageBase64;
      if (cleanBase64.includes(';base64,')) cleanBase64 = cleanBase64.split(';base64,')[1];
      parts.push({
        inlineData: {
          data: cleanBase64.trim(),
          mimeType: params.mimeType || 'image/jpeg',
        },
      });
    }

    parts.push({ text: params.message || 'Please assist with this request.' });

    const res = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: { parts },
      config: {
        systemInstruction,
      },
    });

    const reply = (res.text || '').trim();
    if (!reply) {
      throw new Error('Empty response from Gemini.');
    }

    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  }

  static async synthesizeVoice(_params: { text: string; language?: string; voiceName?: string }): Promise<{ audioContent: string; fallbackToBrowserTTS: boolean }> {
    return { audioContent: '', fallbackToBrowserTTS: true };
  }

  static getSupportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}
