import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const requiredFiles = [
  'index.html',
  'privacy.html',
  'terms.html',
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

console.log('Verified 3-page build output (/, /privacy, /terms) and modular scripts.');
