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
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
}

export interface ApiResponse {
  statusCode?: number;
  status?: (code: number) => ApiResponse;
  json?: (body: unknown) => void;
  end?: (chunk?: string) => void;
  setHeader?: (name: string, value: string) => void;
}

export function sendJson(res: ApiResponse, statusCode: number, payload: unknown): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  if (typeof res.status === 'function') {
    const target = res.status(statusCode);
    if (target && typeof target.json === 'function') {
      target.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  if (typeof res.end === 'function') {
    res.end(JSON.stringify(payload));
  }
}

export async function readRequestBody<T extends Record<string, unknown>>(req: ApiRequest): Promise<T> {
  const rawBody = req ? req.body : undefined;
  if (rawBody !== undefined && rawBody !== null) {
    if (typeof rawBody === 'string') {
      try {
        return JSON.parse(rawBody) as T;
      } catch {
        return {} as T;
      }
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(rawBody)) {
      try {
        return JSON.parse(rawBody.toString('utf8')) as T;
      } catch {
        return {} as T;
      }
    }
    if (typeof rawBody === 'object') {
      return rawBody as T;
    }
  }

  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks: string[] = [];
    for await (const chunk of req as AsyncIterable<unknown>) {
      if (typeof chunk === 'string') {
        chunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk).toString('utf8'));
      }
    }
    const combined = chunks.join('').trim();
    if (combined) {
      try {
        return JSON.parse(combined) as T;
      } catch {
        return {} as T;
      }
    }
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
