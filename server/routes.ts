import { Router, Request, Response } from 'express';
import { TranslationService, SUPPORTED_LANGUAGES } from './translationService.ts';

export const apiRouter = Router();

function getApiKeyFromReq(req: Request): string | undefined {
  const headerKey = req.headers['x-gemini-api-key'] || req.headers['x-api-key'];
  if (headerKey && typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  const bodyKey = req.body?.apiKey;
  if (bodyKey && typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim();
  }
  return undefined;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out on backend.')), timeoutMs)
    ),
  ]);
}

apiRouter.get('/health', (req: Request, res: Response) => {
  const customKey = getApiKeyFromReq(req);
  const serverKeyConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
  res.json({
    ok: true,
    data: {
      status: 'ok',
      service: 'Nova Translator Pro Secure Backend',
      geminiConfigured: !!customKey || serverKeyConfigured,
      hasCustomApiKey: !!customKey,
      timestamp: new Date().toISOString(),
    },
  });
});

apiRouter.get('/languages', (req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      languages: SUPPORTED_LANGUAGES,
    },
  });
});

apiRouter.post('/test-key', async (req: Request, res: Response) => {
  try {
    const key = getApiKeyFromReq(req);
    if (!key) {
      res.status(400).json({
        ok: false,
        error: 'API key is required for testing.',
      });
      return;
    }

    const testResult = await withTimeout(TranslationService.testApiKey(key), 12000);
    res.json({
      ok: testResult.valid,
      data: testResult,
      ...(testResult.valid ? {} : { error: testResult.message }),
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message || 'API key test failed.',
    });
  }
});

apiRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage, tone } = req.body || {};
    const customApiKey = getApiKeyFromReq(req);

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({
        ok: false,
        error: 'The "text" field is required and must not be empty.',
      });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({
        ok: false,
        error: 'Input text exceeds the 5,000 character maximum limit.',
      });
      return;
    }

    const result = await withTimeout(
      TranslationService.translate(
        {
          text,
          sourceLanguage,
          targetLanguage: targetLanguage || 'English',
          tone,
        },
        customApiKey
      ),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('API key') ? 401 : 500;
    res.status(statusCode).json({
      ok: false,
      error: err.message || 'Translation service encountered an error.',
    });
  }
});

apiRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    const customApiKey = getApiKeyFromReq(req);
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ ok: false, error: 'Text required' });
      return;
    }

    const result = await withTimeout(TranslationService.detect(text, customApiKey), 10000);
    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Detection failed' });
  }
});

apiRouter.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, languageHint } = req.body || {};
    const customApiKey = getApiKeyFromReq(req);

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ ok: false, error: 'audioBase64 required' });
      return;
    }

    const result = await withTimeout(
      TranslationService.transcribeAudio(
        {
          audioBase64,
          mimeType: mimeType || 'audio/webm',
          languageHint,
        },
        customApiKey
      ),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Transcription failed' });
  }
});

apiRouter.post('/ocr-translate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, sourceLanguage, targetLanguage } = req.body || {};
    const customApiKey = getApiKeyFromReq(req);

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ ok: false, error: 'imageBase64 required for OCR image translation.' });
      return;
    }

    const result = await withTimeout(
      TranslationService.ocrAndTranslate(
        {
          imageBase64,
          mimeType: mimeType || 'image/jpeg',
          sourceLanguage,
          targetLanguage: targetLanguage || 'Urdu',
        },
        customApiKey
      ),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'OCR Image translation failed.' });
  }
});

apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, imageBase64, mimeType, targetLanguage } = req.body || {};
    const customApiKey = getApiKeyFromReq(req);

    const result = await withTimeout(
      TranslationService.chat(
        {
          message: message || '',
          history,
          imageBase64,
          mimeType,
          targetLanguage,
        },
        customApiKey
      ),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'AI Chat failed.' });
  }
});

apiRouter.post('/voice-synthesize', async (req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      fallbackToBrowserTTS: true,
    },
  });
});

apiRouter.get('/tts', async (req: Request, res: Response) => {
  try {
    const text = ((req.query.text as string) || '').slice(0, 500).trim();
    const lang = ((req.query.lang as string) || 'en').toLowerCase();

    if (!text) {
      res.status(400).send('Text query param is required');
      return;
    }

    let langCode = 'en';
    if (lang.includes('ur') || lang.includes('urdu')) langCode = 'ur';
    else if (lang.includes('ar') || lang.includes('arabic')) langCode = 'ar';
    else if (lang.includes('hi') || lang.includes('hindi')) langCode = 'hi';
    else if (lang.includes('ja') || lang.includes('japan')) langCode = 'ja';
    else if (lang.includes('pa') || lang.includes('punjabi')) langCode = 'pa';
    else if (lang.includes('es') || lang.includes('spanish')) langCode = 'es';
    else if (lang.includes('fr') || lang.includes('french')) langCode = 'fr';
    else if (lang.includes('de') || lang.includes('german')) langCode = 'de';

    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`;

    const upstreamRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!upstreamRes.ok) {
      res.status(502).send('Upstream TTS service unavailable');
      return;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send('TTS processing failed: ' + (err.message || 'unknown error'));
  }
});
