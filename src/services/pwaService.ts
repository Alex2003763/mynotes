export const pwaService = {
  /**
   * 檢查應用程式是否以 PWA 模式運行
   */
  isPWA(): boolean {
    // 檢查是否在獨立模式運行（從主屏幕啟動）
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // 檢查是否通過 Add to Home Screen 安裝
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    
    // 檢查是否在全屏模式
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return true;
    }
    
    return false;
  },

  /**
   * 檢查瀏覽器是否支援 PWA 功能
   */
  isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  },

  /**
   * 檢查應用程式是否可以被安裝
   */
  canInstall(): boolean {
    return !this.isPWA() && this.isPWASupported();
  },

  /**
   * 獲取安裝狀態
   */
  getInstallStatus(): 'installed' | 'installable' | 'not-supported' {
    if (this.isPWA()) {
      return 'installed';
    }
    
    if (this.isPWASupported()) {
      return 'installable';
    }
    
    return 'not-supported';
  },

  /**
   * 檢查 Service Worker 是否已註冊
   */
  async isServiceWorkerRegistered(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    } catch (error) {
      console.error('檢查 Service Worker 註冊狀態時出錯:', error);
      return false;
    }
  },

  /**
   * 強制更新 Service Worker
   */
  async updateServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新 Service Worker 時出錯:', error);
      return false;
    }
  },

  /**
   * 獲取快取使用情況（如果支援）
   */
  async getCacheUsage(): Promise<{ used: number; quota: number } | null> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }
    
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    } catch (error) {
      console.error('獲取快取使用情況時出錯:', error);
      return null;
    }
  }
};