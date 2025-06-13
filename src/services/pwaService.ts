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
    
    if ('serviceWorker' in navigator && !isDev) {
      this.wb = new Workbox('/sw.js');
      
      // 監聽 SW 安裝事件
      this.wb.addEventListener('installed', (event) => {
        console.log('SW: Service Worker 已安裝', event);
        if (!event.isUpdate) {
          console.log('SW: 首次安裝完成');
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
          
          // 添加延遲避免競爭條件，並確保翻譯已緩存
          setTimeout(async () => {
            try {
              // 確保翻譯文件已緩存
              await this.ensureTranslationsCached();
              console.log('SW: 翻譯文件已確保緩存，準備重新載入');
              window.location.reload();
            } catch (error) {
              console.error('SW: 緩存翻譯文件失敗，仍然重新載入:', error);
              window.location.reload();
            }
          }, 500);
        }
      });

      // 監聽 SW 錯誤事件
      this.wb.addEventListener('redundant', () => {
        console.warn('SW: Service Worker 變為冗餘');
      });

      // 註冊 Service Worker
      this.wb.register().then((registration) => {
        console.log('SW 註冊成功:', registration);
        
        // 清除重啟計數器（成功註冊後）
        setTimeout(() => {
          sessionStorage.removeItem('pwa_restart_count');
        }, 5000);
        
      }).catch((error) => {
        console.error('SW 註冊失敗:', error);
        // 如果 SW 註冊失敗，不要增加重啟計數
      });
    } else if (isDev) {
      console.log('開發模式：跳過 Service Worker 註冊');
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