import { TranslationService } from '../server/translationService';
import { enforceSameOriginAndRateLimit } from '../server/apiSecurity';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (!enforceSameOriginAndRateLimit(req, res, { maxRequestsPerMinute: 30 })) {
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
      try { body = JSON.parse(body); } catch {}
    }

    const { imageBase64, mimeType, sourceLanguage, targetLanguage } = body || {};
    if (!imageBase64) {
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
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'OCR_FAILED', message: err.message || 'OCR translation failed.' } }));
  }
}
