import { Language, Translations } from '../types';

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
  static cacheTranslations(language: Language, translations: Translations): void {
    try {
      const cacheData: CachedTranslation = {
        data: translations,
        timestamp: Date.now(),
        language
      };

      localStorage.setItem(
        `${this.CACHE_KEY_PREFIX}${language}`,
        JSON.stringify(cacheData)
      );

      // 更新元數據
      this.updateMetadata(language);
      
      console.log(`Translation cache: Cached ${language} translations`);
    } catch (error) {
      console.warn('Translation cache: Failed to cache translations:', error);
    }
  }

  /**
   * 從 localStorage 獲取緩存的翻譯
   */
  static getCachedTranslations(language: Language): Translations | null {
    try {
      const cachedData = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${language}`);
      if (!cachedData) {
        return null;
      }

      const parsed: CachedTranslation = JSON.parse(cachedData);
      
      // 檢查緩存是否過期
      if (Date.now() - parsed.timestamp > this.CACHE_DURATION) {
        console.log(`Translation cache: ${language} cache expired, removing`);
        this.removeCachedTranslations(language);
        return null;
      }

      // 驗證數據完整性
      if (this.validateTranslations(parsed.data)) {
        console.log(`Translation cache: Retrieved valid ${language} translations from cache`);
        return parsed.data;
      } else {
        console.warn(`Translation cache: Invalid ${language} translations in cache, removing`);
        this.removeCachedTranslations(language);
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
  static removeCachedTranslations(language: Language): void {
    try {
      localStorage.removeItem(`${this.CACHE_KEY_PREFIX}${language}`);
      console.log(`Translation cache: Removed ${language} translations cache`);
    } catch (error) {
      console.warn('Translation cache: Failed to remove cached translations:', error);
    }
  }

  /**
   * 獲取最佳可用的翻譯（優先級：目標語言 -> 英文 -> 任何可用的語言）
   */
  static getBestAvailableTranslations(preferredLanguage: Language): Translations | null {
    // 首先嘗試獲取首選語言
    let translations = this.getCachedTranslations(preferredLanguage);
    if (translations) {
      return translations;
    }

    // 如果首選語言不是英文，嘗試英文
    if (preferredLanguage !== 'en') {
      translations = this.getCachedTranslations('en');
      if (translations) {
        console.log('Translation cache: Using English fallback translations');
        return translations;
      }
    }

    // 嘗試獲取任何可用的語言
    const availableLanguages = this.getAvailableLanguages();
    for (const lang of availableLanguages) {
      if (lang !== preferredLanguage) {
        translations = this.getCachedTranslations(lang);
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
        const cached = this.getCachedTranslations(lang);
        if (cached) {
          console.log(`Translation cache: ${lang} already cached`);
          return;
        }

        // 嘗試從網絡載入
        const response = await fetch(`/locales/${lang}.json`);
        if (response.ok) {
          const translations = await response.json();
          this.cacheTranslations(lang, translations);
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
}

export default TranslationCacheService;