
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { useSettings } from '../contexts/SettingsContext';
import { AppSettings, SortOption, Language, AvailableAIModel } from '../types';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { exportNotesAsJSON, importNotesFromJSON } from '../services/fileService';
import { PREDEFINED_THEME_COLORS, AVAILABLE_AI_MODELS } from '../constants';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ChevronDownIcon, ColorSwatchIcon } from './Icons';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings, isLoadingSettings, verifyApiKey } = useSettings();
  const { notes, addNote: addImportedNote, fetchNotes, fetchTags } = useNotes();
  const { t, setLanguage: i18nSetLanguage, language: currentLanguage } = useI18n();
  
  const [localApiKey, setLocalApiKey] = useState(settings.openRouterApiKey);
  // const [localAutosaveDelaySeconds, setLocalAutosaveDelaySeconds] = useState<number>((settings.autosaveDelay || DEFAULT_AUTOSAVE_DELAY_MS) / 1000); // REMOVED
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customColor, setCustomColor] = useState(settings.primaryColor);
  const [showColorPicker, setShowColorPicker] = useState(false);


  useEffect(() => {
    setLocalApiKey(settings.openRouterApiKey);
    setCustomColor(settings.primaryColor);
    // setLocalAutosaveDelaySeconds((settings.autosaveDelay || DEFAULT_AUTOSAVE_DELAY_MS) / 1000); // REMOVED
  }, [settings.openRouterApiKey, settings.primaryColor]); // Removed settings.autosaveDelay

  const handleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (name === 'language') {
      i18nSetLanguage(value as Language); 
    } else if (name === 'aiModel') {
      updateSettings({ aiModel: value });
    } 
    // REMOVED autosaveDelaySeconds handling
    // else if (name === 'autosaveDelaySeconds') {
    //   const delaySeconds = parseFloat(value);
    //   if (!isNaN(delaySeconds) && delaySeconds >= 1 && delaySeconds <= 60) { // Example range 1-60 seconds
    //     setLocalAutosaveDelaySeconds(delaySeconds);
    //     updateSettings({ autosaveDelay: delaySeconds * 1000 });
    //   } else if (value === '') { // Allow clearing the input
    //     setLocalAutosaveDelaySeconds(NaN); // Or some indicator for empty
    //   }
    // }
    else {
      updateSettings({ [name]: value } as Partial<AppSettings>);
    }
  };

  const handleApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalApiKey(e.target.value);
  };

  const handleSaveApiKey = async () => {
    await updateSettings({ openRouterApiKey: localApiKey });
    // verifyApiKey is called within updateSettings hook effect if key changes
  };

  const handleExportAll = () => {
    exportNotesAsJSON(notes, settings);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportStatus({ type: 'info', message: t('settingsModal.dataManagement.importing') });
      try {
        const importedData = await importNotesFromJSON(file);
        
        // Import Notes
        for (const note of importedData.notes) {
          const noteData = { title: note.title, content: note.content, tags: note.tags };
          // Consider checking for duplicate IDs if importing into existing dataset
          await addImportedNote(noteData); 
        }
        await fetchNotes(); // Refresh notes
        await fetchTags();  // Refresh tags

        let importMessageKey = 'settingsModal.dataManagement.importSuccessNotesOnly';
        let importMessageParams = { count: importedData.notes.length.toString() };

        // Handle imported settings
        if (importedData.settings) {
          if (window.confirm(t('settingsModal.dataManagement.confirmImportSettings'))) {
            const validSettingsToApply: Partial<AppSettings> = {};
            // Basic validation for imported settings
            if (typeof importedData.settings.theme === 'string' && ['light', 'dark'].includes(importedData.settings.theme)) 
                validSettingsToApply.theme = importedData.settings.theme as 'light' | 'dark';
            if (typeof importedData.settings.fontSize === 'string' && ['small', 'medium', 'large'].includes(importedData.settings.fontSize))
                validSettingsToApply.fontSize = importedData.settings.fontSize as 'small' | 'medium' | 'large';
            if (typeof importedData.settings.defaultSort === 'string' && Object.values(SortOption).includes(importedData.settings.defaultSort as SortOption))
                validSettingsToApply.defaultSort = importedData.settings.defaultSort as SortOption;
            if (typeof importedData.settings.language === 'string' && ['en', 'zh'].includes(importedData.settings.language))
                validSettingsToApply.language = importedData.settings.language as Language;
            if (typeof importedData.settings.primaryColor === 'string' && /^#[0-9A-F]{6}$/i.test(importedData.settings.primaryColor))
                 validSettingsToApply.primaryColor = importedData.settings.primaryColor;
            if (typeof importedData.settings.aiModel === 'string') 
                validSettingsToApply.aiModel = importedData.settings.aiModel;
            // REMOVED autosaveDelay import logic
            //  if (typeof importedData.settings.autosaveDelay === 'number' && importedData.settings.autosaveDelay >= 1000 && importedData.settings.autosaveDelay <= 60000)
            //     validSettingsToApply.autosaveDelay = importedData.settings.autosaveDelay;
            
            if (typeof importedData.settings.openRouterApiKey === 'string') {
                 validSettingsToApply.openRouterApiKey = importedData.settings.openRouterApiKey;
                 setLocalApiKey(importedData.settings.openRouterApiKey); // Update local state for API key input
            }

            await updateSettings(validSettingsToApply);
            importMessageKey = 'settingsModal.dataManagement.importSuccessFull';
          } else {
             importMessageKey = 'settingsModal.dataManagement.importSuccessNotesSkippedSettings';
          }
        }
        setImportStatus({ type: 'success', message: t(importMessageKey, importMessageParams) });

      } catch (error) {
        setImportStatus({ type: 'error', message: t('settingsModal.dataManagement.importFailed', { message: error instanceof Error ? error.message : String(error) }) });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
      setTimeout(() => setImportStatus(null), 7000); // Increased timeout
    }
  };

  const handleColorSwatchClick = (colorHex: string) => {
    setCustomColor(colorHex);
    updateSettings({ primaryColor: colorHex });
    setShowColorPicker(false);
  };
  
  const handleCustomColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
         updateSettings({ primaryColor: e.target.value });
    }
  };


  if (isLoadingSettings) {
    return (
      <Modal isOpen={true} onClose={onClose} title={t('settingsModal.title')}>
        <p>{t('settingsModal.loading')}</p>
      </Modal>
    );
  }
  
  const apiKeyStatus = settings.openRouterApiKeyStatus;
  const apiKeyDisplay = settings.openRouterApiKey 
    ? `${settings.openRouterApiKey.substring(0, 4)}...${settings.openRouterApiKey.substring(settings.openRouterApiKey.length - 4)}` 
    : t('settingsModal.openRouterApi.status.notSetSimple');
  
  let apiKeyStatusMessage = t(`settingsModal.openRouterApi.status.${apiKeyStatus}`);
  if (apiKeyStatus === 'set' && !settings.openRouterApiKey) { 
    apiKeyStatusMessage = t('settingsModal.openRouterApi.status.unset');
  } else if (apiKeyStatus === 'set' && settings.openRouterApiKey) { 
    apiKeyStatusMessage = t('settingsModal.openRouterApi.status.set');
  }


  const modalFooter = (
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary-dark transition-colors text-sm font-medium"
      >
        {t('settingsModal.closeButton')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={t('settingsModal.title')} size="2xl" footer={modalFooter}>
      <div className="space-y-6 sm:space-y-8">
        {/* General Settings Section */}
        <section>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3">{t('settingsModal.generalSectionTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settingsModal.language')}</label>
                  <select
                    id="language"
                    name="language"
                    value={currentLanguage}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settingsModal.theme')}</label>
                  <select
                    id="theme"
                    name="theme"
                    value={settings.theme}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="light">{t('settingsModal.lightTheme')}</option>
                    <option value="dark">{t('settingsModal.darkTheme')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="defaultSort" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settingsModal.defaultSort')}</label>
                  <select
                    id="defaultSort"
                    name="defaultSort"
                    value={settings.defaultSort}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                  >
                    {Object.values(SortOption).map(option => (
                      <option key={option} value={option}>{t(`sortOptions.${option}` as any)}</option>
                    ))}
                  </select>
                </div>
                 {/* REMOVED Autosave Delay Input Field
                 <div>
                    <label htmlFor="autosaveDelaySeconds" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settingsModal.general.autosaveDelay')}</label>
                    <input
                        id="autosaveDelaySeconds"
                        name="autosaveDelaySeconds"
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        value={isNaN(localAutosaveDelaySeconds) ? '' : localAutosaveDelaySeconds}
                        onChange={handleChange}
                        className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settingsModal.general.autosaveDelayHelp')}</p>
                </div>
                */}
            </div>
        </section>

        {/* Theme Color Section */}
        <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3">{t('settingsModal.customTheme.title')}</h3>
            <div className="relative">
                <button 
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center justify-between w-full sm:w-auto p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-haspopup="true"
                    aria-expanded={showColorPicker}
                >
                    <span className="flex items-center">
                        <ColorSwatchIcon className="w-5 h-5 mr-2" style={{ color: settings.primaryColor }} />
                        {t('settingsModal.customTheme.customColorLabel')} {settings.primaryColor}
                    </span>
                    <ChevronDownIcon className={`w-5 h-5 text-slate-500 dark:text-slate-400 transform transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
                </button>

                {showColorPicker && (
                    <div className="absolute z-10 mt-2 w-full sm:w-72 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl p-4">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {PREDEFINED_THEME_COLORS.map(color => (
                                <button
                                    key={color.hex}
                                    title={color.name}
                                    onClick={() => handleColorSwatchClick(color.hex)}
                                    className={`w-full h-10 rounded-md border-2 ${settings.primaryColor === color.hex ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-700' : 'border-transparent hover:opacity-80'}`}
                                    style={{ backgroundColor: color.hex }}
                                    aria-label={`Select ${color.name} theme color`}
                                />
                            ))}
                        </div>
                        <input
                            type="text"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            placeholder={t('settingsModal.customTheme.customColorPlaceholder')}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 focus:ring-primary-light focus:border-primary-light"
                            aria-label={t('settingsModal.customTheme.customColorLabel')}
                        />
                         <input 
                            type="color" 
                            value={customColor} 
                            onChange={handleCustomColorChange}
                            className="w-full h-8 mt-2 p-0 border-none rounded cursor-pointer"
                            aria-label="Color Picker"
                        />
                    </div>
                )}
            </div>
        </section>

        {/* OpenRouter API Key & Model Section */}
        <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">{t('settingsModal.openRouterApi.title')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('settingsModal.openRouterApi.keyHelp')}</p>
          
          <div className="space-y-4">
            <div>
                <label htmlFor="openRouterApiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('settingsModal.openRouterApi.keyLabel')} <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded text-xs">{apiKeyDisplay}</span>
                </label>
                <div className="mt-1 flex items-stretch gap-2">
                    <input
                      id="openRouterApiKey"
                      type="password"
                      value={localApiKey}
                      onChange={handleApiKeyChange}
                      placeholder={t('settingsModal.openRouterApi.keyPlaceholder')}
                      className="flex-grow p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                    />
                    <button
                        onClick={handleSaveApiKey}
                        className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary-dark transition-colors text-sm font-medium whitespace-nowrap"
                        disabled={apiKeyStatus === 'checking'}
                    >
                        {apiKeyStatus === 'checking' ? t('settingsModal.openRouterApi.status.checking') : t('settingsModal.openRouterApi.saveAndVerify')}
                    </button>
                </div>
                <p className={`mt-1 text-xs flex items-center ${
                    apiKeyStatus === 'valid' ? 'text-green-600 dark:text-green-400' : 
                    apiKeyStatus === 'invalid' ? 'text-red-600 dark:text-red-400' : 
                    'text-slate-600 dark:text-slate-400'
                }`}>
                    {apiKeyStatus === 'valid' && <CheckCircleIcon className="w-4 h-4 mr-1.5"/>}
                    {apiKeyStatus === 'invalid' && <ExclamationCircleIcon className="w-4 h-4 mr-1.5"/>}
                    {apiKeyStatus === 'checking' && <InformationCircleIcon className="w-4 h-4 mr-1.5 animate-spin"/>}
                    {(apiKeyStatus === 'unset' || apiKeyStatus === 'set') && <InformationCircleIcon className="w-4 h-4 mr-1.5"/>}
                    {t('settingsModal.openRouterApi.statusLabel')} {apiKeyStatusMessage}
                </p>
            </div>
            <div>
                <label htmlFor="aiModel" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settingsModal.openRouterApi.modelLabel')}</label>
                <input
                  type="text"
                  id="aiModel"
                  name="aiModel"
                  value={settings.aiModel}
                  onChange={handleChange}
                  list="ai-model-suggestions"
                  placeholder={t('settingsModal.openRouterApi.modelPlaceholder')}
                  className="mt-1 block w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm bg-white dark:bg-slate-700"
                />
                <datalist id="ai-model-suggestions">
                  {AVAILABLE_AI_MODELS.map((model: AvailableAIModel) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settingsModal.openRouterApi.modelHelp')}</p>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-3">{t('settingsModal.dataManagement.title')}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportAll}
              className="w-full sm:w-auto px-4 py-2.5 border border-primary text-primary rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary-light transition-colors text-sm font-medium"
            >
              {t('settingsModal.dataManagement.exportAll')}
            </button>
            <button
              onClick={handleImportClick}
              className="w-full sm:w-auto px-4 py-2.5 border border-secondary text-secondary rounded-lg hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-secondary-light transition-colors text-sm font-medium"
            >
              {t('settingsModal.dataManagement.import')}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              aria-label="Import notes file"
            />
          </div>
          {importStatus && (
            <p className={`mt-2 text-sm ${importStatus.type === 'success' ? 'text-green-600' : importStatus.type === 'error' ? 'text-red-600' : 'text-slate-600'} dark:${importStatus.type === 'success' ? 'text-green-400' : importStatus.type === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
              {importStatus.message}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
};