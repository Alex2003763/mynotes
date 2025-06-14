// MyNotes PWA Service Worker with Workbox strategies
// Import workbox libraries using importScripts

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, StaleWhileRevalidate, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

const CACHE_NAME = 'mynotes-cache-v1.5';

// 預緩存關鍵資源
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/pencil.png',
  '/index.css',
  // CDN 資源
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/cherry-markdown@latest/dist/cherry-markdown.min.css',
  'https://cdn.jsdelivr.net/npm/cherry-markdown@latest/dist/cherry-markdown.esm.js',
  // 本地化文件
  '/locales/en.json',
  '/locales/zh.json'
];

// 使用 Workbox 預緩存機制
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// 手動緩存關鍵資源
self.addEventListener('install', (event) => {
  console.log('[SW] Install event for version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential assets');
        // 使用個別的 cache.add() 來避免單一失敗影響全部
        const promises = ASSETS_TO_CACHE.map(assetUrl => {
          return cache.add(assetUrl).catch(err => {
            console.warn(`[SW] Failed to cache asset: ${assetUrl}`, err);
          });
        });
        return Promise.all(promises);
      })
      .then(() => {
        console.log('[SW] Pre-caching completed.');
      })
      .catch((error) => {
        console.error('[SW] Pre-caching failed:', error);
      })
  );
  self.skipWaiting();
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('mynotes-cache-')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 1. Tailwind CSS CDN - CacheFirst (長期緩存)
registerRoute(
  /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
  new CacheFirst({
    cacheName: 'tailwind-css-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
    ],
  })
);

// 2. Cherry Markdown CDN - StaleWhileRevalidate
registerRoute(
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/cherry-markdown@.*\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'cherry-markdown-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
      }),
    ],
  })
);

// 3. ESM.SH 模塊 - StaleWhileRevalidate
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

// 4. 本地化文件 - CacheFirst (長期緩存)
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

// 5. 圖標和靜態資源 - CacheFirst
registerRoute(
  ({ request }) => 
    request.destination === 'image' || 
    request.url.includes('/icons/') ||
    request.url.includes('.png') ||
    request.url.includes('.ico'),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
    ],
  })
);

// 6. CSS 和 JS 文件 - StaleWhileRevalidate
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
      }),
    ],
  })
);

// 7. HTML 頁面 - NetworkFirst (優先獲取最新版本)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24, // 1 天
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);

// 8. API 和動態內容 - NetworkFirst
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60, // 1 小時
      }),
    ],
    networkTimeoutSeconds: 5,
  })
);

// 9. 其他請求的回退策略
registerRoute(
  ({ request }) => request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'general-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 3, // 3 天
      }),
    ],
  })
);

// 離線回退處理
self.addEventListener('fetch', (event) => {
  // 處理導航請求的離線回退
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') || caches.match('/index.html');
      })
    );
  }
});

// 背景同步（如果支援）
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      console.log('[SW] Background sync triggered');
      // 可以在這裡添加背景同步邏輯
    }
  });
}

// 推送通知處理（未來功能）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    const options = {
      body: data.body || 'MyNotes 通知',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.data || {},
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MyNotes', options)
    );
  }
});

// 通知點擊處理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log(`[SW] MyNotes Service Worker ${CACHE_NAME} loaded successfully`);