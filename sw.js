const CACHE_NAME = 'pixi-2048-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  'https://cdn.jsdelivr.net/npm/pixi.js@8.15.0/dist/pixi.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/pixi-filters/dist/pixi-filters.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
