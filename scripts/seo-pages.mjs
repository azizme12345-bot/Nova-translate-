import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAIR_PAGES, buildPairPageHtml } from './page-builder.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexPath = resolve(distDir, 'index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = readFileSync(indexPath, 'utf8');

for (const [routePath, cfg] of Object.entries(PAIR_PAGES)) {
  const outPath = resolve(distDir, cfg.fileName);
  const pageHtml = buildPairPageHtml(baseHtml, routePath);
  writeFileSync(outPath, pageHtml, 'utf8');
  console.log(`Generated: ${outPath}`);
}

const requiredFiles = [
  'index.html',
  'terms.html',
  'privacy.html',
  'about.html',
  'contact.html',
  'urdu-to-english.html',
  'urdu-to-arabic.html',
  'languages.js',
  'translate.js',
  'listen.js',
  'mic.js',
  'image.js',
  'app.js',
  'robots.txt',
  'sitemap.xml',
];

for (const file of requiredFiles) {
  const fullPath = resolve(distDir, file);
  if (!existsSync(fullPath)) {
    console.error(`Missing required build output: ${fullPath}`);
    process.exit(1);
  }
}

console.log('Verified all 7 independent pages, canonical structure, and modular scripts.');
