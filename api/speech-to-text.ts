import { GenerateContentResponse } from '@google/genai';
import {
  ApiRequest,
  ApiResponse,
  STT_MODEL,
  extractGeminiError,
  getGeminiClient,
  readRequestBody,
  sendJson,
} from './_config.js';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

interface SpeechToTextBody extends Record<string, unknown> {
  audioBase64?: string;
  mimeType?: string;
  sourceLanguage?: string;
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function normalizeAudioMimeType(rawMime: string): string {
  const base = String(rawMime || '').split(';')[0].trim().toLowerCase();
  if (!base || !base.startsWith('audio/')) {
    return 'audio/webm';
  }
  return base;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const body = await readRequestBody<SpeechToTextBody>(req);
    let rawBase64 = String(body.audioBase64 || '').trim();
    let mimeType = normalizeAudioMimeType(String(body.mimeType || 'audio/webm'));

    const dataUrlMatch = rawBase64.match(/^data:([^;]+)(?:;[^,]*)?;base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = normalizeAudioMimeType(dataUrlMatch[1] || mimeType);
      rawBase64 = dataUrlMatch[2];
    }

    if (!rawBase64) {
      return sendJson(res, 400, { error: 'Audio data is required.' });
    }

    if (estimateBase64Bytes(rawBase64) > MAX_AUDIO_BYTES) {
      return sendJson(res, 413, { error: 'Audio recording bahut bari hai. Chhoti recording karein.' });
    }

    const sourceLanguage = String(body.sourceLanguage || 'auto').trim() || 'auto';
    const isAuto =
      sourceLanguage.toLowerCase() === 'auto' ||
      sourceLanguage.toLowerCase().startsWith('auto');

    const ai = getGeminiClient();

    const prompt = isAuto
      ? 'Transcribe the spoken words in this audio accurately in their original spoken language. Output ONLY the transcribed text without quotes, labels, or notes. If no speech is audible, output an empty string.'
      : `Transcribe the spoken words in this audio accurately in ${sourceLanguage}. Output ONLY the transcribed text without quotes, labels, or notes. If no speech is audible, output an empty string.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: STT_MODEL,
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
    });

    const text = String(response.text || '').trim();
    if (!text) {
      return sendJson(res, 422, { error: 'Awaaz mein koi alfaz samajh nahi aaye. Dobara bolein.' });
    }

    return sendJson(res, 200, { text });
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    return sendJson(res, status, { error: message });
  }
}
