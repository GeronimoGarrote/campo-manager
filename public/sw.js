const CACHE_NAME = 'rc-static-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Íconos y manifest quedan fuera del caché del SW: si se cachearan,
  // la estrategia cache-first los serviría viejos para siempre
  const esIconoOManifest = /favicon|apple-touch-icon|web-app-manifest|\.webmanifest$|\.ico$/.test(url.pathname);
  if (url.origin !== self.location.origin || e.request.mode === 'navigate' || esIconoOManifest) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
