
const CACHE_NAME = 'mynotes-v5'; // Incremented cache version
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.tsx', // In a real build, this would be the bundled JS
  '/locales/en.json',
  '/locales/zh.json',
  'https://cdn.tailwindcss.com',
  '/pencil.png' // Added app icon
  // Add other static assets like icons, fonts if any
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache: ' + CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          fetchResponse => {
            // Check if we received a valid response
            if(!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic' && fetchResponse.type !== 'cors') {
              return fetchResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache non-GET requests or API calls (like OpenRouter)
                if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
                     cache.put(event.request, responseToCache);
                }
              });

            return fetchResponse;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

/*
  Note on ServiceWorker registration errors:
  If you see "Failed to register a ServiceWorker: The origin of the provided scriptURL (...) does not match the current origin (...)",
  this is often due to the environment where the app is hosted (e.g., specific preview platforms, iframes from different origins).
  Standard PWA service workers require same-origin deployment. This error might not indicate a problem with the sw.js code itself
  for a typical production deployment on a single origin.

  Note on Module Path Aliases (e.g., "@/components/MyComponent"):
  This application uses ES modules directly in the browser without a build step that resolves path aliases.
  Therefore, all local module imports in .js/.ts/.tsx files must use relative paths (e.g., './MyComponent', '../utils/helper')
  or absolute paths from the web server root (e.g., '/src/MyComponent.tsx').
  Using aliases like "@/" will result in a "Failed to resolve module specifier" error in the browser.
*/