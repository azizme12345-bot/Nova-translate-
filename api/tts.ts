import {
  ApiRequest,
  ApiResponse,
  TTS_MODEL,
  extractGeminiError,
  getGeminiClient,
  readRequestBody,
  sendJson,
} from './_config.js';

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_CHANNELS = 1;
const DEFAULT_BITS_PER_SAMPLE = 16;

interface TtsBody extends Record<string, unknown> {
  text?: string;
  language?: string;
  voiceGender?: string;
}

function isWavBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WAVE'
  );
}

function parseSampleRateFromMime(mimeType: string): number {
  const match = String(mimeType || '').match(/rate=(\d+)/i);
  if (match) {
    const rate = Number(match[1]);
    if (Number.isFinite(rate) && rate >= 8000 && rate <= 192000) {
      return rate;
    }
  }
  return DEFAULT_SAMPLE_RATE;
}

function wrapPcmWithWavHeader(
  pcmData: Buffer,
  sampleRate = DEFAULT_SAMPLE_RATE,
  numChannels = DEFAULT_CHANNELS,
  bitsPerSample = DEFAULT_BITS_PER_SAMPLE
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const body = await readRequestBody<TtsBody>(req);
    const text = String(body.text || '').trim();
    const voiceGender = String(body.voiceGender || 'female').trim().toLowerCase();

    if (!text) {
      return sendJson(res, 400, { error: 'Text is required for speech playback.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return sendJson(res, 400, { error: `Text exceeds ${MAX_TEXT_LENGTH} character limit.` });
    }

    const voiceName = voiceGender === 'male' ? 'Puck' : 'Kore';
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Clear, natural pronunciation',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const rawAudioBase64 = inline?.data ? String(inline.data).trim() : '';
    const inlineMime = String(inline?.mimeType || '').trim();

    if (!rawAudioBase64) {
      return sendJson(res, 502, { error: 'Gemini returned empty audio.' });
    }

    const audioBuffer = Buffer.from(rawAudioBase64, 'base64');
    const wavBuffer = isWavBuffer(audioBuffer)
      ? audioBuffer
      : wrapPcmWithWavHeader(audioBuffer, parseSampleRateFromMime(inlineMime));

    return sendJson(res, 200, {
      audioBase64: wavBuffer.toString('base64'),
      mimeType: 'audio/wav',
    });
  } catch (err) {
    const { status, message } = extractGeminiError(err);
    return sendJson(res, status, { error: message });
  }
}
