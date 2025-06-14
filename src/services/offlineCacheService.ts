import { Note, AppSettings } from '../types';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: string;
  checksum?: string;
}

interface CacheMetadata {
  version: string;
  lastSync: number;
  isOffline: boolean;
  cacheKeys: string[];
}

class OfflineCacheService {
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly CACHE_NAME_PREFIX = 'mynotes-offline-';
  private static readonly METADATA_KEY = 'mynotes-cache-metadata';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  private static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * 初始化離線快取系統
   */
  static async initialize(): Promise<void> {
    console.log('Offline Cache: Initializing...');
    
    try {
      // 檢查瀏覽器支援
      if (!('caches' in window) || !('indexedDB' in window)) {
        console.warn('Offline Cache: Browser does not support required APIs');
        return;
      }

      // 檢查是否為 HTTPS 或 localhost（Service Worker 要求）
      const isSecureContext = window.isSecureContext ||
                             location.protocol === 'https:' ||
                             location.hostname === 'localhost' ||
                             location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        console.warn('Offline Cache: Secure context required for full functionality');
      }

      // iOS Safari 特殊處理
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOSSafari) {
        console.log('Offline Cache: iOS Safari detected, using compatible mode');
      }

      // 清理過期的快取
      await this.cleanupExpiredCaches();
      
      // 設置離線監聽器
      this.setupOfflineListeners();
      
      // 預載入關鍵資源（在安全上下文中，但跳過 iOS Safari 的問題）
      if (isSecureContext && !isIOSSafari) {
        await this.preloadCriticalResources();
      } else if (isIOSSafari) {
        // iOS Safari 使用簡化的預載入
        await this.preloadCriticalResourcesForIOS();
      }
      
      // 嘗試註冊 Service Worker（包括 iOS）
      try {
        await this.registerServiceWorker();
      } catch (error) {
        console.warn('Offline Cache: Service Worker registration failed, using fallbacks', error);
      }
      
      console.log('Offline Cache: Initialized successfully');
    } catch (error) {
      console.error('Offline Cache: Initialization failed:', error);
    }
  }

  /**
   * 緩存筆記數據
   */
  static async cacheNotes(notes: Note[]): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_NAME_PREFIX}notes`;
      const cache = await caches.open(cacheKey);
      
      const cacheItem: CacheItem<Note[]> = {
        data: notes,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
        checksum: await this.generateChecksum(notes)
      };

      const response = new Response(JSON.stringify(cacheItem), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=31536000' // 1 year
        }
      });

      await cache.put('/notes-data', response);
      
      // 同時存儲到 localStorage 作為備份
      localStorage.setItem('mynotes-notes-backup', JSON.stringify(cacheItem));
      
      // 更新元數據
      await this.updateCacheMetadata('notes');
      
      console.log(`Offline Cache: Cached ${notes.length} notes`);
    } catch (error) {
      console.warn('Offline Cache: Failed to cache notes:', error);
    }
  }

  /**
   * 獲取緩存的筆記數據
   */
  static async getCachedNotes(): Promise<Note[] | null> {
    try {
      // 首先嘗試從 Cache API 獲取
      const cacheKey = `${this.CACHE_NAME_PREFIX}notes`;
      const cache = await caches.open(cacheKey);
      const response = await cache.match('/notes-data');
      
      if (response) {
        const cacheItem: CacheItem<Note[]> = await response.json();
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log('Offline Cache: Retrieved notes from cache API');
          return cacheItem.data;
        }
      }

      // 如果 Cache API 失敗，嘗試從 localStorage 獲取
      const backupData = localStorage.getItem('mynotes-notes-backup');
      if (backupData) {
        const cacheItem: CacheItem<Note[]> = JSON.parse(backupData);
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log('Offline Cache: Retrieved notes from localStorage backup');
          return cacheItem.data;
        }
      }

      return null;
    } catch (error) {
      console.warn('Offline Cache: Failed to retrieve cached notes:', error);
      return null;
    }
  }

  /**
   * 緩存應用設置
   */
  static async cacheSettings(settings: AppSettings): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_NAME_PREFIX}settings`;
      const cache = await caches.open(cacheKey);
      
      const cacheItem: CacheItem<AppSettings> = {
        data: settings,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };

      const response = new Response(JSON.stringify(cacheItem), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=31536000'
        }
      });

      await cache.put('/settings-data', response);
      
      // 備份到 localStorage
      localStorage.setItem('mynotes-settings-backup', JSON.stringify(cacheItem));
      
      await this.updateCacheMetadata('settings');
      
      console.log('Offline Cache: Cached settings');
    } catch (error) {
      console.warn('Offline Cache: Failed to cache settings:', error);
    }
  }

  /**
   * 獲取緩存的應用設置
   */
  static async getCachedSettings(): Promise<AppSettings | null> {
    try {
      const cacheKey = `${this.CACHE_NAME_PREFIX}settings`;
      const cache = await caches.open(cacheKey);
      const response = await cache.match('/settings-data');
      
      if (response) {
        const cacheItem: CacheItem<AppSettings> = await response.json();
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log('Offline Cache: Retrieved settings from cache API');
          return cacheItem.data;
        }
      }

      // 備份方案
      const backupData = localStorage.getItem('mynotes-settings-backup');
      if (backupData) {
        const cacheItem: CacheItem<AppSettings> = JSON.parse(backupData);
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log('Offline Cache: Retrieved settings from localStorage backup');
          return cacheItem.data;
        }
      }

      return null;
    } catch (error) {
      console.warn('Offline Cache: Failed to retrieve cached settings:', error);
      return null;
    }
  }

  /**
   * 緩存翻譯數據（增強版）
   */
  static async cacheTranslations(language: string, translations: any): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_NAME_PREFIX}translations`;
      const cache = await caches.open(cacheKey);
      
      const cacheItem: CacheItem<any> = {
        data: translations,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
        checksum: await this.generateChecksum(translations)
      };

      const response = new Response(JSON.stringify(cacheItem), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=31536000'
        }
      });

      await cache.put(`/translations-${language}`, response);
      
      // 備份到 localStorage
      localStorage.setItem(`mynotes-translations-${language}-backup`, JSON.stringify(cacheItem));
      
      await this.updateCacheMetadata(`translations-${language}`);
      
      console.log(`Offline Cache: Cached translations for ${language}`);
    } catch (error) {
      console.warn(`Offline Cache: Failed to cache translations for ${language}:`, error);
    }
  }

  /**
   * 獲取緩存的翻譯數據
   */
  static async getCachedTranslations(language: string): Promise<any | null> {
    try {
      const cacheKey = `${this.CACHE_NAME_PREFIX}translations`;
      const cache = await caches.open(cacheKey);
      const response = await cache.match(`/translations-${language}`);
      
      if (response) {
        const cacheItem: CacheItem<any> = await response.json();
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log(`Offline Cache: Retrieved translations for ${language} from cache API`);
          return cacheItem.data;
        }
      }

      // 備份方案
      const backupData = localStorage.getItem(`mynotes-translations-${language}-backup`);
      if (backupData) {
        const cacheItem: CacheItem<any> = JSON.parse(backupData);
        
        if (this.isValidCacheItem(cacheItem)) {
          console.log(`Offline Cache: Retrieved translations for ${language} from localStorage backup`);
          return cacheItem.data;
        }
      }

      return null;
    } catch (error) {
      console.warn(`Offline Cache: Failed to retrieve cached translations for ${language}:`, error);
      return null;
    }
  }

  /**
   * 檢查 Service Worker 狀態（由 Vite PWA 插件處理註冊）
   */
  private static async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Offline Cache: Service Worker not supported');
      return;
    }

    try {
      // 檢查是否已有 Service Worker 註冊（由 Vite PWA 處理）
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Offline Cache: Service Worker already registered by Vite PWA', registration.scope);
        
        // 監聽 SW 更新
        registration.addEventListener('updatefound', () => {
          console.log('Offline Cache: Service Worker update found');
        });
      } else {
        console.log('Offline Cache: Waiting for Vite PWA to register Service Worker');
      }
      
    } catch (error) {
      console.warn('Offline Cache: Service Worker check failed:', error);
    }
  }

  /**
   * 預載入關鍵資源
   */
  private static async preloadCriticalResources(): Promise<void> {
    if (!this.isOnline()) {
      console.log('Offline Cache: Skipping preload - offline');
      return;
    }

    try {
      const cache = await caches.open(`${this.CACHE_NAME_PREFIX}static`);
      
      // 使用絕對 URL 以避免跨域問題
      const baseUrl = window.location.origin;
      const criticalUrls = [
        `${baseUrl}/`,
        `${baseUrl}/index.html`,
        `${baseUrl}/locales/en.json`,
        `${baseUrl}/locales/zh.json`
      ];

      const preloadPromises = criticalUrls.map(async (url) => {
        try {
          const cachedResponse = await cache.match(url);
          if (!cachedResponse) {
            const response = await fetch(url, {
              mode: 'cors',
              credentials: 'same-origin'
            });
            if (response.ok) {
              await cache.put(url, response.clone());
              console.log(`Offline Cache: Preloaded ${url}`);
            } else {
              console.warn(`Offline Cache: Failed to preload ${url}, status: ${response.status}`);
            }
          }
        } catch (error) {
          console.warn(`Offline Cache: Failed to preload ${url}:`, error);
        }
      });

      await Promise.all(preloadPromises);
    } catch (error) {
      console.warn('Offline Cache: Failed to preload critical resources:', error);
    }
  }

  /**
   * 設置離線狀態監聽器
   */
  private static setupOfflineListeners(): void {
    const updateOnlineStatus = async () => {
      const metadata = await this.getCacheMetadata();
      metadata.isOffline = !navigator.onLine;
      await this.setCacheMetadata(metadata);
      
      if (navigator.onLine) {
        console.log('Offline Cache: Back online, syncing...');
        // 觸發同步邏輯
        window.dispatchEvent(new CustomEvent('cache-back-online'));
      } else {
        console.log('Offline Cache: Gone offline, using cached data');
        window.dispatchEvent(new CustomEvent('cache-offline-mode'));
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // 初始狀態檢查
    updateOnlineStatus();
  }

  /**
   * 清理過期的快取
   */
  private static async cleanupExpiredCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const myNotesCaches = cacheNames.filter(name => name.startsWith(this.CACHE_NAME_PREFIX));
      
      for (const cacheName of myNotesCaches) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            try {
              const cacheItem: CacheItem<any> = await response.json();
              
              if (!this.isValidCacheItem(cacheItem)) {
                await cache.delete(request);
                console.log(`Offline Cache: Cleaned up expired cache entry: ${request.url}`);
              }
            } catch (error) {
              // 如果無法解析，刪除該條目
              await cache.delete(request);
            }
          }
        }
      }
      
      // 清理 localStorage 中的過期備份
      this.cleanupLocalStorageBackups();
      
    } catch (error) {
      console.warn('Offline Cache: Failed to cleanup expired caches:', error);
    }
  }

  /**
   * 清理 localStorage 備份
   */
  private static cleanupLocalStorageBackups(): void {
    try {
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mynotes-') && key.endsWith('-backup')) {
          keysToCheck.push(key);
        }
      }

      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const cacheItem: CacheItem<any> = JSON.parse(data);
            if (!this.isValidCacheItem(cacheItem)) {
              localStorage.removeItem(key);
              console.log(`Offline Cache: Cleaned up expired localStorage backup: ${key}`);
            }
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Offline Cache: Failed to cleanup localStorage backups:', error);
    }
  }

  /**
   * 驗證快取項目是否有效
   */
  private static isValidCacheItem(cacheItem: CacheItem<any>): boolean {
    if (!cacheItem || typeof cacheItem !== 'object') {
      return false;
    }

    const now = Date.now();
    const isExpired = (now - cacheItem.timestamp) > this.CACHE_EXPIRY;
    const isVersionValid = cacheItem.version === this.CACHE_VERSION;

    return !isExpired && isVersionValid;
  }

  /**
   * 生成資料校驗和
   */
  private static async generateChecksum(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // 如果不支援 crypto.subtle，使用簡單的雜湊
      return btoa(JSON.stringify(data)).slice(0, 32);
    }
  }

  /**
   * 更新快取元數據
   */
  private static async updateCacheMetadata(cacheKey: string): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      
      if (!metadata.cacheKeys.includes(cacheKey)) {
        metadata.cacheKeys.push(cacheKey);
      }
      
      metadata.lastSync = Date.now();
      
      await this.setCacheMetadata(metadata);
    } catch (error) {
      console.warn('Offline Cache: Failed to update metadata:', error);
    }
  }

  /**
   * 獲取快取元數據
   */
  private static async getCacheMetadata(): Promise<CacheMetadata> {
    try {
      const stored = localStorage.getItem(this.METADATA_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Offline Cache: Failed to get metadata:', error);
    }

    return {
      version: this.CACHE_VERSION,
      lastSync: Date.now(),
      isOffline: !navigator.onLine,
      cacheKeys: []
    };
  }

  /**
   * 設置快取元數據
   */
  private static async setCacheMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Offline Cache: Failed to set metadata:', error);
    }
  }

  /**
   * 獲取快取狀態資訊
   */
  static async getCacheStatus(): Promise<{
    isOffline: boolean;
    lastSync: number;
    cacheSize: number;
    availableData: string[];
  }> {
    const metadata = await this.getCacheMetadata();
    
    // 估算快取大小
    let cacheSize = 0;
    try {
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        cacheSize = estimate.usage || 0;
      }
    } catch (error) {
      // 忽略錯誤
    }

    return {
      isOffline: metadata.isOffline,
      lastSync: metadata.lastSync,
      cacheSize,
      availableData: metadata.cacheKeys
    };
  }

  /**
   * 清除所有快取
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // 清除 Cache API
      const cacheNames = await caches.keys();
      const myNotesCaches = cacheNames.filter(name => name.startsWith(this.CACHE_NAME_PREFIX));
      
      await Promise.all(myNotesCaches.map(name => caches.delete(name)));
      
      // 清除 localStorage 備份
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mynotes-') || key === this.METADATA_KEY)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Offline Cache: Cleared all caches');
    } catch (error) {
      console.error('Offline Cache: Failed to clear caches:', error);
    }
  }

  /**
   * iOS Safari 專用的簡化預載入
   */
  private static async preloadCriticalResourcesForIOS(): Promise<void> {
    if (!this.isOnline()) {
      console.log('Offline Cache: Skipping iOS preload - offline');
      return;
    }

    try {
      // iOS Safari 對 Cache API 有限制，使用 localStorage 作為主要快取
      const baseUrl = window.location.origin;
      const criticalUrls = [
        `${baseUrl}/`,
        `${baseUrl}/index.html`,
        `${baseUrl}/manifest.json`,
        `${baseUrl}/locales/en.json`,
        `${baseUrl}/locales/zh.json`
      ];

      const preloadPromises = criticalUrls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'same-origin',
            cache: 'default'
          });
          
          if (response.ok) {
            const data = await response.text();
            // 為 iOS 建立更可靠的快取鍵名
            const cacheKey = `ios-cache-${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
            try {
              // 使用更小的儲存方式
              localStorage.setItem(cacheKey, JSON.stringify({
                d: data,          // 壓縮鍵名
                t: Date.now(),
                u: url
              }));
              console.log(`Offline Cache: iOS cached ${url}`);
            } catch (storageError) {
              console.warn(`Offline Cache: iOS storage failed for ${url}:`, storageError);
              // 嘗試清除舊的快取以釋放空間
              this.clearOldIOSCaches();
            }
          }
        } catch (error) {
          console.warn(`Offline Cache: iOS preload failed for ${url}:`, error);
        }
      });

      await Promise.all(preloadPromises);
    } catch (error) {
      console.warn('Offline Cache: iOS preload failed:', error);
    }
  }

  /**
   * 清理舊的 iOS 快取
   */
  private static clearOldIOSCaches(): void {
    const now = Date.now();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ios-cache-')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (now - (item.t || 0) > 7 * 24 * 60 * 60 * 1000) { // 保留7天
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} old iOS caches`);
  }
}

export default OfflineCacheService;