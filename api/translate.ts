import { ThinkingLevel, Type } from '@google/genai';
import {
  ApiRequest,
  ApiResponse,
  TEXT_MODEL,
  extractGeminiError,
  getGeminiClient,
  parseModelJson,
  parseRequestBody,
} from './_config';

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
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody<TranslateBody>(req.body);
    const text = String(body.text || '').trim();
    const sourceLanguage = String(body.sourceLanguage || 'auto').trim() || 'auto';
    const targetLanguage = String(body.targetLanguage || 'Urdu').trim() || 'Urdu';

    if (!text) {
      return res.status(400).json({ error: 'Please enter text to translate.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Text exceeds ${MAX_TEXT_LENGTH} character limit.` });
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
      return res.status(502).json({ error: 'Gemini returned an empty translation.' });
    }

    return res.status(200).json({
      translatedText,
      detectedSourceLanguage,
    });
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    return res.status(status).json({ error: message });
  }
}
