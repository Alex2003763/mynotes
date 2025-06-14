import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
  skipWaiting(): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  clients: any;
};

// 預快取由 Vite 生成的檔案
precacheAndRoute(self.__WB_MANIFEST);

// 清理過期快取
cleanupOutdatedCaches();

// 跳過等待，立即啟用新的 service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 立即接管頁面控制權
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// 導航快取策略 - 用於 SPA 路由
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      // 嘗試從網路取得頁面
      const networkResponse = await fetch(event.request);
      return networkResponse;
    } catch (error) {
      // 網路失敗時，回退到 index.html
      const cache = await caches.open('mynotes-pages');
      const cachedResponse = await cache.match('/index.html');
      return cachedResponse || new Response('頁面不存在', { status: 404 });
    }
  }
);

// CDN 資源快取策略
registerRoute(
  /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'tailwind-css-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/esm\.sh\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'esm-modules-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
  new CacheFirst({
    cacheName: 'jsdelivr-cdn-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
    ],
  })
);

// Google Fonts 快取
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
    ],
  })
);

// 本地化檔案快取
registerRoute(
  /^.*\/locales\/.*\.json$/i,
  new CacheFirst({
    cacheName: 'translations-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
      }),
    ],
  })
);

// 應用程式資源快取
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'mynotes-app-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
      }),
    ],
  })
);

// 圖片資源快取
registerRoute(
  /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
  new CacheFirst({
    cacheName: 'mynotes-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
      }),
    ],
  })
);

// API 請求快取策略
registerRoute(
  /\/api\/.*/,
  new NetworkFirst({
    cacheName: 'mynotes-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 1 天
      }),
    ],
  })
);

console.log('MyNotes Service Worker registered successfully');
