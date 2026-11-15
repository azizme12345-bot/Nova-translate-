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
    title: 'Text Translation – LAFZ Translation',
    desc: 'Simple text translation supporting English, Urdu, and 9 languages in the dropdown.',
  },
  {
    path: '/voice',
    title: 'Voice Translator & Speech-to-Text – LAFZ Translation',
    desc: 'Speak and translate your voice between English, Urdu, and other supported languages using your browser.',
  },
  {
    path: '/camera',
    title: 'Camera OCR & Photo Translator – LAFZ Translation',
    desc: 'Scan and translate printed signs, restaurant menus, receipts, and documents using your mobile camera or uploaded image.',
  },
  {
    path: '/history',
    title: 'Translation History & Activity Log – LAFZ Translation',
    desc: 'View, search, replay, and manage your recent translations stored locally in your browser.',
  },
  {
    path: '/languages',
    title: 'Supported Languages Directory – LAFZ Translation',
    desc: 'Explore the 9 supported languages, native scripts, and browser spoken playback in LAFZ Translation.',
  },
  {
    path: '/about',
    title: 'About LAFZ Translation – Simple Language Translation',
    desc: 'Learn about LAFZ Translation: its mission, what keeps the interface simple, who it helps, and how it stays clear on phones and desktops.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy – LAFZ Translation',
    desc: 'Privacy Policy for LAFZ Translation. Learn how typed text, images, Chrome speech recognition, and browser storage work.',
  },
  {
    path: '/terms',
    title: 'Terms of Use – LAFZ Translation',
    desc: 'Terms of Use for LAFZ Translation covering acceptable use, machine translation limitations, service availability, and ownership.',
  },
  {
    path: '/contact',
    title: 'Contact Us – LAFZ Translation',
    desc: 'Contact LAFZ Translation with questions, feedback, feature suggestions, or bug reports.',
  },
  {
    path: '/sitemap',
    title: 'Sitemap & Tools Directory – LAFZ Translation',
    desc: 'Explore all translation tools, features, and indexable pages on LAFZ Translation.',
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
