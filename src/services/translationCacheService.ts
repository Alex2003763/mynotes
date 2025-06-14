import { Language, Translations } from '../types';
import OfflineCacheService from './offlineCacheService';

interface CachedTranslation {
  data: Translations;
  timestamp: number;
  language: Language;
}

class TranslationCacheService {
  private static readonly CACHE_KEY_PREFIX = 'translations_';
  private static readonly METADATA_KEY = 'translation_metadata';
  private static readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 天

  /**
   * 緩存翻譯數據到 localStorage
   */
  static async cacheTranslations(language: Language, translations: Translations): Promise<void> {
    try {
      const cacheData: CachedTranslation = {
        data: translations,
        timestamp: Date.now(),
        language
      };

      // 使用新的離線快取服務
      await OfflineCacheService.cacheTranslations(language, translations);

      // 保留舊的 localStorage 快取作為備份
      localStorage.setItem(
        `${this.CACHE_KEY_PREFIX}${language}`,
        JSON.stringify(cacheData)
      );

      // 更新元數據
      this.updateMetadata(language);
      
      console.log(`Translation cache: Cached ${language} translations with enhanced offline support`);
    } catch (error) {
      console.warn('Translation cache: Failed to cache translations:', error);
    }
  }

  /**
   * 從 localStorage 獲取緩存的翻譯
   */
  static async getCachedTranslations(language: Language): Promise<Translations | null> {
    try {
      // 首先嘗試從新的離線快取服務獲取
      const offlineCached = await OfflineCacheService.getCachedTranslations(language);
      if (offlineCached && this.validateTranslations(offlineCached)) {
        console.log(`Translation cache: Retrieved ${language} translations from offline cache`);
        return offlineCached;
      }

      // 如果離線快取失敗，回退到舊的 localStorage 方式
      const cachedData = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${language}`);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedTranslation = JSON.parse(cachedData);
      
      // 檢查緩存是否過期
      if (Date.now() - parsed.timestamp > this.CACHE_DURATION) {
        console.log(`Translation cache: ${language} cache expired, removing`);
        await this.removeCachedTranslations(language);
        return null;
      }

      // 驗證數據完整性
      if (this.validateTranslations(parsed.data)) {
        console.log(`Translation cache: Retrieved valid ${language} translations from localStorage backup`);
        return parsed.data;
      } else {
        console.warn(`Translation cache: Invalid ${language} translations in cache, removing`);
        await this.removeCachedTranslations(language);
        return null;
      }
    } catch (error) {
      console.warn('Translation cache: Failed to retrieve cached translations:', error);
      return null;
    }
  }

  /**
   * 移除特定語言的緩存
   */
  static async removeCachedTranslations(language: Language): Promise<void> {
    try {
      // 從 localStorage 移除
      localStorage.removeItem(`${this.CACHE_KEY_PREFIX}${language}`);
      
      // 從離線快取中移除（實現可能需要在 OfflineCacheService 中添加）
      // 這裡我們不實現單獨移除，因為離線快取會自動過期
      
      console.log(`Translation cache: Removed ${language} translations cache`);
    } catch (error) {
      console.warn('Translation cache: Failed to remove cached translations:', error);
    }
  }

  /**
   * 獲取最佳可用的翻譯（優先級：目標語言 -> 英文 -> 任何可用的語言）
   */
  static async getBestAvailableTranslations(preferredLanguage: Language): Promise<Translations | null> {
    // 首先嘗試獲取首選語言
    let translations = await this.getCachedTranslations(preferredLanguage);
    if (translations) {
      return translations;
    }

    // 如果首選語言不是英文，嘗試英文
    if (preferredLanguage !== 'en') {
      translations = await this.getCachedTranslations('en');
      if (translations) {
        console.log('Translation cache: Using English fallback translations');
        return translations;
      }
    }

    // 嘗試獲取任何可用的語言
    const availableLanguages = this.getAvailableLanguages();
    for (const lang of availableLanguages) {
      if (lang !== preferredLanguage) {
        translations = await this.getCachedTranslations(lang);
        if (translations) {
          console.log(`Translation cache: Using ${lang} fallback translations`);
          return translations;
        }
      }
    }

    return null;
  }

  /**
   * 獲取所有可用的緩存語言
   */
  static getAvailableLanguages(): Language[] {
    const languages: Language[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          const language = key.replace(this.CACHE_KEY_PREFIX, '') as Language;
          if (language === 'en' || language === 'zh') {
            languages.push(language);
          }
        }
      }
    } catch (error) {
      console.warn('Translation cache: Failed to get available languages:', error);
    }
    return languages;
  }

  /**
   * 清除所有翻譯緩存
   */
  static clearAllCache(): void {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(this.CACHE_KEY_PREFIX) || key === this.METADATA_KEY)) {
          keys.push(key);
        }
      }
      
      keys.forEach(key => localStorage.removeItem(key));
      console.log('Translation cache: Cleared all translation cache');
    } catch (error) {
      console.warn('Translation cache: Failed to clear cache:', error);
    }
  }

  /**
   * 驗證翻譯數據的完整性
   */
  private static validateTranslations(translations: Translations): boolean {
    return translations && 
           typeof translations === 'object' && 
           Object.keys(translations).length > 0 &&
           'general' in translations;
  }

  /**
   * 更新元數據
   */
  private static updateMetadata(language: Language): void {
    try {
      const metadata = {
        lastUpdated: Date.now(),
        languages: this.getAvailableLanguages()
      };
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('Translation cache: Failed to update metadata:', error);
    }
  }

  /**
   * 預載入所有語言的翻譯
   */
  static async preloadTranslations(): Promise<void> {
    const languages: Language[] = ['en', 'zh'];
    
    console.log('Translation cache: Starting preload...');
    
    const preloadPromises = languages.map(async (lang) => {
      try {
        // 檢查是否已有有效緩存
        const cached = await this.getCachedTranslations(lang);
        if (cached) {
          console.log(`Translation cache: ${lang} already cached in localStorage`);
          
          // 即使已緩存，也嘗試更新到瀏覽器緩存
          try {
            await this.ensureBrowserCache(lang);
          } catch (error) {
            console.warn(`Translation cache: Failed to ensure browser cache for ${lang}:`, error);
          }
          return;
        }

        // 嘗試從網絡載入
        const response = await fetch(`/locales/${lang}.json`);
        if (response.ok) {
          const translations = await response.json();
          await this.cacheTranslations(lang, translations);
          
          // 同時緩存到瀏覽器緩存
          await this.ensureBrowserCache(lang, translations);
        } else {
          console.warn(`Translation cache: Failed to preload ${lang}, status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Translation cache: Failed to preload ${lang}:`, error);
      }
    });

    await Promise.all(preloadPromises);
    console.log('Translation cache: Preload completed');
  }

  /**
   * 確保翻譯文件在瀏覽器緩存中
   */
  private static async ensureBrowserCache(language: Language, translations?: any): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cache = await caches.open('mynotes-translations-v1');
      const url = `/locales/${language}.json`;
      
      // 檢查是否已經在緩存中
      const cached = await cache.match(url);
      if (cached) {
        return;
      }

      // 如果提供了翻譯數據，直接緩存
      if (translations) {
        const response = new Response(JSON.stringify(translations), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(url, response);
        console.log(`Translation cache: Cached ${language} to browser cache`);
        return;
      }

      // 否則嘗試從網絡獲取並緩存
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response.clone());
        console.log(`Translation cache: Fetched and cached ${language} to browser cache`);
      }
    } catch (error) {
      console.warn(`Translation cache: Failed to ensure browser cache for ${language}:`, error);
    }
  }
}

export default TranslationCacheService;