/**
 * Backend Translation API Module
 * Handles request validation, HTTP communication, timeout handling,
 * and structured error responses without exposing server credentials.
 */

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_TEXT_LENGTH = 5000;

export function buildApiHeaders(extra = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach((key) => {
      headers[key] = extra[key];
    });
  }
  return headers;
}

export async function parseApiResponse(res) {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok || json.ok === false || (json.success === false && json.data === undefined)) {
      const errText =
        typeof json.error === 'string'
          ? json.error
          : json.error && json.error.message;
      throw new Error(errText || `Request failed with HTTP status ${res.status}`);
    }
    return json.data !== undefined ? json.data : json;
  }

  const textBody = await res.text();
  if (
    res.status === 413 ||
    textBody.includes('Request Entity Too Large') ||
    textBody.includes('Payload Too Large')
  ) {
    throw new Error('The uploaded file or payload exceeds the allowed server limit. Please use a smaller file.');
  }

  if (!res.ok) {
    throw new Error(textBody.slice(0, 150) || `Server error (HTTP ${res.status})`);
  }

  throw new Error(`Unexpected response from server (HTTP ${res.status})`);
}

async function fetchWithTimeout(url, fetchOptions = {}, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  let timedOut = false;

  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timerId);
      const abortErr = new Error('Request cancelled');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return await parseApiResponse(response);
  } catch (err) {
    if (timedOut) {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timerId);
    if (signal) {
      signal.removeEventListener('abort', forwardAbort);
    }
  }
}

export async function translateText(
  { text, sourceLanguage, targetLanguage, tone = 'natural' },
  options = {}
) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Please enter text to translate.');
  }
  if (cleanText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Input text exceeds the ${MAX_TEXT_LENGTH.toLocaleString()} character limit.`);
  }
  const cleanTarget = String(targetLanguage || '').trim() || 'English';

  const result = await fetchWithTimeout(
    '/api/translate',
    {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({
        text: cleanText,
        sourceLanguage: sourceLanguage ? String(sourceLanguage).trim() : 'Auto Detect',
        targetLanguage: cleanTarget,
        tone,
      }),
    },
    options
  );

  if (!result || !result.translatedText) {
    throw new Error('Empty translation returned from server.');
  }
  return result;
}

export async function translateImage(
  { imageBase64, mimeType = 'image/jpeg', sourceLanguage, targetLanguage = 'Urdu' },
  options = {}
) {
  const cleanImage = String(imageBase64 || '').trim();
  if (!cleanImage) {
    throw new Error('Image data is required for OCR translation.');
  }

  const result = await fetchWithTimeout(
    '/api/ocr-translate',
    {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({
        imageBase64: cleanImage,
        mimeType,
        sourceLanguage: sourceLanguage ? String(sourceLanguage).trim() : undefined,
        targetLanguage: String(targetLanguage || 'Urdu').trim(),
      }),
    },
    options
  );

  if (!result || !result.extractedText || !result.translatedText) {
    throw new Error('No text detected in this image.');
  }
  return result;
}

export async function detectLanguage(text, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    throw new Error('Text is required for language detection.');
  }

  return fetchWithTimeout(
    '/api/detect',
    {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({ text: cleanText.slice(0, 500) }),
    },
    { timeoutMs: 10000, ...options }
  );
}

export async function fetchSupportedLanguages(options = {}) {
  return fetchWithTimeout(
    '/api/languages',
    { method: 'GET', headers: buildApiHeaders() },
    { timeoutMs: 10000, ...options }
  );
}

export async function checkApiHealth(options = {}) {
  return fetchWithTimeout(
    '/api/health',
    { method: 'GET', headers: buildApiHeaders() },
    { timeoutMs: 8000, ...options }
  );
}

export async function transcribeAudio(
  { audioBase64, mimeType = 'audio/webm', languageHint, targetLanguage },
  options = {}
) {
  const cleanAudio = String(audioBase64 || '').trim();
  if (!cleanAudio) {
    throw new Error('Recorded audio data is empty.');
  }

  const baseMime =
    String(mimeType || 'audio/webm')
      .split(';')[0]
      .trim()
      .toLowerCase() || 'audio/webm';

  return fetchWithTimeout(
    '/api/speech-to-text',
    {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({
        audioBase64: cleanAudio,
        mimeType: baseMime,
        languageHint: languageHint ? String(languageHint).trim() : undefined,
        targetLanguage: targetLanguage ? String(targetLanguage).trim() : undefined,
      }),
    },
    { timeoutMs: 35000, ...options }
  );
}

