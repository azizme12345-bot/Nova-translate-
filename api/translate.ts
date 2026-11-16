import { enforceSameOriginAndRateLimit } from '../server/apiSecurity.ts';
import { TranslationService } from '../server/translationService.ts';

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

    const { text, sourceLanguage, targetLanguage, tone } = body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Text is required.' } }));
      return;
    }

    if (text.length > 5000) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Text exceeds 5000 chars.' } }));
      return;
    }

    const result = await TranslationService.translate({
      text,
      sourceLanguage,
      targetLanguage: targetLanguage || 'English',
      tone,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    const msg = err?.message || 'Translation failed on server.';
    const isApiKeyError = msg.includes('GEMINI_API_KEY');
    res.statusCode = isApiKeyError ? 503 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: isApiKeyError ? 'API_KEY_REQUIRED' : 'TRANSLATION_FAILED',
          message: msg,
        },
      })
    );
  }
}
