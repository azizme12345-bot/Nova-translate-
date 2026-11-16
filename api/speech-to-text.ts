import { TranslationService } from '../server/translationService.ts';
import { enforceSameOriginAndRateLimit } from '../server/apiSecurity.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (!(await enforceSameOriginAndRateLimit(req, res, { maxRequestsPerMinute: 30 }))) {
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

    const { audioBase64, mimeType, languageHint, targetLanguage } = body || {};

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
      targetLanguage,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    const msg = err?.message || 'Voice transcription failed on server.';
    const isApiKeyError =
      msg.includes('GEMINI_API_KEY') ||
      msg.includes('API_KEY_INVALID') ||
      msg.includes('API key not valid') ||
      msg.includes('UNAUTHENTICATED') ||
      msg.includes('PERMISSION_DENIED');
    const statusCode = isApiKeyError ? 503 : 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: isApiKeyError ? 'API_KEY_REQUIRED' : 'TRANSCRIPTION_FAILED',
          message: isApiKeyError
            ? 'Valid GEMINI_API_KEY is required on the server for voice transcription.'
            : msg,
        },
      })
    );
  }
}
