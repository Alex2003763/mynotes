
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { Language, Translations, TranslationKey } from '../types';
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
  const { settings, updateSettings } = useSettings();
  const [translations, setTranslations] = useState<Translations>({});
  const [currentDateFnsLocale, setCurrentDateFnsLocale] = useState<DateFnsLocale | undefined>(undefined);


  useEffect(() => {
    const loadTranslations = async (lang: Language) => {
      try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load ${lang}.json, status: ${response.status}`);
        }
        const data: Translations = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(`Failed to load translations for ${lang}:`, error);
        if (lang !== 'en') {
            console.info("Attempting to load English translations as fallback.");
            loadTranslations('en'); 
        } else {
            console.error("Failed to load English translations as well. Setting minimal error translations.");
            setTranslations({ "error": "Translations loading failed" });
        }
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
