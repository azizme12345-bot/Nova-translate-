import { Router, Request, Response } from 'express';
import { TranslationService } from './translationService.ts';

export const apiRouter = Router();

// Helper for timeout handling (25 seconds max execution per AI call)
function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Translation request timed out on backend.')), timeoutMs)
    ),
  ]);
}

/**
 * Health check endpoint
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Nova Translate Secure Backend',
    version: '1.0.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get supported languages
 */
apiRouter.get('/languages', (req: Request, res: Response) => {
  try {
    const languages = TranslationService.getSupportedLanguages();
    res.json({ success: true, languages });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list languages' } });
  }
});

/**
 * Text translation endpoint
 */
apiRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage, tone } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'The "text" field is required and must not be empty.',
        },
      });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Input text exceeds the 5,000 character maximum limit.',
        },
      });
      return;
    }

    const result = await withTimeout(
      TranslationService.translate({
        text,
        sourceLanguage,
        targetLanguage: targetLanguage || 'English',
        tone,
      })
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    const statusCode = err.message?.includes('GEMINI_API_KEY') ? 503 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 503 ? 'API_KEY_REQUIRED' : 'TRANSLATION_FAILED',
        message: err.message || 'Translation service encountered an error.',
      },
    });
  }
});

/**
 * Language detection endpoint
 */
apiRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Text is required for language detection.',
        },
      });
      return;
    }

    const result = await withTimeout(TranslationService.detect(text));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'DETECTION_FAILED',
        message: err.message || 'Language detection failed.',
      },
    });
  }
});

/**
 * Camera / Image OCR + Translation endpoint
 */
apiRouter.post('/ocr-translate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, targetLanguage } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'imageBase64 is required for image OCR translation.',
        },
      });
      return;
    }

    const result = await withTimeout(
      TranslationService.ocrAndTranslate({
        imageBase64,
        mimeType,
        targetLanguage: targetLanguage || 'English',
      }),
      35000 // slightly longer timeout for multimodal vision
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'OCR_FAILED',
        message: err.message || 'Failed to process image OCR translation.',
      },
    });
  }
});

/**
 * Voice synthesis preparation endpoint
 */
apiRouter.post('/voice-synthesize', async (req: Request, res: Response) => {
  try {
    const { text, language, voiceName } = req.body || {};
    if (!text || typeof text !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Text is required for voice synthesis.',
        },
      });
      return;
    }

    const result = await withTimeout(
      TranslationService.synthesizeVoice({ text, language, voiceName }),
      15000
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'VOICE_SYNTHESIS_FAILED',
        message: err.message || 'Voice synthesis failed.',
      },
    });
  }
});

/**
 * Real Audio Text-To-Speech (TTS) streaming proxy endpoint
 * Crystal-clear native audio for Urdu, English, Hindi, Arabic, etc.
 */
apiRouter.get('/tts', async (req: Request, res: Response) => {
  try {
    const text = ((req.query.text as string) || '').trim();
    const lang = ((req.query.lang as string) || 'en').trim();

    if (!text) {
      res.status(400).send('Text parameter is required.');
      return;
    }

    let langCode = 'en';
    const lower = lang.toLowerCase();
    if (lower.includes('ur') || lower.includes('urdu')) langCode = 'ur';
    else if (lower.includes('hi') || lower.includes('hindi')) langCode = 'hi';
    else if (lower.includes('en') || lower.includes('english')) langCode = 'en';
    else if (lower.includes('ar') || lower.includes('arabic')) langCode = 'ar';
    else if (lower.includes('pa') || lower.includes('punjabi')) langCode = 'pa';
    else if (lower.includes('fr') || lower.includes('french')) langCode = 'fr';
    else if (lower.includes('de') || lower.includes('german')) langCode = 'de';
    else if (lower.includes('es') || lower.includes('spanish')) langCode = 'es';
    else if (lower.includes('tr') || lower.includes('turkish')) langCode = 'tr';
    else if (lower.includes('zh') || lower.includes('chinese')) langCode = 'zh-CN';
    else if (lower.includes('ja') || lower.includes('japanese')) langCode = 'ja';
    else if (lower.includes('ko') || lower.includes('korean')) langCode = 'ko';
    else if (lower.includes('ru') || lower.includes('russian')) langCode = 'ru';
    else if (lower.includes('it') || lower.includes('italian')) langCode = 'it';
    else langCode = lang.slice(0, 2);

    const queryText = text.slice(0, 300);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(queryText)}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;

    const fetchResponse = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!fetchResponse.ok) {
      res.status(fetchResponse.status).send('TTS service error.');
      return;
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    console.error('TTS Proxy Error:', err);
    res.status(500).send(err.message || 'TTS generation failed.');
  }
});

/**
 * Speech-To-Text AI transcription endpoint
 * Powered by Gemini Flash - handles any audio format & language (Urdu, English, Hindi, Arabic, etc.)
 */
apiRouter.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, languageHint } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'audioBase64 is required for speech transcription.',
        },
      });
      return;
    }

    const result = await withTimeout(
      TranslationService.transcribeAudio({
        audioBase64,
        mimeType: mimeType || 'audio/webm',
        languageHint,
      }),
      25000
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'TRANSCRIPTION_FAILED',
        message: err.message || 'Voice transcription failed.',
      },
    });
  }
});
