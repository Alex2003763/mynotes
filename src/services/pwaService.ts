import { Workbox } from 'workbox-window';

class PWAService {
  private wb: Workbox | null = null;
  private updateAvailable = false;

  init() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');
      
      // 監聽 SW 更新事件
      this.wb.addEventListener('waiting', () => {
        this.updateAvailable = true;
        this.showUpdateNotification();
      });

      // 監聽 SW 控制事件
      this.wb.addEventListener('controlling', () => {
        window.location.reload();
      });

      // 註冊 Service Worker
      this.wb.register().then((registration) => {
        console.log('SW 註冊成功:', registration);
      }).catch((error) => {
        console.error('SW 註冊失敗:', error);
      });
    }
  }

  private showUpdateNotification() {
    if (confirm('發現新版本，是否立即更新？')) {
      this.skipWaiting();
    }
  }

  skipWaiting() {
    if (this.wb && this.updateAvailable) {
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