import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { Language, Translations, TranslationKey } from '../types';

// Define a simple type for date-fns locale
interface DateFnsLocale {
  code?: string;
  formatDistance?: any;
  formatLong?: any;
  formatRelative?: any;
  localize?: any;
  match?: any;
  options?: any;
}

// Dynamically import date-fns locales using fetch and eval approach
const dateFnsLocales: Record<Language, () => Promise<DateFnsLocale>> = {
  en: async () => {
    try {
      const response = await fetch('https://esm.sh/date-fns@4.1.0/locale/en-US');
      const moduleText = await response.text();
      // Return a basic locale object as fallback
      return { code: 'en-US' } as DateFnsLocale;
    } catch (error) {
      console.warn('Failed to load en-US locale:', error);
      return { code: 'en-US' } as DateFnsLocale;
    }
  },
  zh: async () => {
    try {
      const response = await fetch('https://esm.sh/date-fns@4.1.0/locale/zh-CN');
      const moduleText = await response.text();
      // Return a basic locale object as fallback
      return { code: 'zh-CN' } as DateFnsLocale;
    } catch (error) {
      console.warn('Failed to load zh-CN locale:', error);
      return { code: 'zh-CN' } as DateFnsLocale;
    }
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
  dateFnsLocale: DateFnsLocale | undefined; // For use with date-fns functions
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper to get nested values from translation object
const getNestedValue = (obj: Translations, keyInput: TranslationKey | string): string | undefined => {
  // Ensure key is a string before attempting to use string methods on it.
  const keyStr = String(keyInput);

  if (typeof keyStr !== 'string') {
    // This case should ideally not be reached if String() works as expected.
    // It's a safeguard or for catching extremely unusual scenarios.
    // console.error('getNestedValue: keyInput did not stringify to a string. Original:', keyInput, 'Stringified:', keyStr);
    return undefined;
  }
  if (!keyStr) { // Check for empty string after coercion
    // console.warn('getNestedValue: keyInput stringified to an empty string. Original:', keyInput);
    return undefined;
  }

  // At this point, keyStr is confirmed to be a non-empty string.
  const parts = keyStr.split('.');
  let current: string | Translations | undefined = obj;
  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = (current as Record<string, string | Translations>)[part];
    } else {
      // console.warn(`getNestedValue: Path part "${part}" not found in translations for key "${keyStr}". Current object:`, current);
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
};


export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, updateSettings, isLoadingSettings } = useSettings();
  const [translations, setTranslations] = useState<Translations>({});
  const [currentDateFnsLocale, setCurrentDateFnsLocale] = useState<DateFnsLocale | undefined>(undefined);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true);

  useEffect(() => {
    const loadTranslations = async (lang: Language) => {
      setIsLoadingTranslations(true);
      try {
        // Try multiple possible paths for the translations
        const possiblePaths = [
          `/locales/${lang}.json`,
          `./locales/${lang}.json`,
          `/public/locales/${lang}.json`,
          `./public/locales/${lang}.json`
        ];
        
        let response: Response | null = null;
        let loadError: Error | null = null;
        
        for (const path of possiblePaths) {
          try {
            console.log(`Attempting to load translations from: ${path}`);
            response = await fetch(path);
            if (response.ok) {
              console.log(`Successfully loaded translations from: ${path}`);
              break;
            } else {
              console.warn(`Failed to load from ${path}, status: ${response.status}`);
            }
          } catch (err) {
            console.warn(`Error fetching from ${path}:`, err);
            loadError = err as Error;
          }
        }
        
        if (!response || !response.ok) {
          throw new Error(`Failed to load ${lang}.json from any path. Last error: ${loadError?.message}`);
        }
        
        const data: Translations = await response.json();
        setTranslations(data);
        console.log(`Translations loaded successfully for ${lang}:`, Object.keys(data));
      } catch (error) {
        console.error(`Failed to load translations for ${lang}:`, error);
        if (lang !== 'en') {
            console.info("Attempting to load English translations as fallback.");
            await loadTranslations('en');
        } else {
            console.error("Failed to load English translations as well. Setting minimal error translations.");
            setTranslations({
              "error": "Translations loading failed",
              "noteList": { "loading": "Loading..." },
              "welcomeScreen": { "selectOrCreate": "Welcome" }
            });
        }
      } finally {
        setIsLoadingTranslations(false);
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

    // Only load translations when settings are loaded and we have a language
    if (!isLoadingSettings && settings.language) {
      loadTranslations(settings.language);
      loadDateFnsLocale(settings.language);
    }
  }, [settings.language, isLoadingSettings]);

  const setLanguage = useCallback((lang: Language) => {
    updateSettings({ language: lang });
  }, [updateSettings]);

  const t = useCallback((key: TranslationKey | any, replacements?: Record<string, string>): string => {
    // Early validation and coercion
    if (key === null || key === undefined) {
      return '';
    }

    const originalKeyType = typeof key;
    let keyAsString: string;

    try {
      keyAsString = String(key);
    } catch (error) {
      console.warn('Failed to convert translation key to string:', key, error);
      return '';
    }

    // Additional validation for the stringified key
    if (!keyAsString || keyAsString === 'undefined' || keyAsString === 'null') {
      return '';
    }
    
    // If translations are still loading or not available, return a safe fallback
    if (isLoadingTranslations || isLoadingSettings || !translations || Object.keys(translations).length === 0) {
      // Return a safe fallback when translations haven't loaded yet
      try {
        if (keyAsString.includes('.')) {
          const parts = keyAsString.split('.');
          return parts[parts.length - 1] || keyAsString;
        }
        return keyAsString;
      } catch (error) {
        console.warn('Error processing translation key fallback:', keyAsString, error);
        return '';
      }
    }
    
    let translation = getNestedValue(translations, keyAsString);
    
    if (translation === undefined) {
      // Fallback logic using keyAsString
      try {
        if (keyAsString.includes('.')) {
          const parts = keyAsString.split('.');
          translation = parts[parts.length - 1] || keyAsString;
        } else {
          translation = keyAsString;
        }
      } catch (error) {
        console.warn('Error processing translation key:', keyAsString, error);
        return keyAsString;
      }
    }
    
    if (replacements && typeof translation === 'string') {
      try {
        Object.keys(replacements).forEach(placeholder => {
          // Ensure replacement value is a string before using it
          const replacementValue = String(replacements[placeholder] || '');
          translation = (translation as string).replace(new RegExp(`{{${placeholder}}}`, 'g'), replacementValue);
        });
      } catch (error) {
        console.warn('Error applying replacements to translation:', translation, replacements, error);
      }
    }

    // Final check for translation type
    return typeof translation === 'string' ? translation : keyAsString;
  }, [translations, settings.language, isLoadingTranslations, isLoadingSettings]);

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
