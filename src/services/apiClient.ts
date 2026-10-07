/**
 * Secure Backend API Client with Instant Multi-Tier Caching & Nova Translate Fields
 */

import { TranslationCache } from './cacheService.ts';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  confidence?: number;
  alternatives?: string[];
  details?: string;
  direction: 'ltr' | 'rtl';
  timestamp: string;
  fromCache?: boolean;
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
  confidence?: number;
  details?: string;
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
 * Safely parses response and handles HTTP error codes gracefully.
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

  const rawText = await res.text();
  if (res.status === 413 || rawText.includes('Request Entity Too Large') || rawText.includes('Payload Too Large')) {
    throw new Error('The uploaded file or payload exceeds the allowed server limit. Please use a smaller file.');
  }

  if (!res.ok) {
    throw new Error(rawText.slice(0, 150) || `Server error (HTTP ${res.status})`);
  }

  throw new Error(`Unexpected response from server (HTTP ${res.status})`);
}

export class ApiClient {
  /**
   * Request text translation with instant 0ms client-side cache & ultra-fast backend
   */
  static async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    tone: 'natural' | 'formal' | 'casual' = 'natural'
  ): Promise<TranslationResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Please enter text to translate.');
    }

    // 1. Instant Client-Side Cache Lookup (0ms response)
    const cached = TranslationCache.get(cleanText, sourceLanguage, targetLanguage);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      };
    }

    // 2. Fast Backend Call
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanText,
        sourceLanguage,
        targetLanguage,
        tone,
      }),
    });

    const result = await handleApiResponse<TranslationResult>(res);

    // Save to client cache
    TranslationCache.set(cleanText, sourceLanguage, targetLanguage, result);

    return result;
  }

  /**
   * Request automatic language detection from backend
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

  /**
   * Transcribe recorded audio with fast compact payload
   */
  static async transcribeAudio(
    audioBase64: string,
    mimeType = 'audio/wav',
    languageHint?: string
  ): Promise<{ text: string }> {
    const res = await fetch('/api/speech-to-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64,
        mimeType,
        languageHint,
      }),
    });

    return await handleApiResponse<{ text: string }>(res);
  }

  /**
   * Get direct audio streaming URL for native pronunciation
   */
  static getTtsAudioUrl(text: string, language: string): string {
    return `/api/tts?text=${encodeURIComponent(text.trim().slice(0, 300))}&lang=${encodeURIComponent(language)}`;
  }
}
