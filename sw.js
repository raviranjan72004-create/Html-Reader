// Cache-first-with-background-refresh for the app shell (HTML/CSS/JS/icons).
// The note files and annotation data never go through here — they live in
// IndexedDB / the user's own file picker, not the network, so there's
// nothing to precache for them.

const CACHE_NAME = 'study-reader-shell-v1';

// The service worker's own URL tells us what subpath it's deployed under
// — e.g. https://user.github.io/Html-Reader/sw.js → base
// "/Html-Reader/". Deriving this at runtime (rather than hardcoding "/")
// is what makes the same sw.js work whether the app is served from a
// domain root, a GitHub Pages project subpath, or anywhere else.
const BASE = new URL('.', self.location.href).pathname;
const PRECACHE = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/icon-512.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      // Cache-first for instant, low-latency loads; network still runs in
      // the background to keep the cache fresh for next time.
      return cached || network;
    }),
  );
});
