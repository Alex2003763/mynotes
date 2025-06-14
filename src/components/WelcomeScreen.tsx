
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { PlusCircleIcon, BookOpenIcon } from './Icons';

interface WelcomeScreenProps {
  message?: string;
  showCreateButton?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ message, showCreateButton = false }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleCreateNewNote = () => {
    navigate('/new');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-3 sm:p-4 md:p-6 max-w-sm sm:max-w-lg md:max-w-xl mx-auto">
      {/* Animated icon with gradient background */}
      <div className="relative mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-light/20 rounded-full blur-xl scale-125"></div>
        <div className="relative bg-gradient-to-br from-primary to-primary-light p-3 sm:p-4 rounded-full shadow-lg">
          <BookOpenIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-white animate-pulse" />
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 via-primary to-slate-900 dark:from-white dark:via-primary-light dark:to-white bg-clip-text text-transparent mb-2 sm:mb-3">
        {t('welcomeScreen.title')}
      </h1>
      
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-xs sm:max-w-md leading-relaxed px-2">
        {message || t('welcomeScreen.defaultMessage')}
      </p>

      {showCreateButton && (
        <div className="space-y-4 sm:space-y-6 w-full">
          <button
            onClick={handleCreateNewNote}
            className="group relative inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-primary to-primary-light rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/50 dark:focus:ring-primary-light/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-light to-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <PlusCircleIcon className="relative w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            <span className="relative">{t('welcomeScreen.createFirstNote')}</span>
          </button>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 w-full">
            <div className="text-center p-2 sm:p-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <PlusCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs sm:text-sm">{t('welcomeScreen.feature1.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{t('welcomeScreen.feature1.description')}</p>
            </div>
            
            <div className="text-center p-2 sm:p-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs sm:text-sm">{t('welcomeScreen.feature2.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{t('welcomeScreen.feature2.description')}</p>
            </div>
            
            <div className="text-center p-2 sm:p-3 sm:col-span-1 col-span-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs sm:text-sm">{t('welcomeScreen.feature3.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{t('welcomeScreen.feature3.description')}</p>
            </div>
          </div>
        </div>
      )}
      
      {!showCreateButton && !message && (
        <p className="text-sm sm:text-base md:text-lg text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-2 sm:py-3 border border-slate-200 dark:border-slate-700 mx-2">
          {t('welcomeScreen.selectOrCreate')}
        </p>
      )}
    </div>
  );
};