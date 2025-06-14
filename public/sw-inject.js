// 強制執行預快取的注入腳本
self.addEventListener('install', (event) => {
  console.log('[SW] Install event - forcing precache');
  event.waitUntil(
    (async () => {
      // 強制執行預快取
      try {
        // 等待 Workbox 核心加載
        await new Promise(resolve => {
          const interval = setInterval(() => {
            if (self.workbox) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });

        // 使用 Workbox 的 API 來執行預快取
        const precacheController = new self.workbox.precaching.PrecacheController();
        precacheController.addToCacheList(self.__WB_MANIFEST);
        await precacheController.install();
      } catch (error) {
        console.error('[SW] Precache failed:', error);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event - claiming clients');
  event.waitUntil(
    (async () => {
      // 等待 Workbox 核心加載
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (self.workbox) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      // 使用 Workbox 的 API 來清理過期的快取
      const precacheController = new self.workbox.precaching.PrecacheController();
      await precacheController.activate();
      self.clients.claim();
    })()
  );
});