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
  event.waitUntil(
    caches.open('mynotes-pages').then((cache) => {
      // 預緩存關鍵文件以確保離線可用
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        // 其他關鍵資源會由 precacheAndRoute 處理
      ]).catch((error) => {
        console.error('Failed to precache critical resources:', error);
      });
    }).then(() => {
      self.skipWaiting();
    })
  );
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
      if (networkResponse.ok) {
        // 成功取得網路回應，快取它
        const cache = await caches.open('mynotes-pages');
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('Network failed, trying cache for navigation:', event.request.url);
    }
    
    // 網路失敗或回應不正常時，嘗試從快取取得
    const cache = await caches.open('mynotes-pages');
    
    // 首先嘗試取得請求的確切路徑
    let cachedResponse = await cache.match(event.request);
    
    // 如果沒有找到，嘗試取得 index.html (SPA 回退)
    if (!cachedResponse) {
      cachedResponse = await cache.match('/index.html');
    }
    
    // 如果還是沒有找到，嘗試取得根目錄
    if (!cachedResponse) {
      cachedResponse = await cache.match('/');
    }
    
    // 如果主頁面也沒有，嘗試取得離線頁面
    if (!cachedResponse) {
      cachedResponse = await cache.match('/offline.html');
    }
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 最後的回退：返回一個簡單的離線提示
    return new Response(`
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <title>MyNotes - 離線</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center;
            padding: 2rem;
            background: #4361ee;
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          button {
            padding: 1rem 2rem;
            font-size: 1rem;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <h1>📱 MyNotes</h1>
        <p>應用程式目前離線，請檢查網路連線</p>
        <button onclick="window.location.reload()">重新連線</button>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
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
