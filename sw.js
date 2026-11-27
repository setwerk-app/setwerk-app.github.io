// Setwerk service worker: makes the app installable and fully usable offline.
const VERSION = 'setwerk-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    try { await c.add(new Request(CDN, { mode: 'cors' })); } catch (_) { /* offline at install: cached on first use */ }
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
  const isPage = req.mode === 'navigate';
  const ours = url.origin === self.location.origin;
  if (!ours && req.url !== CDN) return;

  // App page: network first (so updates arrive), cache as fallback when offline.
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', res.clone());
        return res;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Everything else (icons, manifest, PDF library): cache first, refresh in background.
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
