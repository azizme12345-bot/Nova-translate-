import { TranslationService } from '../server/translationService.ts';
import { enforceSameOriginAndRateLimit } from '../server/apiSecurity.ts';

const TTS_LANG_TABLE: Record<string, string> = {
  English: 'en',
  Urdu: 'ur',
  Arabic: 'ar',
  Punjabi: 'pa',
  Hindi: 'hi',
  Japanese: 'ja',
  Chinese: 'zh-CN',
  French: 'fr',
  German: 'de',
  Spanish: 'es',
  Portuguese: 'pt',
  Turkish: 'tr',
  Russian: 'ru',
  Persian: 'fa',
  Korean: 'ko',
  Italian: 'it',
  Bengali: 'bn',
  Indonesian: 'id',
  Dutch: 'nl',
  Pashto: 'ps',
  Sindhi: 'sd',
};

export default async function handler(req: any, res: any) {
  if (!(await enforceSameOriginAndRateLimit(req, res, { maxRequestsPerMinute: 60 }))) {
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is allowed.' } }));
    return;
  }

  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const text = (req.query?.text || urlObj.searchParams.get('text') || '').slice(0, 500).trim();
    const lang = (req.query?.lang || urlObj.searchParams.get('lang') || 'English').trim();
    const gender = (req.query?.gender || urlObj.searchParams.get('gender')) === 'male' ? 'male' : 'female';

    if (!text) {
      res.statusCode = 400;
      res.end('Text query param is required');
      return;
    }

    const geminiAudio = await TranslationService.synthesizeVoice({
      text,
      language: lang,
      gender,
    });
    if (geminiAudio && geminiAudio.buffer.length > 0) {
      res.statusCode = 200;
      res.setHeader('Content-Type', geminiAudio.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(geminiAudio.buffer);
      return;
    }

    const firstWord = lang.split(/\s+/)[0] || '';
    const langCode = TTS_LANG_TABLE[firstWord] || 'en';
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;

    const upstreamRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      res.statusCode = 502;
      res.end('Upstream TTS service unavailable');
      return;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buffer);
  } catch (err: any) {
    res.statusCode = 500;
    res.end('TTS processing failed: ' + (err?.message || 'unknown error'));
  }
}
