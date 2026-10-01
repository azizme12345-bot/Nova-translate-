/**
 * Secure Backend API Client
 * 
 * NOTE: This frontend client ONLY communicates with our own backend server routes (/api/*).
 * It contains NO API keys, NO external AI provider URLs, and NO secrets.
 */

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  direction: 'ltr' | 'rtl';
  timestamp: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  label: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
}

export interface OCRResult {
  extractedText: string;
  translatedText: string;
  detectedSourceLanguage: string;
  targetLanguage: string;
  timestamp: string;
}

export interface DetectedLanguageResult {
  text: string;
  detectedLanguage: string;
  languageCode: string;
  confidence: number;
  direction: 'ltr' | 'rtl';
}

export class ApiClient {
  /**
   * Request text translation from our secure backend endpoint
   */
  static async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLanguage,
        targetLanguage,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || `Translation failed with status ${res.status}`);
    }

    return json.data;
  }

  /**
   * Request automatic language detection from our backend
   */
  static async detectLanguage(text: string): Promise<DetectedLanguageResult> {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Language detection failed');
    }

    return json.data;
  }

  /**
   * Request supported language list from backend
   */
  static async getSupportedLanguages(): Promise<LanguageOption[]> {
    const res = await fetch('/api/languages');
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error('Failed to retrieve supported languages');
    }
    return json.languages;
  }

  /**
   * Send image to backend for OCR extraction and translation
   */
  static async ocrAndTranslate(
    imageBase64: string,
    targetLanguage: string,
    mimeType = 'image/jpeg'
  ): Promise<OCRResult> {
    const res = await fetch('/api/ocr-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        targetLanguage,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'OCR translation failed');
    }

    return json.data;
  }

  /**
   * Backend voice synthesis preparation
   */
  static async prepareVoiceSynthesis(text: string, language?: string): Promise<{ audioBase64?: string; fallbackToBrowserTTS: boolean }> {
    try {
      const res = await fetch('/api/voice-synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.data;
      }
    } catch {
      // Fallback seamlessly to client-side SpeechSynthesis
    }
    return { fallbackToBrowserTTS: true };
  }

  /**
   * Check backend health and configuration
   */
  static async checkHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return { status: 'offline', geminiConfigured: false };
  }
}
