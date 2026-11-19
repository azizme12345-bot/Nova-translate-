const CACHE_NAME = 'lafz-translation-shell-v3';
const APP_MODULES = [
  '/modules/app.js',
  '/modules/audio-mode.js',
  '/modules/clipboard.js',
  '/modules/history-manager.js',
  '/modules/image-translation.js',
  '/modules/language-manager.js',
  '/modules/listening.js',
  '/modules/microphone.js',
  '/modules/text-translation.js',
  '/modules/translation-api.js',
  '/modules/ui-utils.js'
];
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/lafz-logo-icon.png',
  ...APP_MODULES
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    (event.request.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && (url.pathname === '/' || url.pathname === '/index.html')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  if (url.pathname.startsWith('/modules/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(url.pathname, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(url.pathname))
    );
    return;
  }

  if (APP_SHELL.indexOf(url.pathname) !== -1) {
    event.respondWith(
      caches.match(url.pathname).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(url.pathname, copy);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
