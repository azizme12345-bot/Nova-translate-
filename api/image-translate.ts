import { GenerateContentResponse, ThinkingLevel, Type } from '@google/genai';
import {
  ApiRequest,
  ApiResponse,
  IMAGE_MODEL,
  extractGeminiError,
  getGeminiClient,
  parseModelJson,
  parseRequestBody,
} from './_config';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

interface ImageTranslateBody extends Record<string, unknown> {
  imageBase64?: string;
  mimeType?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

interface ImageModelOutput {
  extractedText: string;
  translatedText: string;
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody<ImageTranslateBody>(req.body);
    let rawBase64 = String(body.imageBase64 || '').trim();
    let mimeType = String(body.mimeType || 'image/jpeg').trim() || 'image/jpeg';

    const dataUrlMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1] || mimeType;
      rawBase64 = dataUrlMatch[2];
    }

    if (!rawBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    if (estimateBase64Bytes(rawBase64) > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Photo bahut bari hai. Chhoti photo chunein.' });
    }

    const sourceLanguage = String(body.sourceLanguage || 'auto').trim() || 'auto';
    const targetLanguage = String(body.targetLanguage || 'Urdu').trim() || 'Urdu';

    const ai = getGeminiClient();

    const prompt =
      `Read all visible text in this image carefully (source language hint: ${sourceLanguage}). ` +
      `Return two fields in JSON: ` +
      `1) extractedText: the exact text visible in the image (empty string if no readable text is present). ` +
      `2) translatedText: the accurate translation of that extracted text into ${targetLanguage} (empty string if no readable text is present).`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: rawBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction:
          'You perform accurate OCR and translation from images. Never invent or guess unseen text. Return ONLY valid JSON.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: 'Exact readable text extracted from the image.',
            },
            translatedText: {
              type: Type.STRING,
              description: 'Accurate translation of the extracted text in the target language.',
            },
          },
          required: ['extractedText', 'translatedText'],
        },
      },
    });

    const parsed = parseModelJson<ImageModelOutput>(response.text);
    const extractedText = String(parsed.extractedText || '').trim();
    const translatedText = String(parsed.translatedText || '').trim();

    if (!extractedText) {
      return res.status(422).json({ error: 'Is photo mein koi likhai nazar nahi aayi.' });
    }

    if (!translatedText) {
      return res.status(502).json({ error: 'Gemini returned an empty image translation.' });
    }

    return res.status(200).json({
      extractedText,
      translatedText,
    });
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    return res.status(status).json({ error: message });
  }
}
