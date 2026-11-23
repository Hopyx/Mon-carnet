// Garde l'app disponible hors connexion. Changer VERSION à chaque mise à jour des fichiers.
const VERSION = 'ventre-leger-v10';
const LOCAL = ['./', './index.html', './app.js', './manifest.webmanifest', './app-icon-180.png', './app-icon-192.png', './app-icon-512.png', './jspdf.umd.min.js', './pdf.min.js', './pdf.worker.min.js',
  ...['bras-ouverts','surprise','coucou','pouce','montre','reflechit','ravie','presente','victoire','coeur'].map((n) => `./mascotte/${n}.webp`)];
const REMOTE = [];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(REMOTE.map((u) => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Page : réseau d'abord (pour recevoir les mises à jour), cache sinon.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone(); caches.open(VERSION).then((c) => c.put('./index.html', './app.js', copy)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Le reste : cache d'abord.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host)) {
      const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy));
    }
    return r;
  })));
});
