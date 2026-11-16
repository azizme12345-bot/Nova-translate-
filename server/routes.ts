import { Router, Request, Response } from 'express';
import { TranslationService, SUPPORTED_LANGUAGES } from './translationService.ts';

export const apiRouter = Router();

const ROUTE_LANG_TABLE: Record<string, string> = {
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

function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out on backend.')), timeoutMs)
    ),
  ]);
}

apiRouter.get('/health', (_req: Request, res: Response) => {
  const serverKeyConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
  res.json({
    ok: true,
    data: {
      status: 'ok',
      service: 'Nova Translator Pro Secure Backend',
      geminiConfigured: serverKeyConfigured,
      timestamp: new Date().toISOString(),
    },
  });
});

apiRouter.get('/languages', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      languages: SUPPORTED_LANGUAGES,
    },
  });
});

apiRouter.post('/test-key', async (_req: Request, res: Response) => {
  try {
    const testResult = await withTimeout(TranslationService.testApiKey(), 12000);
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
      TranslationService.translate({
        text,
        sourceLanguage,
        targetLanguage: targetLanguage || 'English',
        tone,
      }),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('GEMINI_API_KEY') ? 503 : 500;
    res.status(statusCode).json({
      ok: false,
      error: err.message || 'Translation service encountered an error.',
    });
  }
});

apiRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ ok: false, error: 'Text required' });
      return;
    }

    const result = await withTimeout(TranslationService.detect(text), 10000);
    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Detection failed' });
  }
});

apiRouter.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, languageHint, targetLanguage } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ ok: false, error: 'audioBase64 required' });
      return;
    }

    const result = await withTimeout(
      TranslationService.transcribeAudio({
        audioBase64,
        mimeType: mimeType || 'audio/webm',
        languageHint,
        targetLanguage,
      }),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    const msg = err?.message || 'Transcription failed';
    const isApiKeyError =
      msg.includes('GEMINI_API_KEY') ||
      msg.includes('API_KEY_INVALID') ||
      msg.includes('API key not valid') ||
      msg.includes('UNAUTHENTICATED') ||
      msg.includes('PERMISSION_DENIED');
    res.status(isApiKeyError ? 503 : 500).json({
      ok: false,
      error: isApiKeyError
        ? 'Valid GEMINI_API_KEY is required on the server for voice transcription.'
        : msg,
    });
  }
});

apiRouter.post('/ocr-translate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, sourceLanguage, targetLanguage } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ ok: false, error: 'imageBase64 required for OCR image translation.' });
      return;
    }

    const result = await withTimeout(
      TranslationService.ocrAndTranslate({
        imageBase64,
        mimeType: mimeType || 'image/jpeg',
        sourceLanguage,
        targetLanguage: targetLanguage || 'Urdu',
      }),
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

    const result = await withTimeout(
      TranslationService.chat({
        message: message || '',
        history,
        imageBase64,
        mimeType,
        targetLanguage,
      }),
      25000
    );

    res.json({ ok: true, data: result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'AI Chat failed.' });
  }
});

apiRouter.post('/voice-synthesize', async (_req: Request, res: Response) => {
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
    const lang = ((req.query.lang as string) || 'English').trim();
    const gender = req.query.gender === 'male' ? 'male' : 'female';

    if (!text) {
      res.status(400).send('Text query param is required');
      return;
    }

    const geminiAudio = await TranslationService.synthesizeVoice({
      text,
      language: lang,
      gender,
    });
    if (geminiAudio && geminiAudio.buffer.length > 0) {
      res.setHeader('Content-Type', geminiAudio.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(geminiAudio.buffer);
      return;
    }

    const firstWord = lang.split(/\s+/)[0] || '';
    const langCode = ROUTE_LANG_TABLE[firstWord] || 'en';
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;

    const upstreamRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
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
