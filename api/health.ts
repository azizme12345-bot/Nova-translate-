export default function handler(req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'Nova Translate Vercel Serverless API',
      geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
      timestamp: new Date().toISOString(),
    })
  );
}
