import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';
import { createRateLimiter } from './server/rateLimiter.ts';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// CORS & Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// JSON body parser with 15MB limit for OCR base64 images
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply Rate Limiter to all /api/ endpoints (60 req/min per IP)
app.use('/api', createRateLimiter({ windowMs: 60 * 1000, max: 60 }));

// Mount centralized API router
app.use('/api', apiRouter);

// Start server with Vite middleware in development or static files in production
async function bootstrap() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`Nova Translate Backend server listening on http://0.0.0.0:${port}`);
    console.log(`API endpoints available at http://0.0.0.0:${port}/api/`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});
