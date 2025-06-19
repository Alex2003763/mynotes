
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import tinycolor from 'tinycolor2';
import { AppSettings, SortOption, Language } from '../types';
import { getSettings as dbGetSettings, saveSettings as dbSaveSettings } from '../services/dbService';
import { checkApiKeyValidity as checkOpenRouterApiKeyValidity, updateOpenRouterApiKey as setGlobalOpenRouterKey } from '../services/openRouterService';
import { checkApiKeyValidity as checkGeminiApiKeyValidity, updateGeminiApiKey as setGlobalGeminiKey } from '../services/geminiService';
import { DEFAULT_SETTINGS_KEY, PREDEFINED_THEME_COLORS, DEFAULT_AI_MODEL_ID, DEFAULT_GEMINI_MODEL_ID } from '../constants';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isLoadingSettings: boolean;
  verifyApiKey: (provider?: 'openrouter' | 'gemini', keyToVerify?: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  key: DEFAULT_SETTINGS_KEY,
  theme: 'dark',
  fontSize: 'medium',
  defaultSort: SortOption.UpdatedAtDesc,
  openRouterApiKey: '',
  openRouterApiKeyStatus: 'unset',
  geminiApiKey: '',
  geminiApiKeyStatus: 'unset',
  aiProvider: 'openrouter',
  customSystemPrompt: '',
  language: 'en',
  primaryColor: PREDEFINED_THEME_COLORS[0].hex,
  aiModel: DEFAULT_AI_MODEL_ID, // Initialize with default AI model
  geminiModel: DEFAULT_GEMINI_MODEL_ID, // Initialize with default Gemini model
  // autosaveDelay: DEFAULT_AUTOSAVE_DELAY_MS, // REMOVED
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
  
  const verifyApiKey = useCallback(async (provider: 'openrouter' | 'gemini' = 'openrouter', keyToVerify?: string) => {
    if (provider === 'openrouter') {
      const apiKey = keyToVerify ?? settings.openRouterApiKey;
      if (!apiKey) {
        setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'unset' }));
        setGlobalOpenRouterKey('');
        return;
      }

      setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'checking' }));
      setGlobalOpenRouterKey(apiKey);
      const isValid = await checkOpenRouterApiKeyValidity();
      setSettings(prev => ({ ...prev, openRouterApiKeyStatus: isValid ? 'valid' : 'invalid' }));
    } else if (provider === 'gemini') {
      const apiKey = keyToVerify ?? settings.geminiApiKey;
      if (!apiKey) {
        setSettings(prev => ({ ...prev, geminiApiKeyStatus: 'unset' }));
        setGlobalGeminiKey('');
        return;
      }

      setSettings(prev => ({ ...prev, geminiApiKeyStatus: 'checking' }));
      setGlobalGeminiKey(apiKey);
      const isValid = await checkGeminiApiKeyValidity();
      setSettings(prev => ({ ...prev, geminiApiKeyStatus: isValid ? 'valid' : 'invalid' }));
    }
  }, [settings.openRouterApiKey, settings.geminiApiKey]);


  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      const storedSettings = await dbGetSettings();
      let activeSettings = defaultSettings;
      if (storedSettings) {
        // Ensure all keys from defaultSettings are present, especially new ones
        activeSettings = {
            ...defaultSettings,
            ...storedSettings,
            key: storedSettings.key || DEFAULT_SETTINGS_KEY,
            aiModel: storedSettings.aiModel || DEFAULT_AI_MODEL_ID,
            geminiModel: storedSettings.geminiModel || DEFAULT_GEMINI_MODEL_ID,
            geminiApiKey: storedSettings.geminiApiKey || '',
            geminiApiKeyStatus: storedSettings.geminiApiKeyStatus || 'unset',
            aiProvider: storedSettings.aiProvider || 'openrouter',
            customSystemPrompt: storedSettings.customSystemPrompt || '',
            // autosaveDelay: storedSettings.autosaveDelay ?? DEFAULT_AUTOSAVE_DELAY_MS, // REMOVED
        };
      } else {
        await dbSaveSettings(defaultSettings);
      }
      
      setSettings(activeSettings);
      setGlobalOpenRouterKey(activeSettings.openRouterApiKey);
      setGlobalGeminiKey(activeSettings.geminiApiKey);
      
      if (activeSettings.openRouterApiKey) {
        setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'set' }));
        await verifyApiKey('openrouter', activeSettings.openRouterApiKey);
      } else {
        setSettings(prev => ({ ...prev, openRouterApiKeyStatus: 'unset' }));
      }

      if (activeSettings.geminiApiKey) {
        setSettings(prev => ({ ...prev, geminiApiKeyStatus: 'set' }));
        await verifyApiKey('gemini', activeSettings.geminiApiKey);
      } else {
        setSettings(prev => ({ ...prev, geminiApiKeyStatus: 'unset' }));
      }

      document.documentElement.classList.toggle('dark', activeSettings.theme === 'dark');
      document.documentElement.lang = activeSettings.language;
      applyThemeColors(activeSettings.primaryColor);

      setIsLoadingSettings(false);
    };
    loadSettings();
  }, [verifyApiKey, applyThemeColors]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    let openRouterKeyToVerify: string | undefined = undefined;
    let geminiKeyToVerify: string | undefined = undefined;

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
        openRouterKeyToVerify = newSettings.openRouterApiKey;
        setGlobalOpenRouterKey(newSettings.openRouterApiKey || '');
        updated.openRouterApiKeyStatus = newSettings.openRouterApiKey ? 'set' : 'unset';
      }
      if (newSettings.geminiApiKey !== undefined && newSettings.geminiApiKey !== prevSettings.geminiApiKey) {
        geminiKeyToVerify = newSettings.geminiApiKey;
        setGlobalGeminiKey(newSettings.geminiApiKey || '');
        updated.geminiApiKeyStatus = newSettings.geminiApiKey ? 'set' : 'unset';
      }
      // No immediate DOM effect for aiModel, fontSize, defaultSort - they are used by components

      dbSaveSettings(updated);
      return updated;
    });

    if (openRouterKeyToVerify !== undefined) {
        await verifyApiKey('openrouter', openRouterKeyToVerify);
    }
    if (geminiKeyToVerify !== undefined) {
        await verifyApiKey('gemini', geminiKeyToVerify);
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