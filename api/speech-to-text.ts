import { TranslationService } from '../server/translationService.ts';

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is allowed.' } }));
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use raw
      }
    }

    const { audioBase64, mimeType, languageHint } = body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            code: 'INVALID_INPUT',
            message: 'audioBase64 is required for speech transcription.',
          },
        })
      );
      return;
    }

    const result = await TranslationService.transcribeAudio({
      audioBase64,
      mimeType: mimeType || 'audio/webm',
      languageHint,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    const isApiKeyError = err.message?.includes('GEMINI_API_KEY');
    const statusCode = isApiKeyError ? 503 : 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: isApiKeyError ? 'API_KEY_REQUIRED' : 'TRANSCRIPTION_FAILED',
          message: err.message || 'Voice transcription failed on server.',
        },
      })
    );
  }
}
