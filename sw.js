const CACHE_NAME = 'tracker-cache-v25';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(['./', './index.html', './manifest.json']);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Ignora completamente le chiamate API e le funzioni Netlify
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/.netlify/')) {
    return;
  }
  
  // Non cacheare mai le richieste POST o altre non-GET
  if (req.method !== 'GET') {
    return;
  }
  if (url.pathname.endsWith('/app.js') || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        // Aggiorna la cache con la nuova versione se la richiesta ha successo
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return networkResponse;
      }).catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    fetch(req).then((networkResponse) => {
      const copy = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(req, copy);
      });
      return networkResponse;
    }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
