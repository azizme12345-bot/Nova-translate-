import { ThinkingLevel, Type } from '@google/genai';
import {
  ApiRequest,
  ApiResponse,
  TEXT_MODEL,
  extractGeminiError,
  getGeminiClient,
  parseModelJson,
  readRequestBody,
  sendJson,
} from './_config.js';

const MAX_TEXT_LENGTH = 5000;

interface TranslateBody extends Record<string, unknown> {
  text?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

interface TranslateModelOutput {
  translatedText: string;
  detectedSourceLanguage: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const body = await readRequestBody<TranslateBody>(req);
    const text = String(body.text || '').trim();
    const sourceLanguage = String(body.sourceLanguage || 'auto').trim() || 'auto';
    const targetLanguage = String(body.targetLanguage || 'Urdu').trim() || 'Urdu';

    if (!text) {
      return sendJson(res, 400, { error: 'Please enter text to translate.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return sendJson(res, 400, { error: `Text exceeds ${MAX_TEXT_LENGTH} character limit.` });
    }

    const ai = getGeminiClient();
    const isAuto =
      sourceLanguage.toLowerCase() === 'auto' ||
      sourceLanguage.toLowerCase().startsWith('auto');

    const prompt = isAuto
      ? `Detect the source language and translate the following text accurately into ${targetLanguage}.\n\nText:\n${text}`
      : `Translate the following text accurately from ${sourceLanguage} into ${targetLanguage}.\n\nText:\n${text}`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a fast, accurate translator. Preserve the meaning, tone, punctuation, and line breaks of the input text. Return ONLY valid JSON with translatedText and detectedSourceLanguage (the English name of the source language, e.g. "English", "Urdu", "Arabic").',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: 'The accurate translation in the target language.',
            },
            detectedSourceLanguage: {
              type: Type.STRING,
              description: 'English name of the detected or provided source language.',
            },
          },
          required: ['translatedText', 'detectedSourceLanguage'],
        },
      },
    });

    const parsed = parseModelJson<TranslateModelOutput>(response.text);
    const translatedText = String(parsed.translatedText || '').trim();
    const detectedSourceLanguage =
      String(parsed.detectedSourceLanguage || (isAuto ? '' : sourceLanguage)).trim() ||
      (isAuto ? 'Auto-detected' : sourceLanguage);

    if (!translatedText) {
      return sendJson(res, 502, { error: 'Gemini returned an empty translation.' });
    }

    return sendJson(res, 200, {
      translatedText,
      detectedSourceLanguage,
    });
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    return sendJson(res, status, { error: message });
  }
}
