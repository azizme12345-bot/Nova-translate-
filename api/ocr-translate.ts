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
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON request body.' } }));
        return;
      }
    }

    const { imageBase64, mimeType, sourceLanguage, targetLanguage } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'imageBase64 is required.' } }));
      return;
    }

    const result = await TranslationService.ocrAndTranslate({
      imageBase64,
      mimeType,
      sourceLanguage,
      targetLanguage: targetLanguage || 'English',
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    const msg = err?.message || 'OCR translation failed.';
    const isApiKeyError = msg.includes('GEMINI_API_KEY');
    res.statusCode = isApiKeyError ? 503 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: isApiKeyError ? 'API_KEY_REQUIRED' : 'OCR_FAILED',
          message: msg,
        },
      })
    );
  }
}
