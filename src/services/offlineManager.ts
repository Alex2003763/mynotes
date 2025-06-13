import { Language, Translations } from '../types';
import { Workbox } from 'workbox-window';

/**
 * 統一的離線模式管理器
 * 整合 Workbox 和應用離線功能，提供一致的 API 和狀態管理
 */

interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  lastOnlineTime: number;
  reconnectAttempts: number;
  swState: 'installing' | 'waiting' | 'controlling' | 'redundant' | 'error' | null;
  cacheStatus: {
    translations: boolean;
    assets: boolean;
    data: boolean;
  };
}

interface OfflineConfig {
  maxReconnectAttempts: number;
  reconnectInterval: number;
  connectionCheckUrl: string;
  workboxCacheNames: {
    translations: string;
    pages: string;
    static: string;
    images: string;
  };
}

type OfflineEventType = 'online' | 'offline' | 'ready' | 'error' | 'cache-updated' | 'update-available' | 'update-applied';

interface OfflineEvent {
  type: OfflineEventType;
  detail?: any;
  timestamp: number;
}

class OfflineManager {
  private static instance: OfflineManager;
  private wb: Workbox | null = null;
  
  private config: OfflineConfig = {
    maxReconnectAttempts: 5,
    reconnectInterval: 30000, // 30秒
    connectionCheckUrl: '/manifest.webmanifest',
    workboxCacheNames: {
      translations: 'mynotes-translations-v1',
      pages: 'mynotes-pages-v1',
      static: 'mynotes-static-v1',
      images: 'mynotes-images-v1'
    }
  };
  
  private state: OfflineState = {
    isOnline: navigator.onLine,
    isOfflineReady: false,
    lastOnlineTime: Date.now(),
    reconnectAttempts: 0,
    swState: null,
    cacheStatus: {
      translations: false,
      assets: false,
      data: false
    }
  };
  
  private listeners: Array<(event: OfflineEvent) => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionCheckTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * 初始化離線管理器
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('OfflineManager: Already initialized');
      return;
    }

    console.log('OfflineManager: Initializing...');
    
    try {
      // 初始化 Workbox
      await this.initializeWorkbox();
      
      // 設置事件監聽器
      this.setupEventListeners();
      
      // 初始化緩存
      await this.initializeCaches();
      
      // 檢查初始狀態
      await this.checkConnectionStatus();
      
      // 驗證離線準備狀態
      await this.validateOfflineReadiness();
      
      this.isInitialized = true;
      this.emit('ready', { state: this.state });
      
      console.log('OfflineManager: Initialization completed', this.state);
    } catch (error) {
      console.error('OfflineManager: Initialization failed:', error);
      this.emit('error', { error, phase: 'initialization' });
    }
  }

  /**
   * 初始化 Workbox
   */
  private async initializeWorkbox(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('OfflineManager: Service Worker not supported');
      return;
    }

    try {
      this.wb = new Workbox('/sw.js');
      
      // 監聽 Workbox 事件
      this.wb.addEventListener('installed', (event) => {
        this.state.swState = 'installing';
        console.log('OfflineManager: SW installed', event);
        
        if (!event.isUpdate) {
          console.log('OfflineManager: SW first time installation');
          this.emit('cache-updated', { type: 'first-install' });
        }
      });

      this.wb.addEventListener('waiting', (event) => {
        this.state.swState = 'waiting';
        console.log('OfflineManager: SW waiting for activation', event);
        this.emit('update-available', { wb: this.wb });
      });

      this.wb.addEventListener('controlling', (event) => {
        this.state.swState = 'controlling';
        console.log('OfflineManager: SW controlling', event);
        this.emit('update-applied', {});
      });

      this.wb.addEventListener('activated', (event) => {
        this.state.swState = 'controlling';
        console.log('OfflineManager: SW activated', event);
      });

      this.wb.addEventListener('redundant', (event) => {
        this.state.swState = 'redundant';
        console.log('OfflineManager: SW redundant', event);
      });

      // 註冊 Service Worker
      const registration = await this.wb.register();
      console.log('OfflineManager: Workbox registered successfully', registration);
      
    } catch (error) {
      console.error('OfflineManager: Workbox initialization failed:', error);
      this.state.swState = 'error';
      throw error;
    }
  }

  /**
   * 設置事件監聽器
   */
  private setupEventListeners(): void {
    // 網絡狀態監聽
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // 頁面可見性監聽
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // 頁面聚焦監聽
    window.addEventListener('focus', this.handlePageFocus.bind(this));
    
    // Service Worker 消息監聽
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage.bind(this));
    }
  }

  /**
   * 初始化所有緩存
   */
  private async initializeCaches(): Promise<void> {
    const tasks = [
      this.initializeTranslationCache(),
      this.initializeAssetCache(),
      this.initializeDataCache()
    ];
    
    const results = await Promise.allSettled(tasks);
    
    results.forEach((result, index) => {
      const cacheType = ['translations', 'assets', 'data'][index] as keyof typeof this.state.cacheStatus;
      this.state.cacheStatus[cacheType] = result.status === 'fulfilled';
      
      if (result.status === 'rejected') {
        console.warn(`OfflineManager: ${cacheType} cache initialization failed:`, result.reason);
      }
    });
  }

  /**
   * 初始化翻譯緩存
   */
  private async initializeTranslationCache(): Promise<void> {
    const languages: Language[] = ['en', 'zh'];
    
    if (!('caches' in window)) {
      // 降級到 localStorage
      await this.initializeTranslationLocalStorage(languages);
      return;
    }

    const cache = await caches.open(this.config.workboxCacheNames.translations);
    
    for (const lang of languages) {
      try {
        const url = `/locales/${lang}.json`;
        let cached = await cache.match(url);
        
        if (!cached) {
          // 嘗試從網絡載入
          if (this.state.isOnline) {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
              cached = response;
            }
          }
        }
        
        // 同時緩存到 localStorage 作為備份
        if (cached) {
          const translations = await cached.json();
          this.cacheTranslationsToLocalStorage(lang, translations);
        }
        
      } catch (error) {
        console.warn(`OfflineManager: Failed to cache ${lang} translations:`, error);
      }
    }
  }

  /**
   * 初始化翻譯 localStorage 緩存
   */
  private async initializeTranslationLocalStorage(languages: Language[]): Promise<void> {
    for (const lang of languages) {
      try {
        const cached = this.getTranslationsFromLocalStorage(lang);
        if (!cached && this.state.isOnline) {
          const response = await fetch(`/locales/${lang}.json`);
          if (response.ok) {
            const translations = await response.json();
            this.cacheTranslationsToLocalStorage(lang, translations);
          }
        }
      } catch (error) {
        console.warn(`OfflineManager: Failed to cache ${lang} to localStorage:`, error);
      }
    }
  }

  /**
   * 初始化資源緩存
   */
  private async initializeAssetCache(): Promise<void> {
    if (!('caches' in window)) return;

    const cache = await caches.open(this.config.workboxCacheNames.static);
    const essentialAssets = [
      '/',
      '/index.html',
      '/offline.html',
      '/manifest.webmanifest',
      '/pencil.png'
    ];

    for (const asset of essentialAssets) {
      try {
        const cached = await cache.match(asset);
        if (!cached && this.state.isOnline) {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response);
          }
        }
      } catch (error) {
        console.warn(`OfflineManager: Failed to cache asset ${asset}:`, error);
      }
    }
  }

  /**
   * 初始化數據緩存
   */
  private async initializeDataCache(): Promise<void> {
    // 這裡可以緩存筆記數據等
    // 目前主要依靠 IndexedDB，此處做備用緩存
    console.log('OfflineManager: Data cache initialized');
  }

  /**
   * 處理在線事件
   */
  private async handleOnline(): Promise<void> {
    console.log('OfflineManager: Network connection restored');
    
    const wasOffline = !this.state.isOnline;
    this.state.isOnline = true;
    this.state.lastOnlineTime = Date.now();
    this.state.reconnectAttempts = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 驗證真實連接
    const isReallyOnline = await this.verifyConnection();
    if (isReallyOnline) {
      this.emit('online', { wasOffline });
      
      // 更新緩存
      if (wasOffline) {
        this.updateCachesInBackground();
      }
    } else {
      // 虛假在線，保持離線狀態
      this.state.isOnline = false;
      console.log('OfflineManager: False online state detected');
    }
  }

  /**
   * 處理離線事件
   */
  private handleOffline(): void {
    console.log('OfflineManager: Network connection lost');
    
    this.state.isOnline = false;
    this.emit('offline', { lastOnlineTime: this.state.lastOnlineTime });
    
    // 開始重連嘗試
    this.startReconnectAttempts();
  }

  /**
   * 處理頁面可見性變化
   */
  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // 頁面重新可見，檢查狀態
      setTimeout(() => {
        this.checkConnectionStatus();
        this.validateOfflineReadiness();
      }, 1000);
    }
  }

  /**
   * 處理頁面聚焦
   */
  private handlePageFocus(): void {
    setTimeout(() => {
      this.checkConnectionStatus();
    }, 500);
  }

  /**
   * 處理 Service Worker 消息
   */
  private handleSWMessage(event: MessageEvent): void {
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'CACHE_UPDATED':
        this.emit('cache-updated', data);
        break;
      case 'OFFLINE_FALLBACK':
        console.log('OfflineManager: SW triggered offline fallback');
        break;
    }
  }

  /**
   * 檢查連接狀態
   */
  async checkConnectionStatus(): Promise<void> {
    const isOnline = await this.verifyConnection();
    
    if (isOnline !== this.state.isOnline) {
      if (isOnline) {
        await this.handleOnline();
      } else {
        this.handleOffline();
      }
    }
  }

  /**
   * 驗證網絡連接
   */
  private async verifyConnection(): Promise<boolean> {
    if (!navigator.onLine) return false;
    
    try {
      const response = await fetch(this.config.connectionCheckUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5秒超時
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 開始重連嘗試
   */
  private startReconnectAttempts(): void {
    if (this.reconnectTimer || this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectTimer = setTimeout(async () => {
      this.state.reconnectAttempts++;
      console.log(`OfflineManager: Reconnect attempt ${this.state.reconnectAttempts}`);
      
      const isOnline = await this.verifyConnection();
      if (isOnline) {
        await this.handleOnline();
      } else if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.startReconnectAttempts();
      } else {
        console.log('OfflineManager: Max reconnect attempts reached');
      }
      
      this.reconnectTimer = null;
    }, this.config.reconnectInterval);
  }

  /**
   * 驗證離線準備狀態
   */
  private async validateOfflineReadiness(): Promise<void> {
    const hasTranslations = this.state.cacheStatus.translations || this.hasLocalStorageTranslations();
    const hasAssets = this.state.cacheStatus.assets;
    
    this.state.isOfflineReady = hasTranslations; // 最低要求：有翻譯緩存
    
    console.log('OfflineManager: Offline readiness check:', {
      hasTranslations,
      hasAssets,
      isReady: this.state.isOfflineReady
    });
  }

  /**
   * 檢查 localStorage 是否有翻譯
   */
  private hasLocalStorageTranslations(): boolean {
    try {
      const enCache = localStorage.getItem('translations_en');
      const zhCache = localStorage.getItem('translations_zh');
      return !!(enCache || zhCache);
    } catch {
      return false;
    }
  }

  /**
   * 背景更新緩存
   */
  private async updateCachesInBackground(): Promise<void> {
    console.log('OfflineManager: Updating caches in background...');
    
    try {
      await Promise.allSettled([
        this.updateTranslationCache(),
        this.updateAssetCache()
      ]);
      
      this.emit('cache-updated', { timestamp: Date.now() });
    } catch (error) {
      console.warn('OfflineManager: Background cache update failed:', error);
    }
  }

  /**
   * 更新翻譯緩存
   */
  private async updateTranslationCache(): Promise<void> {
    const languages: Language[] = ['en', 'zh'];
    
    for (const lang of languages) {
      try {
        const response = await fetch(`/locales/${lang}.json`, { cache: 'reload' });
        if (response.ok) {
          const translations = await response.json();
          
          // 更新 Cache API
          if ('caches' in window) {
            const cache = await caches.open(this.config.workboxCacheNames.translations);
            await cache.put(`/locales/${lang}.json`, response.clone());
          }
          
          // 更新 localStorage
          this.cacheTranslationsToLocalStorage(lang, translations);
        }
      } catch (error) {
        console.warn(`OfflineManager: Failed to update ${lang} translations:`, error);
      }
    }
  }

  /**
   * 更新資源緩存
   */
  private async updateAssetCache(): Promise<void> {
    if (!('caches' in window)) return;
    
    // 通知 Service Worker 更新緩存
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'UPDATE_CACHE',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * LocalStorage 翻譯操作
   */
  private cacheTranslationsToLocalStorage(language: Language, translations: Translations): void {
    try {
      const cacheData = {
        data: translations,
        timestamp: Date.now(),
        language
      };
      localStorage.setItem(`translations_${language}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn(`OfflineManager: Failed to cache ${language} to localStorage:`, error);
    }
  }

  private getTranslationsFromLocalStorage(language: Language): Translations | null {
    try {
      const cached = localStorage.getItem(`translations_${language}`);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      // 30天過期
      if (Date.now() - parsed.timestamp > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`translations_${language}`);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * 事件發射器
   */
  private emit(type: OfflineEventType, detail?: any): void {
    const event: OfflineEvent = {
      type,
      detail,
      timestamp: Date.now()
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('OfflineManager: Listener error:', error);
      }
    });
  }

  // 公共 API

  /**
   * 添加事件監聽器
   */
  addEventListener(listener: (event: OfflineEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除事件監聽器
   */
  removeEventListener(listener: (event: OfflineEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 獲取當前狀態
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * 檢查是否在線
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * 檢查是否離線準備就緒
   */
  isOfflineReady(): boolean {
    return this.state.isOfflineReady;
  }

  /**
   * 獲取翻譯（支持離線）
   */
  getTranslations(language: Language): Translations | null {
    // 優先從 localStorage 獲取（更快）
    let translations = this.getTranslationsFromLocalStorage(language);
    if (translations) return translations;
    
    // 降級到其他語言
    const fallbackLang = language === 'en' ? 'zh' : 'en';
    translations = this.getTranslationsFromLocalStorage(fallbackLang);
    if (translations) {
      console.log(`OfflineManager: Using ${fallbackLang} fallback translations`);
      return translations;
    }
    
    return null;
  }

  /**
   * 手動刷新緩存
   */
  async refreshCache(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error('Cannot refresh cache while offline');
    }
    
    await this.updateCachesInBackground();
  }

  /**
   * 清除所有緩存
   */
  async clearCache(): Promise<void> {
    // 清除 Cache API
    if ('caches' in window) {
      const cacheNames = Object.values(this.config.workboxCacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // 清除 localStorage
    const keys = ['translations_en', 'translations_zh'];
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`OfflineManager: Failed to remove ${key}:`, error);
      }
    });
    
    // 重置狀態
    this.state.cacheStatus = {
      translations: false,
      assets: false,
      data: false
    };
    this.state.isOfflineReady = false;
    
    console.log('OfflineManager: Cache cleared');
  }

  /**
   * 手動應用 Service Worker 更新
   */
  async applyUpdate(): Promise<void> {
    if (this.wb && this.state.swState === 'waiting') {
      this.wb.messageSkipWaiting();
      console.log('OfflineManager: Update applied manually');
    }
  }

  /**
   * 獲取 Workbox 實例
   */
  getWorkbox(): Workbox | null {
    return this.wb;
  }

  /**
   * 銷毀實例
   */
  destroy(): void {
    // 清除定時器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.connectionCheckTimer) {
      clearTimeout(this.connectionCheckTimer);
    }
    
    // 移除事件監聽器
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('focus', this.handlePageFocus.bind(this));
    
    // 清空監聽器
    this.listeners = [];
    this.isInitialized = false;
    
    console.log('OfflineManager: Destroyed');
  }
}

export default OfflineManager;