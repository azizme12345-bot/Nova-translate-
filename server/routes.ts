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
