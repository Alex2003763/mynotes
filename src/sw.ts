import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Tailwind CSS CDN
registerRoute(
  ({ url }) => url.origin === 'https://cdn.tailwindcss.com',
  new CacheFirst({
    cacheName: 'tailwind-css-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
      }),
    ],
  })
);

// Cherry Markdown CDN
registerRoute(
  ({ url }) => url.origin === 'https://cdn.jsdelivr.net' && url.pathname.includes('cherry-markdown'),
  new StaleWhileRevalidate({
    cacheName: 'cherry-markdown-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ESM.SH modules
registerRoute(
  ({ url }) => url.origin === 'https://esm.sh',
  new StaleWhileRevalidate({
    cacheName: 'esm-modules-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Locales
registerRoute(
  ({ url }) => url.pathname.includes('/locales/'),
  new CacheFirst({
    cacheName: 'translations-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
      }),
    ],
  })
);

// Static resources (CSS, JS)
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// HTML pages
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);