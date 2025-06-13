import { Workbox } from 'workbox-window';

// 擴展 ImportMeta 接口以支援 Vite 環境變數
declare global {
  interface ImportMeta {
    env: {
      MODE: string;
      DEV: boolean;
      PROD: boolean;
      [key: string]: any;
    };
  }
}

class PWAService {
  private wb: Workbox | null = null;
  private updateAvailable = false;
  private hasReloaded = false;
  private restartCount = 0;
  private maxRestarts = 2; // 限制重啟次數

  init() {
    // 在開發模式下跳過某些功能
    const isDev = import.meta.env.MODE === 'development';
    
    // 檢查重啟次數，防止無限重啟循環
    this.restartCount = parseInt(sessionStorage.getItem('pwa_restart_count') || '0', 10);
    
    if (this.restartCount >= this.maxRestarts) {
      console.warn('PWA: 已達到最大重啟次數，停止自動重啟');
      sessionStorage.removeItem('pwa_restart_count');
      return;
    }
    
    if ('serviceWorker' in navigator) {
      // 使用 Workbox 註冊 Vite 生成的 Service Worker
      this.wb = new Workbox('/sw.js', {
        type: 'module'
      });
      
      // 監聽 SW 安裝事件
      this.wb.addEventListener('installed', (event) => {
        console.log('SW: Service Worker 已安裝', event);
        if (!event.isUpdate) {
          console.log('SW: 首次安裝完成');
          // 首次安裝後預緩存翻譯
          this.ensureTranslationsCached().catch(console.warn);
        }
      });

      // 監聽 SW 更新事件
      this.wb.addEventListener('waiting', (event) => {
        console.log('SW: 新版本等待中', event);
        this.updateAvailable = true;
        this.showUpdateNotification();
      });

      // 監聽 SW 控制事件
      this.wb.addEventListener('controlling', (event) => {
        console.log('SW: Service Worker 開始控制頁面', event);
        if (this.updateAvailable && !this.hasReloaded) {
          this.hasReloaded = true;
          this.restartCount++;
          sessionStorage.setItem('pwa_restart_count', this.restartCount.toString());
          
          // 添加延遲避免競爭條件
          setTimeout(() => {
            console.log('SW: 重新載入應用程式');
            window.location.reload();
          }, 500);
        }
      });

      // 監聽 SW 錯誤事件
      this.wb.addEventListener('redundant', () => {
        console.warn('SW: Service Worker 變為冗餘');
      });

      // 註冊 Service Worker
      this.wb.register().then(async (registration) => {
        console.log('SW 註冊成功:', registration);
        
        // 清除重啟計數器（成功註冊後）
        setTimeout(() => {
          sessionStorage.removeItem('pwa_restart_count');
        }, 3000);
        
        // 確保翻譯文件已緩存
        try {
          await this.ensureTranslationsCached();
          console.log('PWA: 翻譯文件已確保緩存');
        } catch (error) {
          console.warn('PWA: 翻譯緩存失敗:', error);
        }
        
      }).catch((error) => {
        console.error('SW 註冊失敗:', error);
        // 如果 SW 註冊失敗，嘗試手動緩存關鍵資源
        this.fallbackCaching();
      });
    } else {
      console.log('瀏覽器不支援 Service Worker');
    }
  }

  // 確保翻譯文件已緩存
  private async ensureTranslationsCached(): Promise<void> {
    if (!('caches' in window)) {
      throw new Error('Cache API 不可用');
    }

    const languages = ['en', 'zh'];
    const cachePromises = languages.map(async (lang) => {
      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (response.ok) {
          const cache = await caches.open('mynotes-translations-v1');
          await cache.put(`/locales/${lang}.json`, response);
          console.log(`SW: 已緩存翻譯文件 ${lang}.json`);
        }
      } catch (error) {
        console.warn(`SW: 無法緩存翻譯文件 ${lang}.json:`, error);
      }
    });

    await Promise.all(cachePromises);
  }

  // 預緩存基本資源
  private async preCacheEssentialResources(): Promise<void> {
    if (!('caches' in window)) {
      throw new Error('Cache API 不可用');
    }

    const essentialResources = [
      '/',
      '/index.html',
      '/offline.html',
      '/locales/en.json',
      '/locales/zh.json',
      '/manifest.webmanifest'
    ];

    try {
      const cache = await caches.open('mynotes-essential-v1');
      const cachePromises = essentialResources.map(async (resource) => {
        try {
          const response = await fetch(resource);
          if (response.ok) {
            await cache.put(resource, response);
            console.log(`PWA: Cached essential resource: ${resource}`);
          }
        } catch (error) {
          console.warn(`PWA: Failed to cache ${resource}:`, error);
        }
      });

      await Promise.all(cachePromises);
    } catch (error) {
      console.error('PWA: Essential resource caching failed:', error);
    }
  }

  // 後備緩存方案
  private async fallbackCaching(): Promise<void> {
    console.log('PWA: Attempting fallback caching');
    
    if ('caches' in window) {
      try {
        await this.preCacheEssentialResources();
        await this.ensureTranslationsCached();
        console.log('PWA: Fallback caching completed');
      } catch (error) {
        console.error('PWA: Fallback caching failed:', error);
      }
    }
  }

  private showUpdateNotification() {
    if (confirm('發現新版本，是否立即更新？')) {
      this.skipWaiting();
    }
  }

  skipWaiting() {
    if (this.wb && this.updateAvailable && !this.hasReloaded) {
      this.wb.messageSkipWaiting();
    }
  }

  // 檢查是否為 PWA 模式
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // 顯示安裝提示
  showInstallPrompt() {
    let deferredPrompt: any = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // 顯示自定義安裝按鈕
      this.showInstallButton(deferredPrompt);
    });
  }

  private showInstallButton(deferredPrompt: any) {
    // 創建安裝提示
    const installBanner = document.createElement('div');
    installBanner.className = 'fixed bottom-4 left-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between';
    installBanner.innerHTML = `
      <div>
        <div class="font-semibold">安裝 MyNotes</div>
        <div class="text-sm opacity-90">添加到主屏幕以獲得更好的體驗</div>
      </div>
      <div class="flex gap-2">
        <button id="install-btn" class="bg-white text-primary px-4 py-2 rounded font-semibold">安裝</button>
        <button id="close-install" class="text-white opacity-70 px-2">✕</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    // 安裝按鈕事件
    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`用戶選擇: ${outcome}`);
        deferredPrompt = null;
      }
      installBanner.remove();
    });

    // 關閉按鈕事件
    document.getElementById('close-install')?.addEventListener('click', () => {
      installBanner.remove();
    });

    // 3秒後自動隱藏
    setTimeout(() => {
      if (installBanner.parentNode) {
        installBanner.remove();
      }
    }, 10000);
  }

  // 離線狀態檢查
  setupOfflineNotification() {
    const showOfflineNotification = () => {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-4 right-4 bg-yellow-500 text-white p-3 rounded-lg shadow-lg z-50 text-center';
      notification.textContent = '您目前處於離線狀態，但仍可以繼續使用應用';
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
    };

    const showOnlineNotification = () => {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-4 right-4 bg-green-500 text-white p-3 rounded-lg shadow-lg z-50 text-center';
      notification.textContent = '已重新連接到網絡';
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
    };

    window.addEventListener('offline', showOfflineNotification);
    window.addEventListener('online', showOnlineNotification);
  }
}

export const pwaService = new PWAService();