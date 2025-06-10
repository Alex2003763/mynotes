
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSettings } from './SettingsContext';
import { Language, Translations, TranslationKey } from '../types';
import type { Locale as DateFnsLocale } from 'date-fns/locale'; // Updated import path for Locale type

// Dynamically import date-fns locales using full URLs
const dateFnsLocales: Record<Language, () => Promise<DateFnsLocale>> = {
  en: () => import('https://esm.sh/date-fns@4.1.0/locale/en-US/index.js').then(mod => mod.default || mod),
  zh: () => import('https://esm.sh/date-fns@4.1.0/locale/zh-CN/index.js').then(mod => mod.default || mod),
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, replacements?: Record<string, string>) => string;
  dateFnsLocale: DateFnsLocale | undefined; // For use with date-fns functions
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper to get nested values from translation object
const getNestedValue = (obj: Translations, key: string): string | undefined => {
  return key.split('.').reduce<string | Translations | undefined>((acc, part) => {
    if (typeof acc === 'object' && acc !== null && part in acc) {
      return acc[part] as string | Translations;
    }
    return undefined;
  }, obj) as string | undefined;
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
          throw new Error(`Failed to load ${lang}.json. Status: ${response.status}`);
        }
        const data: Translations = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error("Failed to load translations:", error);
        // Fallback to English if current language fails, or load a minimal default
        if (lang !== 'en') {
            loadTranslations('en'); // Attempt to load English as a fallback
        } else {
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
            // Fallback to en-US if current language's locale fails
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

  const t = useCallback((key: TranslationKey, replacements?: Record<string, string>): string => {
    if (typeof key !== 'string') {
      console.error('Translation key is not a string:', key);
      return String(key); // Return the key itself as a string or a placeholder
    }

    let translation = getNestedValue(translations, key);
    if (translation === undefined) {
      console.warn(`Translation key "${key}" not found for language "${settings.language}".`);
      // Fallback to key or a more descriptive missing string
      translation = key.includes('.') ? key.split('.').pop() || key : key;
    }
    if (replacements && typeof translation === 'string') {
      Object.keys(replacements).forEach(placeholder => {
        translation = (translation as string).replace(new RegExp(`{{${placeholder}}}`, 'g'), replacements[placeholder]);
      });
    }
    return translation || key;
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
