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

    const lower = lang.toLowerCase();
    let langCode = 'en';
    if (lower.includes('ur') || lower.includes('urdu')) langCode = 'ur';
    else if (lower.includes('ar') || lower.includes('arabic')) langCode = 'ar';
    else if (lower.includes('hi') || lower.includes('hindi')) langCode = 'hi';
    else if (lower.includes('pa') || lower.includes('punjabi')) langCode = 'pa';
    else if (lower.includes('fr') || lower.includes('french')) langCode = 'fr';
    else if (lower.includes('de') || lower.includes('german')) langCode = 'de';
    else if (lower.includes('es') || lower.includes('spanish')) langCode = 'es';
    else if (lower.includes('tr') || lower.includes('turkish')) langCode = 'tr';
    else if (lower.includes('zh') || lower.includes('chinese')) langCode = 'zh-CN';
    else if (lower.includes('ja') || lower.includes('japanese')) langCode = 'ja';
    else if (lower.includes('ko') || lower.includes('korean')) langCode = 'ko';
    else if (lower.includes('ru') || lower.includes('russian')) langCode = 'ru';
    else if (lower.includes('fa') || lower.includes('persian')) langCode = 'fa';
    else if (lower.includes('it') || lower.includes('italian')) langCode = 'it';
    else if (lower.includes('pt') || lower.includes('portuguese')) langCode = 'pt';
    else if (lower.includes('bn') || lower.includes('bengali')) langCode = 'bn';
    else if (lower.includes('id') || lower.includes('indonesian')) langCode = 'id';
    else if (lower.includes('nl') || lower.includes('dutch')) langCode = 'nl';
    else if (lower.includes('ps') || lower.includes('pashto')) langCode = 'ps';
    else if (lower.includes('sd') || lower.includes('sindhi')) langCode = 'sd';
    else langCode = lang.slice(0, 2);

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
