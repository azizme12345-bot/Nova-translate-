import { TranslationService } from '../server/translationService';
import { enforceSameOriginAndRateLimit } from './_security';

export default async function handler(req: any, res: any) {
  if (!enforceSameOriginAndRateLimit(req, res)) {
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

    const { text } = body || {};
    if (!text || typeof text !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Text is required.' } }));
      return;
    }

    const result = await TranslationService.detect(text);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'DETECTION_FAILED', message: err.message || 'Detection failed.' } }));
  }
}
