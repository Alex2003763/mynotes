
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { Language, Translations, TranslationKey } from '../types';
import TranslationCacheService from '../services/translationCacheService';
import type { Locale as DateFnsLocale } from 'date-fns/locale/types';

// Dynamically import date-fns locales using full URLs
const dateFnsLocales: Record<Language, () => Promise<DateFnsLocale>> = {
  en: () => import('https://esm.sh/date-fns@4.1.0/locale/en-US').then(mod => mod.default || mod),
  zh: () => import('https://esm.sh/date-fns@4.1.0/locale/zh-CN').then(mod => mod.default || mod),
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
  dateFnsLocale: DateFnsLocale | undefined; // For use with date-fns functions
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper to get nested values from translation object
const getNestedValue = (obj: Translations, key: TranslationKey): string | undefined => {
  if (typeof key !== 'string' || !key) { // Ensure key is a non-empty string
    // console.warn('getNestedValue called with invalid key:', key);
    return undefined;
  }
  const parts = key.split('.');
  let current: string | Translations | undefined = obj;
  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = (current as Record<string, string | Translations>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
};


export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [translations, setTranslations] = useState<Translations>({});
  const [currentDateFnsLocale, setCurrentDateFnsLocale] = useState<DateFnsLocale | undefined>(undefined);


  useEffect(() => {
    const loadTranslations = async (lang: Language) => {
      try {
        // 首先嘗試從緩存載入
        const cachedTranslations = TranslationCacheService.getCachedTranslations(lang);
        if (cachedTranslations) {
          console.log(`I18n: Using cached translations for ${lang}`);
          setTranslations(cachedTranslations);
          
          // 在背景中更新翻譯
          updateTranslationsInBackground(lang);
          return;
        }

        // 緩存中沒有，嘗試從網絡載入
        console.log(`I18n: Loading translations for ${lang} from network`);
        const response = await fetch(`/locales/${lang}.json`, {
          cache: 'force-cache'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load ${lang}.json, status: ${response.status}`);
        }
        
        const data: Translations = await response.json();
        
        // 驗證數據完整性
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setTranslations(data);
          TranslationCacheService.cacheTranslations(lang, data);
          console.log(`I18n: Successfully loaded and cached ${lang} translations`);
        } else {
          throw new Error('Invalid translation data received');
        }
      } catch (error) {
        console.error(`I18n: Failed to load translations for ${lang}:`, error);
        
        // 嘗試獲取最佳可用的翻譯
        const fallbackTranslations = TranslationCacheService.getBestAvailableTranslations(lang);
        if (fallbackTranslations) {
          setTranslations(fallbackTranslations);
          console.log(`I18n: Using fallback translations`);
          return;
        }

        // 如果當前語言不是英文，嘗試載入英文
        if (lang !== 'en') {
          console.info("I18n: Attempting to load English translations as fallback");
          loadTranslations('en');
          return;
        }
        
        // 最後的備用方案：設置基本的錯誤翻譯
        console.error("I18n: All translation loading attempts failed. Setting minimal translations.");
        const minimalTranslations: Translations = {
          "error": "翻譯載入失敗 / Translations loading failed",
          "general": {
            "error": "錯誤 / Error",
            "loading": "載入中... / Loading...",
            "success": "成功 / Success",
            "info": "資訊 / Info"
          },
          "header": {
            "title": "我的筆記 / MyNotes",
            "settings": "設定 / Settings",
            "newNote": "新筆記 / New Note"
          }
        };
        setTranslations(minimalTranslations);
        TranslationCacheService.cacheTranslations(lang, minimalTranslations);
      }
    };

    // 在背景中更新翻譯
    const updateTranslationsInBackground = async (lang: Language) => {
      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (response.ok) {
          const data: Translations = await response.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            TranslationCacheService.cacheTranslations(lang, data);
            console.log(`I18n: Background update completed for ${lang}`);
          }
        }
      } catch (error) {
        console.log(`I18n: Background update failed for ${lang}:`, error);
        // 忽略背景更新的錯誤
      }
    };

    const loadDateFnsLocale = async (lang: Language) => {
        try {
            const localeModule = await dateFnsLocales[lang]();
            setCurrentDateFnsLocale(localeModule);
        } catch (error) {
            console.error(`Failed to load date-fns locale for ${lang}:`, error);
            try {
                const enLocaleModule = await dateFnsLocales['en']();
                setCurrentDateFnsLocale(enLocaleModule);
            } catch (fallbackError) {
                console.error(`Failed to load fallback en-US date-fns locale:`, fallbackError);
            }
        }
    };

    if (settings.language) {
      loadTranslations(settings.language);
      loadDateFnsLocale(settings.language);
    }
  }, [settings.language]);

  const setLanguage = useCallback((lang: Language) => {
    updateSettings({ language: lang });
  }, [updateSettings]);

  const t = useCallback((key: TranslationKey | any, replacements?: Record<string, string>): string => {
    const originalKeyType = typeof key;
    const keyAsString = String(key); // Coerce key to string immediately

    if (originalKeyType !== 'string') {
      // This warning helps identify if t() is called with non-string keys
      console.warn(`Translation key was not a string: Original Key='${key}', Type='${originalKeyType}'. Using coerced string: '${keyAsString}'`);
    }
    
    let translation = getNestedValue(translations, keyAsString);
    
    if (translation === undefined) {
      // Fallback logic using keyAsString
      // Defensive check for keyAsString before split, even though it should be a string now.
      if (typeof keyAsString === 'string' && keyAsString.includes('.')) {
         // Check if pop() returns undefined (e.g. for key "."), then use keyAsString
        translation = keyAsString.split('.').pop() || keyAsString;
      } else {
        translation = keyAsString;
      }
    }
    
    if (replacements && typeof translation === 'string') {
      Object.keys(replacements).forEach(placeholder => {
        translation = (translation as string).replace(new RegExp(`{{${placeholder}}}`, 'g'), replacements[placeholder]);
      });
    }

    // Final check for translation type
    if (typeof translation === 'string') {
      return translation;
    } else {
      // If translation is still not a string (e.g., from getNestedValue if JSON has non-string values, or if key itself was very odd)
      // console.warn(`Translation for key "${keyAsString}" resulted in a non-string value: ${JSON.stringify(translation)}. Falling back to key.`);
      return keyAsString; // Fallback to the (coerced) key
    }
  }, [translations, settings.language]);

  return (
    <I18nContext.Provider value={{ language: settings.language, setLanguage, t, dateFnsLocale: currentDateFnsLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
