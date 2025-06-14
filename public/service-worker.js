const CACHE_NAME = 'mynotes-cache-v1.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/index.tsx',
  '/src/index.css',
  '/favicon.ico',
  // CDN 資源
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  // 本地化檔案
  '/locales/en.json',
  '/locales/zh.json',
  // 圖標
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png'
];

// 安裝事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('快取已開啟，正在快取資源:', CACHE_NAME);
        const promises = ASSETS_TO_CACHE.map(assetUrl => {
          return cache.add(new Request(assetUrl, { cache: 'reload' })).catch(err => {
            console.warn(`快取失敗 ${assetUrl}:`, err);
          });
        });
        return Promise.all(promises);
      })
      .catch(err => {
        console.error('安裝期間快取開啟失敗:', err);
      })
  );
  self.skipWaiting();
});

// 啟用事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 抓取事件
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 導航請求 (HTML): 網路優先，然後快取
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/') || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 其他請求 (CSS, JS, 圖片, 字體): 快取優先策略
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
             const url = new URL(request.url);
             const knownCDNs = [
                'cdn.tailwindcss.com',
                'fonts.googleapis.com',
                'fonts.gstatic.com',
                'cdnjs.cloudflare.com',
                'esm.sh',
                'cdn.jsdelivr.net'
             ];
             
             const shouldCache = ASSETS_TO_CACHE.includes(url.pathname) ||
                                 ASSETS_TO_CACHE.includes(request.url) ||
                                 knownCDNs.includes(url.hostname);

            if (shouldCache) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                .then((cache) => {
                    cache.put(request, responseToCache);
                });
            }
          }
          return networkResponse;
        }).catch(error => {
            console.warn(`抓取失敗 ${request.url}; 資源可能無法離線使用.`, error);
            return Response.error();
        });
      })
  );
});

// 訊息處理 - 用於與應用程式通信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 處理推送通知 (未來功能)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png'
    };
    
    event.waitUntil(
      self.registration.showNotification('MyNotes 通知', options)
    );
  }
});

// 處理通知點擊
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});