import { TranslationService } from '../server/translationService.ts';
import { enforceSameOriginAndRateLimit } from '../server/apiSecurity.ts';

export default async function handler(req: any, res: any) {
  if (!(await enforceSameOriginAndRateLimit(req, res))) {
    return;
  }

  const languages = TranslationService.getSupportedLanguages();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: true, languages }));
}
