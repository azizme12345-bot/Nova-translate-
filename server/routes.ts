import { Router, Request, Response } from 'express';
import { TranslationService } from './translationService.ts';

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
      timestamp: new Date().toISOString(),
    },
  });
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
