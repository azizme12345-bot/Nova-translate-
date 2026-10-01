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

/**
 * Safely parses response and handles HTTP error codes and non-JSON payloads gracefully.
 */
async function handleApiResponse<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Server returned an unparseable response (HTTP ${res.status}).`);
    }

    if (!res.ok || !json.success) {
      throw new Error(json?.error?.message || `Request failed with HTTP status ${res.status}.`);
    }

    return json.data !== undefined ? json.data : json;
  }

  // Handle non-JSON responses (e.g. HTML 413, 502, 504 error pages from proxy/gateways)
  const rawText = await res.text();
  if (res.status === 413 || rawText.includes('Request Entity Too Large') || rawText.includes('Payload Too Large')) {
    throw new Error('The uploaded image or text exceeds the maximum allowed upload size. Please use a smaller image.');
  }

  if (!res.ok) {
    throw new Error(rawText.slice(0, 150) || `Server error (HTTP ${res.status})`);
  }

  throw new Error(`Unexpected non-JSON response from server (HTTP ${res.status})`);
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

    return await handleApiResponse<TranslationResult>(res);
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

    return await handleApiResponse<DetectedLanguageResult>(res);
  }

  /**
   * Request supported language list from backend
   */
  static async getSupportedLanguages(): Promise<LanguageOption[]> {
    const res = await fetch('/api/languages');
    const json = await handleApiResponse<{ languages: LanguageOption[] }>(res);
    return json.languages || [];
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

    return await handleApiResponse<OCRResult>(res);
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
      const data = await handleApiResponse<{ audioBase64?: string; fallbackToBrowserTTS: boolean }>(res);
      return data || { fallbackToBrowserTTS: true };
    } catch {
      // Fallback seamlessly to client-side SpeechSynthesis
      return { fallbackToBrowserTTS: true };
    }
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
