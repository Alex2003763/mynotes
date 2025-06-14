const CACHE_NAME = 'mynotes-cache-v1.0';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html' // Only precache the most critical pages manually
];

// Use the injected manifest from vite-plugin-pwa
// This will be replaced by the list of assets to precache by vite-plugin-pwa
const precacheManifest = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event for version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching precache assets');
        // A more robust way to combine and de-duplicate assets
        const manifestUrls = precacheManifest.map(entry => entry.url);
        const allAssetsToCache = [...new Set([...PRECACHE_ASSETS, ...manifestUrls])];
        console.log('[SW] Assets to cache:', allAssetsToCache);
        
        // Use individual cache.add() to make it non-atomic and more robust.
        const promises = allAssetsToCache.map(assetUrl => {
          return cache.add(assetUrl).catch(err => {
            console.warn(`[SW] Failed to cache asset: ${assetUrl}`, err);
          });
        });

        return Promise.all(promises);
      })
      .then(() => {
        console.log('[SW] Pre-caching completed.');
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests (e.g., loading the page), use a Network First strategy.
  // This ensures users get the latest version of the app if they are online.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If the fetch is successful, cache the response for offline use.
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If the network fails, attempt to serve the main app page from cache.
          console.log('[SW] Network failed for navigation, trying to serve from cache.');
          return caches.match('/index.html').then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If the main page isn't in cache, serve the offline fallback page.
            console.warn('[SW] /index.html not in cache, serving offline.html as fallback.');
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // For non-navigation requests (assets like CSS, JS, images), use a Cache First strategy.
  // This makes the app load faster by serving assets directly from the cache.
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // If the asset is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }
        // If the asset is not in the cache, fetch it from the network.
        return fetch(request)
          .then((networkResponse) => {
            // If the fetch is successful, cache the new asset for future use.
            if (networkResponse && networkResponse.ok) {
              // Only cache http/https requests, ignore others like chrome-extension.
              if (request.url.startsWith('http')) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
            }
            return networkResponse;
          })
          .catch(err => {
            console.error(`[SW] Fetch failed for asset: ${request.url}`, err);
            // Return a proper error response to avoid a TypeError
            return new Response(`Network error for ${request.url}`, {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});