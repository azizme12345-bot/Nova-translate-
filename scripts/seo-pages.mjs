import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexPath = resolve(distDir, 'index.html');
const SITE = 'https://nova-translate-orpin.vercel.app';

const pages = [
  {
    path: '/text-translation',
    title: 'Text Translation – Lafz Translator',
    desc: 'Instant bidirectional AI text translation supporting English, Urdu, and 100+ languages. Fast sentence, paragraph, and document translator.',
  },
  {
    path: '/voice',
    title: 'Voice Translator & Speech-to-Text – Lafz Translator',
    desc: 'Speak naturally and translate your voice in real-time between English and Urdu with continuous microphone input and natural audio playback.',
  },
  {
    path: '/camera',
    title: 'Camera OCR & Photo Translator – Lafz Translator',
    desc: 'Scan and translate printed signs, restaurant menus, receipts, and documents directly using your mobile camera or uploaded image.',
  },
  {
    path: '/history',
    title: 'Translation History & Activity Log – Lafz Translator',
    desc: 'View, search, replay, and manage your recent translations with private device storage and one-click clipboard copying.',
  },
  {
    path: '/languages',
    title: 'Supported Languages Directory – Lafz Translator',
    desc: 'Explore 100+ supported international languages, dialects, native scripts, and speech synthesis engines available in Lafz Translator.',
  },
  {
    path: '/about',
    title: 'About Lafz Translator – Mission & Multilingual AI',
    desc: 'Discover the technology, mission, and accessibility features behind Lafz Translator, bridging global communication gaps.',
  },
  {
    path: '/sitemap',
    title: 'Sitemap & Tools Directory – Lafz Translator',
    desc: 'Explore all translation tools, features, and indexable pages on Lafz Translator. Complete navigation directory for users and search engines.',
  },
];

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function buildPage(baseHtml, page) {
  const t = esc(page.title);
  const d = esc(page.desc);
  const u = esc(`${SITE}${page.path}`);

  let html = baseHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${t}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => a + d + b);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => a + u + b);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => a + t + b);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => a + d + b);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, (_, a, b) => a + u + b);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_, a, b) => a + t + b);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, (_, a, b) => a + d + b);
  html = html.replace(/"url": "[^"]*"/, () => `"url": "${SITE}${page.path}"`);
  html = html.replace(/("description": ")[^"]*(")/, (_, a, b) => a + d + b);
  html = html.replace(/<h1>[^<]*<\/h1>/, () => `<h1>${t}</h1>`);
  html = html.replace(/<p>Lafz Translator is [^<]*<\/p>/, () => `<p>${d}</p>`);
  return html;
}

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = readFileSync(indexPath, 'utf8');

for (const page of pages) {
  const outPath = resolve(distDir, `${page.path.slice(1)}.html`);
  writeFileSync(outPath, buildPage(baseHtml, page), 'utf8');
  console.log(`Created: ${outPath}`);
}
