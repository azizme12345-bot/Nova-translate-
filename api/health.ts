import { enforceSameOriginAndRateLimit } from '../server/apiSecurity.ts';

export default async function handler(req: any, res: any) {
  if (!(await enforceSameOriginAndRateLimit(req, res))) {
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      status: 'ok',
      service: 'LAFZ Translation Vercel Serverless API',
      geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
      timestamp: new Date().toISOString(),
    })
  );
}
