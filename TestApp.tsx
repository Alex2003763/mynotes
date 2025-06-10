import React from 'react';
import { useSettings } from './contexts/SettingsContext';
import { useI18n } from './contexts/I18nContext';

const TestApp: React.FC = () => {
  const { settings, isLoadingSettings } = useSettings();
  const { t } = useI18n();

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-800 text-black dark:text-white">
      <header className="bg-blue-500 text-white p-4">
        <h1 className="text-xl font-bold">MyNotes Test - Screen Size Debug</h1>
        <p>Window width: {typeof window !== 'undefined' ? window.innerWidth : 'Unknown'}</p>
        <p>Settings loaded: {isLoadingSettings ? 'No' : 'Yes'}</p>
        <p>Language: {settings.language}</p>
      </header>
      
      <div className="flex flex-1">
        <aside className="w-64 bg-gray-100 dark:bg-gray-700 p-4 border-r">
          <h2 className="font-semibold mb-4">{t('sidebar.notesTitle') || 'Sidebar'}</h2>
          <p>This is the sidebar content</p>
          <p>Testing responsive behavior</p>
        </aside>
        
        <main className="flex-1 p-4">
          <h2 className="text-2xl font-bold mb-4">{t('welcomeScreen.title') || 'Welcome'}</h2>
          <p>This is the main content area.</p>
          <p>If you can see this on laptop screen, the basic layout works.</p>
          <p>Language setting: {settings.language}</p>
          <p>Theme: {settings.theme}</p>
          
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-800 rounded">
            <p>✅ Basic React rendering works</p>
            <p>✅ Settings context works</p>
            <p>✅ I18n context works</p>
            <p>✅ Responsive layout works</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TestApp;