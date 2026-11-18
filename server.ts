import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';
import { createRateLimiter } from './server/rateLimiter.ts';
import { buildPairPageHtml } from './scripts/page-builder.mjs';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

function parseHostFromUrl(raw?: string): string {
  if (!raw) return '';
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return '';
  }
}

// Security headers & Same-Origin protection for /api
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Vary', 'Origin');

  if (req.path.startsWith('/api')) {
    const reqHost = ((req.headers['x-forwarded-host'] as string) || req.headers.host || '').split(',')[0].trim().toLowerCase();
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();

    if (secFetchSite === 'cross-site') {
      res.status(403).json({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-site requests are not allowed.' } });
      return;
    }

    if (origin) {
      const originHost = parseHostFromUrl(origin);
      if (!reqHost || !originHost || originHost !== reqHost) {
        res.status(403).json({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (referer) {
      const refHost = parseHostFromUrl(referer);
      if (reqHost && refHost && refHost !== reqHost) {
        res.status(403).json({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } });
        return;
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }

  next();
});

// JSON body parser with 25MB limit for OCR base64 images and large text payloads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Graceful JSON & payload error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The uploaded file or payload exceeds the allowed server limit (25MB). Please use a smaller image or text.',
      },
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload received by server.',
      },
    });
    return;
  }
  next(err);
});

// Apply rate limit (120 req/min per IP) on AI endpoints
const aiEndpointLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
app.use('/api/translate', aiEndpointLimiter);
app.use('/api/ocr-translate', aiEndpointLimiter);
app.use('/api/speech-to-text', aiEndpointLimiter);

// General rate limiter for /api endpoints (240 req/min per IP)
app.use('/api', createRateLimiter({ windowMs: 60 * 1000, max: 240 }));

// Mount centralized API router
app.use('/api', apiRouter);

// Explicit routes for robots.txt and sitemap.xml
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain');
  const robotsPath = path.resolve(isProd ? 'dist' : 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.sendFile(robotsPath);
  } else {
    res.send('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://nova-translate-orpin.vercel.app/sitemap.xml\n');
  }
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  res.type('application/xml');
  const sitemapPath = path.resolve(isProd ? 'dist' : 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.sendFile(sitemapPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Serve dedicated static pages independently
const staticPageRoutes: Record<string, string> = {
  '/terms': 'terms.html',
  '/privacy': 'privacy.html',
  '/about': 'about.html',
  '/contact': 'contact.html',
};

for (const [routePath, fileName] of Object.entries(staticPageRoutes)) {
  app.get(routePath, (_req: Request, res: Response) => {
    const filePath = path.resolve(isProd ? 'dist' : 'public', fileName);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Page not found');
    }
  });
}

// Serve dedicated language-pair pages independently
const pairRouteFiles: Record<string, string> = {
  '/urdu-to-english': 'urdu-to-english.html',
  '/urdu-to-arabic': 'urdu-to-arabic.html',
};

for (const [routePath, fileName] of Object.entries(pairRouteFiles)) {
  app.get(routePath, (_req: Request, res: Response) => {
    if (isProd) {
      const distFile = path.resolve('dist', fileName);
      if (fs.existsSync(distFile)) {
        res.sendFile(distFile);
        return;
      }
    }
    const baseHtmlPath = path.resolve('index.html');
    if (fs.existsSync(baseHtmlPath)) {
      const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');
      res.type('text/html').send(buildPairPageHtml(baseHtml, routePath));
    } else {
      res.status(404).send('Page not found');
    }
  });
}

// Start server with Vite middleware in development or static files in production
async function bootstrap() {
  if (!isProd) {
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript');
      res.send(
        'export const ErrorOverlay = class {};\n' +
        'export function createHotContext() { return { data: {}, accept(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){} }; }\n' +
        'export function injectQuery(url) { return url; }\n' +
        'export function updateStyle() {}\n' +
        'export function removeStyle() {}\n'
      );
    });
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist/ directory not found. Please run npm run build.');
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Nova Translator Backend server listening on http://0.0.0.0:${port}`);
    console.log(`API endpoints available at http://0.0.0.0:${port}/api/`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});
