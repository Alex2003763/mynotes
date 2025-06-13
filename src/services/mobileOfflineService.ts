import TranslationCacheService from './translationCacheService';
import { Language } from '../types';

class MobileOfflineService {
  private static instance: MobileOfflineService;
  private isInitialized = false;

  static getInstance(): MobileOfflineService {
    if (!MobileOfflineService.instance) {
      MobileOfflineService.instance = new MobileOfflineService();
    }
    return MobileOfflineService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('MobileOffline: 初始化移動設備離線服務');
    
    // 確保關鍵資源被緩存
    await this.ensureCriticalResourcesCached();
    
    // 設置離線檢測
    this.setupOfflineDetection();
    
    // 設置頁面可見性處理
    this.setupVisibilityHandling();
    
    this.isInitialized = true;
    console.log('MobileOffline: 初始化完成');
  }

  private async ensureCriticalResourcesCached(): Promise<void> {
    console.log('MobileOffline: 確保關鍵資源被緩存');
    
    // 1. 確保翻譯文件在 localStorage 中
    const languages: Language[] = ['en', 'zh'];
    for (const lang of languages) {
      let translations = TranslationCacheService.getCachedTranslations(lang);
      if (!translations) {
        try {
          const response = await fetch(`/locales/${lang}.json`);
          if (response.ok) {
            translations = await response.json();
            if (translations) {
              TranslationCacheService.cacheTranslations(lang, translations);
              console.log(`MobileOffline: 緩存翻譯 ${lang}`);
            }
          }
        } catch (error) {
          console.warn(`MobileOffline: 無法載入翻譯 ${lang}:`, error);
        }
      }
    }

    // 2. 確保在瀏覽器緩存中
    if ('caches' in window) {
      try {
        const cache = await caches.open('mobile-critical-v1');
        const criticalResources = [
          '/',
          '/index.html',
          '/locales/en.json',
          '/locales/zh.json',
          '/manifest.webmanifest'
        ];

        for (const resource of criticalResources) {
          const cached = await cache.match(resource);
          if (!cached) {
            try {
              const response = await fetch(resource);
              if (response.ok) {
                await cache.put(resource, response);
                console.log(`MobileOffline: 緩存資源 ${resource}`);
              }
            } catch (error) {
              console.warn(`MobileOffline: 無法緩存 ${resource}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('MobileOffline: 瀏覽器緩存失敗:', error);
      }
    }
  }

  private setupOfflineDetection(): void {
    // 更準確的離線檢測
    const checkRealConnectivity = async (): Promise<boolean> => {
      if (!navigator.onLine) return false;
      
      try {
        // 嘗試請求一個小文件來測試真實連接
        const response = await fetch('/manifest.webmanifest', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    const handleOffline = () => {
      console.log('MobileOffline: 檢測到離線狀態');
      document.body.classList.add('offline-mode');
      
      // 顯示離線提示
      this.showOfflineIndicator();
    };

    const handleOnline = async () => {
      console.log('MobileOffline: 檢測到在線狀態');
      
      // 驗證真實連接
      const isReallyOnline = await checkRealConnectivity();
      if (isReallyOnline) {
        document.body.classList.remove('offline-mode');
        this.hideOfflineIndicator();
        
        // 嘗試更新緩存
        this.updateCachesInBackground();
      } else {
        console.log('MobileOffline: 虛假在線狀態，保持離線模式');
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 初始檢查
    checkRealConnectivity().then(isOnline => {
      if (!isOnline) handleOffline();
    });
  }

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 頁面重新可見時檢查狀態
        setTimeout(() => {
          this.checkAppHealth();
        }, 1000);
      }
    });

    // 監聽頁面聚焦
    window.addEventListener('focus', () => {
      setTimeout(() => {
        this.checkAppHealth();
      }, 500);
    });
  }

  private async checkAppHealth(): Promise<void> {
    console.log('MobileOffline: 檢查應用健康度');
    
    // 檢查翻譯是否可用
    const currentLang = document.documentElement.lang as Language || 'en';
    const translations = TranslationCacheService.getCachedTranslations(currentLang);
    
    if (!translations) {
      console.warn('MobileOffline: 翻譯遺失，嘗試恢復');
      const fallbackTranslations = TranslationCacheService.getBestAvailableTranslations(currentLang);
      
      if (fallbackTranslations) {
        // 觸發重新載入翻譯
        window.dispatchEvent(new CustomEvent('translations-restored', {
          detail: { language: currentLang, translations: fallbackTranslations }
        }));
      } else {
        console.error('MobileOffline: 無法恢復翻譯');
      }
    }
  }

  private showOfflineIndicator(): void {
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #f59e0b;
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 14px;
          z-index: 9999;
        ">
          📱 離線模式 - 您可以繼續使用應用程式
        </div>
      `;
      document.body.appendChild(indicator);
    }
  }

  private hideOfflineIndicator(): void {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  private async updateCachesInBackground(): Promise<void> {
    console.log('MobileOffline: 背景更新緩存');
    
    try {
      // 更新翻譯文件
      const languages: Language[] = ['en', 'zh'];
      for (const lang of languages) {
        try {
          const response = await fetch(`/locales/${lang}.json`);
          if (response.ok) {
            const translations = await response.json();
            TranslationCacheService.cacheTranslations(lang, translations);
          }
        } catch (error) {
          console.warn(`MobileOffline: 背景更新翻譯 ${lang} 失敗:`, error);
        }
      }
    } catch (error) {
      console.warn('MobileOffline: 背景更新失敗:', error);
    }
  }

  // 手動觸發離線模式測試
  testOfflineMode(): void {
    console.log('MobileOffline: 測試離線模式');
    this.showOfflineIndicator();
    document.body.classList.add('offline-mode');
    
    setTimeout(() => {
      this.hideOfflineIndicator();
      document.body.classList.remove('offline-mode');
      console.log('MobileOffline: 離線測試結束');
    }, 5000);
  }
}

export default MobileOfflineService;