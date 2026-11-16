const LANG_CODE_TABLE: Record<string, string> = {
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

function getLangCode(langName: string): string {
  const raw = (langName || '').trim();
  const firstWord = raw.split(/\s+/)[0] || '';
  return LANG_CODE_TABLE[firstWord] || 'en';
}

async function fallbackTranslateViaGtx(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  try {
    const firstSrcWord = (sourceLang || '').trim().split(/\s+/)[0];
    const isAuto = !sourceLang || firstSrcWord === 'Auto' || firstSrcWord === 'Detect' || sourceLang.toLowerCase() === 'auto';
    const sl = isAuto ? 'auto' : getLangCode(sourceLang);
    const tl = getLangCode(targetLang);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const joined = data[0].map((part: any) => (Array.isArray(part) ? part[0] : '')).join('').trim();
      return joined || null;
    }
  } catch {}
  return null;
}

const translateIpBucket = new Map<string, { count: number; resetTime: number }>();

function checkTranslateAccess(req: any, res: any): boolean {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');

  const reqHost = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim().toLowerCase();
  const originHeader = req.headers?.origin;
  const refererHeader = req.headers?.referer;
  const secFetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();

  const parseHost = (val: any) => {
    try {
      return val ? new URL(Array.isArray(val) ? val[0] : val).host.toLowerCase() : '';
    } catch {
      return '';
    }
  };

  if (secFetchSite === 'cross-site') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-site requests are not allowed.' } }));
    return false;
  }

  if (originHeader) {
    const originHost = parseHost(originHeader);
    if (!reqHost || !originHost || originHost !== reqHost) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } }));
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', Array.isArray(originHeader) ? originHeader[0] : originHeader);
  } else if (refererHeader) {
    const refHost = parseHost(refererHeader);
    if (reqHost && refHost && refHost !== reqHost) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } }));
      return false;
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.socket?.remoteAddress || 'anonymous';
  const now = Date.now();
  const max = 30;
  let entry = translateIpBucket.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + 60 * 1000 };
    translateIpBucket.set(ip, entry);
  } else {
    entry.count += 1;
  }

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

  if (entry.count > max) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait a minute and try again.' } }));
    return false;
  }

  return true;
}

export default async function handler(req: any, res: any) {
  if (!checkTranslateAccess(req, res)) {
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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            code: 'API_KEY_REQUIRED',
            message: 'GEMINI_API_KEY is missing or not configured in environment variables.',
          },
        })
      );
      return;
    }

    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const targetLang = (targetLanguage || 'English').trim();
    const sourceLang = (sourceLanguage || 'Auto Detect').trim();
    const activeTone = tone || 'natural';

    const firstSrcWord = sourceLang.split(/\s+/)[0];
    const isAutoDetect = !sourceLang || firstSrcWord === 'Auto' || firstSrcWord === 'Detect' || sourceLang.toLowerCase() === 'auto';

    const systemInstruction = `You are LAFZ Translation — an ultra-fast professional translation assistant.
- Translate text accurately between languages.
- Maintain context, nuance, and meaning.
- Provide natural, fluent translations.
- Tone: ${activeTone}.
- Return valid JSON matching the schema.`;

    const prompt = `Translate this text from ${isAutoDetect ? 'detected source language' : sourceLang} to ${targetLang}:
"""
${text}
"""`;

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    let response: any = null;
    let lastError: any = null;

    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sourceLanguage: { type: Type.STRING },
                targetLanguage: { type: Type.STRING },
                translatedText: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                isRTL: { type: Type.BOOLEAN },
              },
              required: ['sourceLanguage', 'targetLanguage', 'translatedText', 'confidence'],
            },
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    let translatedText = '';
    let detectedSource = isAutoDetect ? 'Auto-detected' : sourceLang;
    let confidence: number | null = null;
    let provider: 'gemini' | 'google' = 'gemini';
    let isRTL = false;

    if (response && response.text) {
      try {
        const parsed = JSON.parse(response.text);
        translatedText = (parsed.translatedText || '').trim();
        if (parsed.sourceLanguage) detectedSource = parsed.sourceLanguage;
        if (typeof parsed.confidence === 'number') confidence = parsed.confidence;
        if (typeof parsed.isRTL === 'boolean') isRTL = parsed.isRTL;
      } catch {
        const clean = response.text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(clean);
        translatedText = (parsed.translatedText || '').trim();
        if (parsed.sourceLanguage) detectedSource = parsed.sourceLanguage;
        if (typeof parsed.confidence === 'number') confidence = parsed.confidence;
      }
    }

    if (!translatedText) {
      const gtxOut = await fallbackTranslateViaGtx(text, sourceLang, targetLang);
      if (gtxOut) {
        translatedText = gtxOut;
        confidence = null;
        provider = 'google';
      }
    }

    if (!translatedText) {
      throw new Error(lastError?.message || 'Translation failed on server.');
    }

    const isTargetRTL = isRTL || /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(translatedText);

    const result = {
      sourceLanguage: detectedSource,
      targetLanguage: targetLang,
      originalText: text,
      translatedText,
      confidence,
      provider,
      alternatives: [],
      details: '',
      direction: isTargetRTL ? 'rtl' : 'ltr',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (err: any) {
    const isApiKeyError = err.message?.includes('GEMINI_API_KEY') || err.message?.includes('API_KEY');
    const statusCode = isApiKeyError ? 503 : 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: isApiKeyError ? 'API_KEY_REQUIRED' : 'TRANSLATION_FAILED',
          message: err.message || 'Translation failed on server.',
        },
      })
    );
  }
}
