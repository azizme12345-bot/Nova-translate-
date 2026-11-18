import { GoogleGenAI } from '@google/genai';

export const TEXT_MODEL = 'gemini-4-hydrogen';
export const IMAGE_MODEL = 'gemini-4-hydrogen';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Server par GEMINI_API_KEY set nahi hai.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ApiRequest {
  method?: string;
  body?: unknown;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export function parseRequestBody<T extends Record<string, unknown>>(body: unknown): T {
  if (!body) return {} as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof body === 'object') {
    return body as T;
  }
  return {} as T;
}

export function extractGeminiError(err: unknown): { status: number; message: string } {
  const anyErr = err as { status?: number; statusCode?: number; message?: string } | null;
  const message = anyErr && anyErr.message ? String(anyErr.message) : 'Gemini service request failed.';
  const rawStatus = anyErr ? Number(anyErr.status || anyErr.statusCode || 0) : 0;
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  return { status, message };
}

export function parseModelJson<T>(rawText: string | undefined): T {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  if (!cleaned) {
    throw new Error('Gemini returned an empty response.');
  }

  return JSON.parse(cleaned) as T;
}
