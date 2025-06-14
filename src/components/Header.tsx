import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { SunIcon, MoonIcon, PlusCircleIcon } from './Icons';

interface HeaderProps {
  onToggleLeftSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleLeftSidebar }) => {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();
  const navigate = useNavigate();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleNewNote = () => {
    navigate('/new');
  };

  const themeToSwitchTo = settings.theme === 'light' ? t('settingsModal.darkTheme') : t('settingsModal.lightTheme');

  return (
    <header className="bg-primary dark:bg-primary-dark text-white px-3 py-2 sm:p-3 shadow-lg flex items-center justify-between print:hidden relative z-40">
      <div className="flex items-center min-w-0 flex-1">
        {onToggleLeftSidebar && (
          <button
            onClick={onToggleLeftSidebar}
            className="p-2 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors mr-2 sm:mr-3 md:hidden"
            title={t('header.toggleSidebarOpen')}
            aria-label={t('header.toggleSidebarOpen')}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link to="/" className="text-lg sm:text-xl md:text-2xl font-bold hover:opacity-90 transition-opacity truncate">
          {t('appName')}
        </Link>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-primary-light dark:hover:bg-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
          title={t('header.themeSwitch', { theme: themeToSwitchTo })}
          aria-label={t('header.themeSwitch', { theme: themeToSwitchTo })}
        >
          {settings.theme === 'light' ? <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" /> : <SunIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        </button>
      </div>
    </header>
  );
};