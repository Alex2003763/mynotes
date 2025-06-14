/**
 * Service Worker for MyNotes PWA
 * Caches critical resources for offline use
 */

const CACHE_NAME = 'mynotes-static-v1';
const OFFLINE_CACHE_NAME = 'mynotes-offline-data';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/pencil.png',
  '/locales/en.json',
  '/locales/zh.json'
];

// Skip service worker in development
if (window.location.hostname !== 'localhost') {
  // Install and precache critical resources
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(PRECACHE_URLS))
        .then(() => self.skipWaiting())
    );
  });

  // Activate and clean up old caches
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  // Network-first strategy for API calls
  self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // API requests (use network-first)
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(request)
          .then(response => {
            // Cache successful API responses
            const clone = response.clone();
            caches.open(OFFLINE_CACHE_NAME)
              .then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => {
            // Fallback to cache when offline
            return caches.match(request);
          })
      );
    }
    // Static assets (use cache-first)
    else {
      event.respondWith(
        caches.match(request)
          .then(cached => cached || fetch(request))
      );
    }
  });
}