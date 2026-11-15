export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const text = (req.query?.text || req.body?.text || '').toString();
    const lang = (req.query?.lang || req.body?.lang || 'English').toString();

    if (!text || !text.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: 'Text query parameter is required.' } }));
      return;
    }

    const firstWord = lang.trim().split(/\s+/)[0] || '';
    const langTable: Record<string, string> = {
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
    const langCode = langTable[firstWord] || 'en';

    const queryText = text.slice(0, 180);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(queryText)}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;

    const fetchResponse = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!fetchResponse.ok) {
      res.statusCode = fetchResponse.status;
      res.end('TTS service error.');
      return;
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buffer);
  } catch (err: any) {
    res.statusCode = 500;
    res.end(err.message || 'TTS generation failed.');
  }
}
