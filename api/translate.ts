import {
  ApiRequest,
  ApiResponse,
  TEXT_MODEL,
  THINKING_LEVEL,
  extractGeminiError,
  getGeminiClient,
  readRequestBody,
  sendJson,
} from './_config.js';

const MAX_TEXT_LENGTH = 5000;

interface TranslateBody extends Record<string, unknown> {
  text?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

function writeSseEvent(res: ApiResponse, payload: unknown): void {
  if (res.writableEnded || typeof res.write !== 'function') return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  let streamStarted = false;
  let clientClosed = false;

  if (res && typeof res.on === 'function') {
    res.on('close', () => {
      if (!res.writableFinished) {
        clientClosed = true;
      }
    });
  }

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
      ? `Detect the source language and translate the following text accurately into ${targetLanguage}. Output ONLY the translated text.\n\nText:\n${text}`
      : `Translate the following text accurately from ${sourceLanguage} into ${targetLanguage}. Output ONLY the translated text.\n\nText:\n${text}`;

    const stream = await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a fast, accurate translator. Preserve the meaning, tone, punctuation, and line breaks. Output ONLY the translated text without quotes, notes, or explanations.',
        thinkingConfig: { thinkingLevel: THINKING_LEVEL },
      },
    });

    if (typeof res.writeHead === 'function') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
    }
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    streamStarted = true;

    let fullText = '';

    for await (const chunk of stream) {
      if (clientClosed || res.writableEnded) {
        break;
      }
      const piece = chunk && typeof chunk.text === 'string' ? chunk.text : '';
      if (piece) {
        fullText += piece;
        writeSseEvent(res, { chunk: piece });
      }
    }

    if (clientClosed || res.writableEnded) {
      if (!res.writableEnded && typeof res.end === 'function') {
        res.end();
      }
      return;
    }

    const finalTranslation = fullText.trim();
    if (!finalTranslation) {
      writeSseEvent(res, { error: 'Gemini returned an empty translation.' });
    } else {
      writeSseEvent(res, {
        done: true,
        translatedText: finalTranslation,
        detectedSourceLanguage: isAuto ? 'Auto-detected' : sourceLanguage,
      });
    }

    if (typeof res.end === 'function') {
      res.end();
    }
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    if (streamStarted || res.headersSent) {
      writeSseEvent(res, { error: message });
      if (!res.writableEnded && typeof res.end === 'function') {
        res.end();
      }
      return;
    }
    return sendJson(res, status, { error: message });
  }
}
