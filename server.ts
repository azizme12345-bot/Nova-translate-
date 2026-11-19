import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiRequest, ApiResponse } from './api/_config.js';
import translateHandler from './api/translate.js';
import imageTranslateHandler from './api/image-translate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.all('/api/translate', (req, res) => {
    void translateHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  app.all('/api/image-translate', (req, res) => {
    void imageTranslateHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    const staticPublicPages: Record<string, string> = {
      '/terms': 'terms.html',
      '/privacy': 'privacy.html',
      '/about': 'about.html',
      '/contact': 'contact.html',
    };

    app.use(async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      if (req.path.startsWith('/api/')) {
        return next();
      }
      try {
        const publicFile = staticPublicPages[req.path];
        if (publicFile) {
          const filePath = resolve(__dirname, 'public', publicFile);
          if (existsSync(filePath)) {
            return res.status(200).type('text/html').send(readFileSync(filePath, 'utf8'));
          }
        }

        const templatePath = resolve(__dirname, 'index.html');
        const template = readFileSync(templatePath, 'utf8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        return res.status(200).type('text/html').send(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        return next(err);
      }
    });
  } else {
    const distDir = resolve(__dirname, 'dist');
    app.use(express.static(distDir, { extensions: ['html'] }));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      return res.sendFile(resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LAFZ server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
