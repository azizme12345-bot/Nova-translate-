/**
 * Secure Backend API Client with Instant Multi-Tier Caching & Custom Gemini API Key Management
 */

import { TranslationCache } from './cacheService.ts';
import { OfflineEngine } from './offlineEngine.ts';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  confidence?: number;
  alternatives?: string[];
  details?: string;
  pronunciation?: string;
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

export interface ApiKeyTestResult {
  valid: boolean;
  model: string;
  message: string;
}

const API_KEY_STORAGE_KEY = 'novaGeminiApiKey';

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

    if (!res.ok || (json.success === false && json.data === undefined)) {
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
   * Get active user custom API key from localStorage
   */
  static getCustomApiKey(): string {
    try {
      return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  /**
   * Save user custom API key to localStorage
   */
  static setCustomApiKey(key: string): void {
    try {
      const clean = key.trim();
      if (clean) {
        localStorage.setItem(API_KEY_STORAGE_KEY, clean);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Remove custom API key
   */
  static clearCustomApiKey(): void {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Build default headers including custom API key if present
   */
  private static getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    const customKey = ApiClient.getCustomApiKey();
    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }
    return headers;
  }

  /**
   * Test a custom Gemini API Key live
   */
  static async testApiKey(keyToTest?: string): Promise<ApiKeyTestResult> {
    const key = (keyToTest !== undefined ? keyToTest : ApiClient.getCustomApiKey()).trim();
    const res = await fetch('/api/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-gemini-api-key': key } : {}),
      },
      body: JSON.stringify({ apiKey: key }),
    });

    return await handleApiResponse<ApiKeyTestResult>(res);
  }

  /**
   * Request text translation with instant 0ms client-side cache & ultra-fast backend
   */
  static async translateText(
    textOrOptions: string | { text: string; sourceLanguage?: string; targetLanguage?: string; tone?: 'natural' | 'formal' | 'casual'; model?: string },
    sourceLanguage?: string,
    targetLanguage?: string,
    tone: 'natural' | 'formal' | 'casual' = 'natural',
    model?: string
  ): Promise<TranslationResult> {
    let cleanText = '';
    let srcLang = sourceLanguage || 'Auto Detect';
    let tgtLang = targetLanguage || 'Urdu';
    let tTone = tone;
    let tModel = model;

    if (typeof textOrOptions === 'object' && textOrOptions !== null) {
      cleanText = (textOrOptions.text || '').trim();
      srcLang = textOrOptions.sourceLanguage || srcLang;
      tgtLang = textOrOptions.targetLanguage || tgtLang;
      tTone = textOrOptions.tone || tTone;
      tModel = textOrOptions.model || tModel;
    } else {
      cleanText = (textOrOptions || '').trim();
    }

    if (!cleanText) {
      throw new Error('Please enter text to translate.');
    }

    // 1. Instant Client-Side Cache Lookup (0ms response)
    const cached = TranslationCache.get(cleanText, srcLang, tgtLang);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      };
    }

    // Check if device is offline or force offline mode is set
    if (!OfflineEngine.isOnline()) {
      return OfflineEngine.translateOffline(cleanText, srcLang, tgtLang);
    }

    try {
      // 2. Fast Backend Call
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: ApiClient.getHeaders(),
        body: JSON.stringify({
          text: cleanText,
          sourceLanguage: srcLang,
          targetLanguage: tgtLang,
          tone: tTone,
          model: tModel,
        }),
      });

      const result = await handleApiResponse<TranslationResult>(res);

      // Save to client cache
      TranslationCache.set(cleanText, srcLang, tgtLang, result);

      return result;
    } catch (err: any) {
      console.warn('Backend request failed, falling back to Offline Engine:', err);
      return OfflineEngine.translateOffline(cleanText, srcLang, tgtLang);
    }
  }

  /**
   * Request automatic language detection from backend
   */
  static async detectLanguage(text: string): Promise<DetectedLanguageResult> {
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: ApiClient.getHeaders(),
        body: JSON.stringify({ text }),
      });

      return await handleApiResponse<DetectedLanguageResult>(res);
    } catch {
      return {
        text,
        detectedLanguage: 'English',
        languageCode: 'en',
        confidence: 0.95,
        direction: 'ltr',
      };
    }
  }

  /**
   * Request supported language list from backend
   */
  static async getSupportedLanguages(): Promise<LanguageOption[]> {
    const res = await fetch('/api/languages', {
      headers: ApiClient.getHeaders(),
    });
    const json = await handleApiResponse<{ languages: LanguageOption[] }>(res);
    return json.languages || [];
  }

  /**
   * Send image to backend for OCR extraction and translation
   */
  static async ocrAndTranslate(
    imageOrOptions: string | { imageBase64: string; sourceLanguage?: string; targetLanguage?: string; mimeType?: string; model?: string },
    targetLanguage?: string,
    mimeType = 'image/jpeg',
    model?: string,
    sourceLanguage?: string
  ): Promise<OCRResult> {
    let base64 = '';
    let tgtLang = targetLanguage || 'Urdu';
    let srcLang = sourceLanguage;
    let mime = mimeType;
    let mod = model;

    if (typeof imageOrOptions === 'object' && imageOrOptions !== null) {
      base64 = imageOrOptions.imageBase64 || '';
      tgtLang = imageOrOptions.targetLanguage || tgtLang;
      srcLang = imageOrOptions.sourceLanguage || srcLang;
      mime = imageOrOptions.mimeType || mime;
      mod = imageOrOptions.model || mod;
    } else {
      base64 = imageOrOptions || '';
    }

    const res = await fetch('/api/ocr-translate', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: mime,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        model: mod,
      }),
    });

    return await handleApiResponse<OCRResult>(res);
  }

  /**
   * AI Chat & Multimodal Photo Analysis
   */
  static async chatWithAI(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    imageBase64?: string;
    mimeType?: string;
    targetLanguage?: string;
    model?: string;
  }): Promise<{ reply: string; timestamp: string }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: ApiClient.getHeaders(),
      body: JSON.stringify(params),
    });

    return await handleApiResponse<{ reply: string; timestamp: string }>(res);
  }

  /**
   * Backend voice synthesis preparation (supports Male / Female AI Voice)
   */
  static async prepareVoiceSynthesis(
    text: string,
    language?: string,
    gender: 'male' | 'female' = 'female'
  ): Promise<{ audioBase64?: string; mimeType?: string; fallbackToBrowserTTS: boolean }> {
    try {
      const res = await fetch('/api/voice-synthesize', {
        method: 'POST',
        headers: ApiClient.getHeaders(),
        body: JSON.stringify({ text, language, gender }),
      });
      const data = await handleApiResponse<{ audioBase64?: string; mimeType?: string; fallbackToBrowserTTS: boolean }>(res);
      return data || { fallbackToBrowserTTS: true };
    } catch {
      return { fallbackToBrowserTTS: true };
    }
  }

  /**
   * Check backend health and configuration
   */
  static async checkHealth(): Promise<{ status: string; geminiConfigured: boolean; hasCustomApiKey?: boolean }> {
    try {
      const res = await fetch('/api/health', {
        headers: ApiClient.getHeaders(),
      });
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
    audioOrOptions: string | { audioBase64: string; mimeType?: string; sourceLanguage?: string; targetLanguage?: string; languageHint?: string; model?: string },
    mimeType = 'audio/wav',
    languageHint?: string,
    model?: string
  ): Promise<{ text: string; transcript: string; translatedText?: string }> {
    let base64 = '';
    let mime = mimeType;
    let hint = languageHint;
    let mod = model;
    let tgtLang = '';

    if (typeof audioOrOptions === 'object' && audioOrOptions !== null) {
      base64 = audioOrOptions.audioBase64 || '';
      mime = audioOrOptions.mimeType || mime;
      hint = audioOrOptions.sourceLanguage || audioOrOptions.languageHint || hint;
      tgtLang = audioOrOptions.targetLanguage || '';
      mod = audioOrOptions.model || mod;
    } else {
      base64 = audioOrOptions || '';
    }

    try {
      const res = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: ApiClient.getHeaders(),
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: mime,
          languageHint: hint,
          targetLanguage: tgtLang,
          model: mod,
        }),
      });

      const raw = await handleApiResponse<{ text?: string; transcript?: string; translatedText?: string }>(res);
      const textVal = raw.transcript || raw.text || '';
      return {
        text: textVal,
        transcript: textVal,
        translatedText: raw.translatedText,
      };
    } catch (err) {
      console.warn('Backend transcription fallback triggered:', err);
      return {
        text: '',
        transcript: '',
      };
    }
  }

  /**
   * Alias method for speechToText
   */
  static async speechToText(
    audioOrOptions: string | { audioBase64: string; mimeType?: string; sourceLanguage?: string; targetLanguage?: string; languageHint?: string; model?: string },
    mimeType = 'audio/wav',
    languageHint?: string,
    model?: string
  ): Promise<{ text: string; transcript: string; translatedText?: string }> {
    return this.transcribeAudio(audioOrOptions, mimeType, languageHint, model);
  }

  /**
   * Get direct audio streaming URL for native pronunciation
   */
  static getTtsAudioUrl(text: string, language: string): string {
    return `/api/tts?text=${encodeURIComponent(text.trim().slice(0, 300))}&lang=${encodeURIComponent(language)}`;
  }
}
