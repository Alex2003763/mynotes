// iOS Safari 專用服務
// 完全繞過 PWA 和 Cache API，使用最簡單可靠的方法

interface iOSCacheItem {
  data: any;
  timestamp: number;
  url: string;
}

class iOSSafariService {
  private static readonly IOS_CACHE_PREFIX = 'ios-mynotes-';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  static isIOSSafari(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }

  // 強制初始化 - 確保關鍵資源被快取
  static async forceInitialize(): Promise<void> {
    if (!this.isIOSSafari()) return;
    
    console.log('iOS Safari: Force initializing...');
    
    try {
      // 立即載入和快取關鍵檔案
      await this.preloadCriticalFiles();
      
      // 設置基本的離線檢測
      this.setupBasicOfflineDetection();
      
      console.log('iOS Safari: Force initialization complete');
    } catch (error) {
      console.error('iOS Safari: Force initialization failed:', error);
    }
  }

  // 預載入關鍵檔案
  private static async preloadCriticalFiles(): Promise<void> {
    const criticalFiles = [
      '/locales/en.json',
      '/locales/zh.json'
    ];

    const baseUrl = window.location.origin;
    
    for (const file of criticalFiles) {
      try {
        console.log(`iOS Safari: Loading ${file}...`);
        
        const response = await fetch(`${baseUrl}${file}`, {
          method: 'GET',
          cache: 'no-cache', // 強制從網路載入
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.text();
          
          // 直接存到 localStorage
          const cacheItem: iOSCacheItem = {
            data: data,
            timestamp: Date.now(),
            url: file
          };
          
          const cacheKey = `${this.IOS_CACHE_PREFIX}${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
          
          console.log(`iOS Safari: Cached ${file} successfully`);
        } else {
          console.error(`iOS Safari: Failed to load ${file}, status: ${response.status}`);
        }
      } catch (error) {
        console.error(`iOS Safari: Error loading ${file}:`, error);
      }
    }
  }

  // 獲取快取的檔案
  static getCachedFile(filePath: string): string | null {
    if (!this.isIOSSafari()) return null;
    
    try {
      const cacheKey = `${this.IOS_CACHE_PREFIX}${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const cacheItem: iOSCacheItem = JSON.parse(cached);
      
      // 檢查是否過期
      if (Date.now() - cacheItem.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`iOS Safari: Retrieved cached ${filePath}`);
      return cacheItem.data;
    } catch (error) {
      console.error(`iOS Safari: Error retrieving cached ${filePath}:`, error);
      return null;
    }
  }

  // 設置基本的離線檢測
  private static setupBasicOfflineDetection(): void {
    const handleOffline = () => {
      console.log('iOS Safari: Gone offline');
      document.body.classList.add('ios-offline');
    };

    const handleOnline = () => {
      console.log('iOS Safari: Back online');
      document.body.classList.remove('ios-offline');
      // 重新載入關鍵資源
      this.preloadCriticalFiles();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // 初始狀態
    if (!navigator.onLine) {
      handleOffline();
    }
  }

  // 清除所有 iOS 快取
  static clearAll(): void {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.IOS_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`iOS Safari: Cleared ${keysToRemove.length} cache items`);
    } catch (error) {
      console.error('iOS Safari: Failed to clear cache:', error);
    }
  }

  // 獲取快取狀態
  static getCacheStatus(): {
    isIOSSafari: boolean;
    cachedFiles: string[];
    cacheSize: number;
  } {
    const cachedFiles = [];
    let cacheSize = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.IOS_CACHE_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            cachedFiles.push(key.replace(this.IOS_CACHE_PREFIX, ''));
            cacheSize += data.length;
          }
        }
      }
    } catch (error) {
      console.error('iOS Safari: Error getting cache status:', error);
    }

    return {
      isIOSSafari: this.isIOSSafari(),
      cachedFiles,
      cacheSize
    };
  }
}

export default iOSSafariService;