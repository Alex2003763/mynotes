import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import tinycolor from 'tinycolor2';
import { AppSettings, SortOption, Language } from '../types';
import { getSettings as dbGetSettings, saveSettings as dbSaveSettings } from '../services/dbService';
import { checkApiKeyValidity, updateOpenRouterApiKey as setGlobalOpenRouterKey } from '../services/openRouterService';
import { DEFAULT_SETTINGS_KEY, PREDEFINED_THEME_COLORS, DEFAULT_AI_MODEL_ID } from '../constants';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isLoadingSettings: boolean;
  verifyApiKey: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  key: DEFAULT_SETTINGS_KEY,
  theme: 'dark',
  fontSize: 'medium',
  defaultSort: SortOption.UpdatedAtDesc,
  openRouterApiKey: '',
  openRouterApiKeyStatus: 'unset',
  language: 'en',
  primaryColor: PREDEFINED_THEME_COLORS[0].hex,
  aiModel: DEFAULT_AI_MODEL_ID, // Initialize with default AI model
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function hexToRgbString(hex: string): string | null {
  const color = tinycolor(hex);
  if (color.isValid()) {
    const { r, g, b } = color.toRgb();
    return `${r} ${g} ${b}`;
  }
  return null;
}

function generateColorShades(baseHex: string): { light: string; dark: string } | null {
  const baseColor = tinycolor(baseHex);
  if (!baseColor.isValid()) return null;

  const lightColor = baseColor.clone().lighten(10).toHexString();
  const darkColor = baseColor.clone().darken(15).toHexString();

  return {
    light: hexToRgbString(lightColor) || '',
    dark: hexToRgbString(darkColor) || '',
  };
}


export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const applyThemeColors = useCallback((colorHex: string) => {
    const baseRgbString = hexToRgbString(colorHex);
    const shades = generateColorShades(colorHex);

    if (baseRgbString && shades) {
      const styleEl = document.getElementById('custom-theme-vars');
      if (styleEl) {
        styleEl.innerHTML = `
:root {
  --color-primary-DEFAULT: ${baseRgbString};
  --color-primary-light: ${shades.light};
  --color-primary-dark: ${shades.dark};
}
        `;
      }
    }
  }, []);
  
  const verifyApiKey = useCallback(async (keyToVerify?: string) => {
    const apiKey = keyToVerify ?? settings.openRouterApiKey;
    if (!apiKey) {
      setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'unset' }));
      setGlobalOpenRouterKey('');
      return;
    }

    setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'checking' }));
    setGlobalOpenRouterKey(apiKey); 
    const isValid = await checkApiKeyValidity();
    setSettings(prev => ({ ...prev, openRouterApiKeyStatus: isValid ? 'valid' : 'invalid' }));
  }, [settings.openRouterApiKey]);


  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      const storedSettings = await dbGetSettings();
      let activeSettings = defaultSettings;
      if (storedSettings) {
        // Ensure all keys from defaultSettings are present, especially new ones like aiModel
        activeSettings = { 
            ...defaultSettings, 
            ...storedSettings, 
            key: storedSettings.key || DEFAULT_SETTINGS_KEY,
            aiModel: storedSettings.aiModel || DEFAULT_AI_MODEL_ID // Ensure aiModel has a value
        };
      } else {
        await dbSaveSettings(defaultSettings); 
      }
      
      setSettings(activeSettings);
      setGlobalOpenRouterKey(activeSettings.openRouterApiKey);
      
      if (activeSettings.openRouterApiKey) {
        setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'set' })); 
        await verifyApiKey(activeSettings.openRouterApiKey);
      } else {
        setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'unset' }));
      }

      document.documentElement.classList.toggle('dark', activeSettings.theme === 'dark');
      document.documentElement.lang = activeSettings.language;
      applyThemeColors(activeSettings.primaryColor);

      setIsLoadingSettings(false);
    };
    loadSettings();
  }, [verifyApiKey, applyThemeColors]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    let keyToReverify: string | undefined = undefined;

    setSettings(prevSettings => {
      const updated = { ...prevSettings, ...newSettings, key: DEFAULT_SETTINGS_KEY };
      
      if (newSettings.theme !== undefined && newSettings.theme !== prevSettings.theme) {
         document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
      }
      if (newSettings.language !== undefined && newSettings.language !== prevSettings.language) {
        document.documentElement.lang = newSettings.language;
      }
      if (newSettings.primaryColor !== undefined && newSettings.primaryColor !== prevSettings.primaryColor) {
        applyThemeColors(newSettings.primaryColor);
      }
      if (newSettings.openRouterApiKey !== undefined && newSettings.openRouterApiKey !== prevSettings.openRouterApiKey) {
        keyToReverify = newSettings.openRouterApiKey; 
        setGlobalOpenRouterKey(newSettings.openRouterApiKey || '');
        updated.openRouterApiKeyStatus = newSettings.openRouterApiKey ? 'set' : 'unset';
      }
      // No immediate DOM effect for aiModel, fontSize, defaultSort - they are used by components

      dbSaveSettings(updated);
      return updated;
    });

    if (keyToReverify !== undefined) { 
        await verifyApiKey(keyToReverify);
    }

  }, [applyThemeColors, verifyApiKey]);


  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoadingSettings, verifyApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};