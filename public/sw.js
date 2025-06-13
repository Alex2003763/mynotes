// MyNotes Service Worker
const CACHE_NAME = 'mynotes-v1';
const STATIC_CACHE_NAME = 'mynotes-static-v1';
const TRANSLATIONS_CACHE_NAME = 'mynotes-translations-v1';

// 需要緩存的核心資源
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/pencil.png',
  '/icon-192.png',
  '/manifest.webmanifest'
];

// 翻譯文件
const TRANSLATION_ASSETS = [
  '/locales/en.json',
  '/locales/zh.json'
];

// 安裝事件 - 緩存核心資源和翻譯
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // 緩存核心資源
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('SW: Caching core assets');
        return cache.addAll(CORE_ASSETS);
      }),
      // 緩存翻譯文件
      caches.open(TRANSLATIONS_CACHE_NAME).then((cache) => {
        console.log('SW: Caching translation assets');
        return cache.addAll(TRANSLATION_ASSETS);
      })
    ]).then(() => {
      console.log('SW: Installation completed');
      self.skipWaiting();
    }).catch((error) => {
      console.error('SW: Installation failed:', error);
    })
  );
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== TRANSLATIONS_CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Activation completed');
      return self.clients.claim();
    })
  );
});

// Fetch 事件 - 處理請求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 處理翻譯文件請求 - Cache First 策略
  if (url.pathname.startsWith('/locales/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(TRANSLATIONS_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            console.log('SW: Serving translation from cache:', url.pathname);
            // 在背景更新翻譯文件
            fetch(event.request).then((fetchResponse) => {
              if (fetchResponse.ok) {
                cache.put(event.request, fetchResponse.clone());
              }
            }).catch(() => {
              // 忽略網絡錯誤，使用緩存版本
            });
            return response;
          } else {
            // 如果緩存中沒有，嘗試從網絡獲取
            return fetch(event.request).then((fetchResponse) => {
              if (fetchResponse.ok) {
                cache.put(event.request, fetchResponse.clone());
              }
              return fetchResponse;
            }).catch(() => {
              // 網絡失敗時返回空的翻譯對象
              console.warn('SW: Failed to fetch translation, returning empty object');
              return new Response('{}', {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
              });
            });
          }
        });
      })
    );
    return;
  }

  // 處理導航請求
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // 處理其他靜態資源 - Cache First 策略
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((fetchResponse) => {
          // 只緩存成功的響應
          if (fetchResponse.ok) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
  }
});

// 處理消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'UPDATE_TRANSLATIONS') {
    // 更新翻譯文件
    updateTranslations().then(() => {
      // 向客戶端發送更新完成消息
      event.ports[0]?.postMessage({ success: true });
    }).catch((error) => {
      console.error('SW: Translation update failed:', error);
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }
});

// 處理同步事件（用於後台同步）
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'translation-update') {
    event.waitUntil(updateTranslations());
  }
});

// 更新翻譯文件
async function updateTranslations() {
  try {
    const cache = await caches.open(TRANSLATIONS_CACHE_NAME);
    const updatePromises = TRANSLATION_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset);
        if (response.ok) {
          await cache.put(asset, response);
          console.log('SW: Updated translation:', asset);
        }
      } catch (error) {
        console.warn('SW: Failed to update translation:', asset, error);
      }
    });
    
    await Promise.all(updatePromises);
    console.log('SW: Translation update completed');
  } catch (error) {
    console.error('SW: Translation update failed:', error);
  }
}