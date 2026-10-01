import type { IncomingMessage, ServerResponse } from 'http';
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
    const statusCode = err.message?.includes('GEMINI_API_KEY') ? 503 : 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: statusCode === 503 ? 'API_KEY_REQUIRED' : 'TRANSLATION_FAILED',
          message: err.message || 'Translation failed on server.',
        },
      })
    );
  }
}
