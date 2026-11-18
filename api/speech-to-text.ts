export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Vercel mein GEMINI_API_KEY set nahi hai.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { audioBase64, mimeType, language } = await req.json();

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: 'Audio data missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const promptText = `Listen to this audio carefully and transcribe the exact spoken words in ${
      language || 'the spoken language'
    }. Return ONLY the transcribed text without any quotes, labels, or extra explanation. If there is no speech, return an empty string.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    const models = [
      'gemini-3.1-flash-lite-preview',
      'gemini-3.1-flash-lite',
    ];

    let transcribedText = '';
    let lastError = '';

    for (const model of models) {
      const response = await fetch(
        `https://googleapis.com{model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const data = await response.json();
        transcribedText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        lastError = '';
        break;
      } else {
        lastError = await response.text();
      }
    }

    if (lastError && !transcribedText) {
      return new Response(
        JSON.stringify({ error: 'Gemini API Error', details: lastError }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ text: transcribedText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
