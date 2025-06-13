import TranslationCacheService from './translationCacheService';
import { Language } from '../types';

interface AppState {
  isOnline: boolean;
  lastOnlineTime: number;
  recoveryInProgress: boolean;
}

class OfflineRecoveryService {
  private static instance: OfflineRecoveryService;
  private state: AppState = {
    isOnline: navigator.onLine,
    lastOnlineTime: Date.now(),
    recoveryInProgress: false
  };
  private listeners: Array<(isOnline: boolean) => void> = [];

  static getInstance(): OfflineRecoveryService {
    if (!OfflineRecoveryService.instance) {
      OfflineRecoveryService.instance = new OfflineRecoveryService();
    }
    return OfflineRecoveryService.instance;
  }

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 定期檢查網絡狀態
    setInterval(() => {
      this.checkConnectionStatus();
    }, 30000); // 每30秒檢查一次
  }

  private async handleOnline(): Promise<void> {
    console.log('OfflineRecovery: Connection restored');
    this.state.isOnline = true;
    this.state.lastOnlineTime = Date.now();
    
    // 通知監聽器
    this.notifyListeners(true);
    
    // 開始恢復程序
    await this.performRecovery();
  }

  private handleOffline(): void {
    console.log('OfflineRecovery: Connection lost');
    this.state.isOnline = false;
    
    // 通知監聽器
    this.notifyListeners(false);
    
    // 確保離線資源可用
    this.ensureOfflineResources();
  }

  private async checkConnectionStatus(): Promise<void> {
    const wasOnline = this.state.isOnline;
    const isCurrentlyOnline = navigator.onLine;
    
    if (!wasOnline && isCurrentlyOnline) {
      // 從離線變為在線
      await this.handleOnline();
    } else if (wasOnline && !isCurrentlyOnline) {
      // 從在線變為離線
      this.handleOffline();
    }
  }

  private async performRecovery(): Promise<void> {
    if (this.state.recoveryInProgress) {
      console.log('OfflineRecovery: Recovery already in progress');
      return;
    }

    this.state.recoveryInProgress = true;
    console.log('OfflineRecovery: Starting recovery process');

    try {
      // 1. 重新載入翻譯文件
      await this.refreshTranslations();
      
      // 2. 更新 Service Worker 緩存
      await this.updateServiceWorkerCache();
      
      // 3. 檢查應用程式狀態
      await this.validateAppState();
      
      console.log('OfflineRecovery: Recovery completed successfully');
    } catch (error) {
      console.error('OfflineRecovery: Recovery failed:', error);
    } finally {
      this.state.recoveryInProgress = false;
    }
  }

  private async refreshTranslations(): Promise<void> {
    console.log('OfflineRecovery: Refreshing translations');
    
    const languages: Language[] = ['en', 'zh'];
    const updatePromises = languages.map(async (lang) => {
      try {
        const response = await fetch(`/locales/${lang}.json`, {
          cache: 'reload' // 強制重新載入
        });
        
        if (response.ok) {
          const translations = await response.json();
          TranslationCacheService.cacheTranslations(lang, translations);
          console.log(`OfflineRecovery: Updated ${lang} translations`);
        }
      } catch (error) {
        console.warn(`OfflineRecovery: Failed to update ${lang} translations:`, error);
      }
    });

    await Promise.all(updatePromises);
  }

  private async updateServiceWorkerCache(): Promise<void> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        // 向 Service Worker 發送消息請求更新
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: 'UPDATE_TRANSLATIONS'
          });
          console.log('OfflineRecovery: Service Worker update message sent');
        }
      } catch (error) {
        console.warn('OfflineRecovery: Service Worker update failed:', error);
      }
    }
  }

  private async validateAppState(): Promise<void> {
    // 檢查關鍵應用程式功能是否正常
    try {
      // 檢查翻譯系統
      const currentLang = document.documentElement.lang as Language || 'en';
      const translations = TranslationCacheService.getCachedTranslations(currentLang);
      
      if (!translations) {
        console.warn('OfflineRecovery: No translations available, attempting to reload');
        await TranslationCacheService.preloadTranslations();
      }
      
      console.log('OfflineRecovery: App state validation completed');
    } catch (error) {
      console.error('OfflineRecovery: App state validation failed:', error);
    }
  }

  private ensureOfflineResources(): void {
    console.log('OfflineRecovery: Ensuring offline resources are available');
    
    // 檢查是否有可用的緩存翻譯
    const availableLanguages = TranslationCacheService.getAvailableLanguages();
    if (availableLanguages.length === 0) {
      console.warn('OfflineRecovery: No cached translations available for offline use');
      this.showOfflineWarning();
    } else {
      console.log(`OfflineRecovery: ${availableLanguages.length} cached translation(s) available`);
    }
  }

  private showOfflineWarning(): void {
    // 顯示離線警告給用戶
    const event = new CustomEvent('offline-warning', {
      detail: {
        message: '離線模式下某些功能可能受限。請在網絡恢復後重新載入應用程式。'
      }
    });
    window.dispatchEvent(event);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('OfflineRecovery: Listener error:', error);
      }
    });
  }

  // 公共 API
  public isOnline(): boolean {
    return this.state.isOnline;
  }

  public getLastOnlineTime(): number {
    return this.state.lastOnlineTime;
  }

  public isRecoveryInProgress(): boolean {
    return this.state.recoveryInProgress;
  }

  public addConnectionListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  public removeConnectionListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public async manualRecovery(): Promise<void> {
    console.log('OfflineRecovery: Manual recovery triggered');
    await this.performRecovery();
  }
}

export default OfflineRecoveryService;