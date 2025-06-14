// 強制執行預快取的注入腳本
self.addEventListener('install', (event) => {
  console.log('[SW] Install event - forcing precache');
  event.waitUntil(
    (async () => {
      // 強制執行預快取
      try {
        const cache = await caches.open('workbox-precache-v2-' + self.location.origin + '/');
        console.log('[SW] Precache created:', cache);
        
        // 如果有預快取清單，執行它
        if (self.__WB_MANIFEST && self.__WB_MANIFEST.length > 0) {
          console.log('[SW] Precaching manifest items:', self.__WB_MANIFEST.length);
          const urls = self.__WB_MANIFEST.map(entry => entry.url);
          await cache.addAll(urls);
        }
      } catch (error) {
        console.error('[SW] Precache failed:', error);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event - claiming clients');
  event.waitUntil(self.clients.claim());
});