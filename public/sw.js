
const CACHE_NAME = 'mynotes-v5'; // Incremented cache version
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.tsx', // In a real build, this would be the bundled JS
  '/locales/en.json',
  '/locales/zh.json',
  // 'https://cdn.tailwindcss.com', // Removed from pre-caching
  '/pencil.png' // Added app icon
  // Add other static assets like icons, fonts if any
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache: ' + CACHE_NAME);
        // cache.addAll can fail if any of the resources fail to fetch.
        // For essential resources, this is okay. For non-essential or problematic ones (like some CDNs),
        // it might be better to cache them via the fetch handler.
        return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.startsWith('http'))) // Cache local assets
          .then(() => {
            // Optionally, try to cache CDN assets individually with more control if needed,
            // but for now, we'll let the fetch handler manage Tailwind.
            // Example:
            // const cdnAssets = ASSETS_TO_CACHE.filter(url => url.startsWith('http'));
            // cdnAssets.forEach(assetUrl => {
            //   fetch(new Request(assetUrl, { mode: 'cors' })) // Explicitly request with CORS
            //     .then(response => {
            //       if (response.ok) {
            //         cache.put(assetUrl, response);
            //       } else {
            //         console.warn(`Failed to pre-cache ${assetUrl} with CORS. Status: ${response.status}`);
            //       }
            //     })
            //     .catch(err => console.error(`Error pre-caching ${assetUrl}:`, err));
            // });
          });
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
            // Check if we received a valid response that we can cache
            // Do not cache opaque responses (type 'opaque') for scripts/styles as they can cause CORS issues when served from cache.
            // Do not cache non-200 responses.
            if (!fetchResponse || fetchResponse.status !== 200 || 
                (fetchResponse.type !== 'basic' && fetchResponse.type !== 'cors')) {
              return fetchResponse; // Return problematic responses directly without caching
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache non-GET requests or API calls (like OpenRouter)
                // Also, only cache http/https requests
                if (event.request.method === 'GET' && 
                    event.request.url.startsWith('http') && 
                    !event.request.url.includes('/api/')) {
                     cache.put(event.request, responseToCache);
                }
              });

            return fetchResponse;
          }
        ).catch(error => {
          console.error('Fetch failed; returning offline page or error indicator if applicable.', error);
          // Optionally, return a custom offline fallback page or simple error response
          // For example, if it's a navigation request:
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html'); // You'd need an offline.html in ASSETS_TO_CACHE
          // }
          // For now, just rethrow or let it be. The browser will show its default network error.
          throw error;
        });
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