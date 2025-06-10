
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { SunIcon, MoonIcon, MenuIcon, XIcon, CogIcon, PlusCircleIcon } from './Icons';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenSettings, isSidebarOpen }) => {
  const { settings, updateSettings } = useSettings();
  const { t, language } = useI18n();
  const navigate = useNavigate();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleNewNote = () => {
    navigate('/new');
  };

  const themeToSwitchTo = settings.theme === 'light' ? t('settingsModal.darkTheme') : t('settingsModal.lightTheme');

  return (
    <header className="bg-primary dark:bg-primary-dark text-white p-3 shadow-lg flex items-center justify-between print:hidden relative z-40">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="mr-2 p-2 rounded-md hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white md:hidden"
          aria-label={isSidebarOpen ? t('header.toggleSidebarOpen') : t('header.toggleSidebarClose')}
        >
          {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
        <Link to="/" className="text-xl md:text-2xl font-bold hover:opacity-90 transition-opacity">
          {t('appName')}
        </Link>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={handleNewNote}
          className="p-2 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          title={t('header.newNote')}
          aria-label={t('header.newNote')}
        >
          <PlusCircleIcon className="h-6 w-6" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          title={t('header.themeSwitch', { theme: themeToSwitchTo })}
          aria-label={t('header.themeSwitch', { theme: themeToSwitchTo })}
        >
          {settings.theme === 'light' ? <MoonIcon className="h-5 w-5 sm:h-6 sm:w-6" /> : <SunIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          title={t('header.settings')}
          aria-label={t('header.settings')}
        >
          <CogIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </header>
  );
};