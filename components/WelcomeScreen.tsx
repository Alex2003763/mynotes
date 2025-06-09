
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
    <div className="flex flex-col items-center justify-center h-full text-center p-6 sm:p-8">
      <BookOpenIcon className="w-20 h-20 sm:w-24 sm:h-24 text-primary mb-6" />
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">{t('welcomeScreen.title')}</h1>
      <p className="text-md sm:text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-md">
        {message || t('welcomeScreen.defaultMessage')}
      </p>
      {showCreateButton && (
        <button
          onClick={handleCreateNewNote}
          className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-primary-dark transition-colors"
        >
          <PlusCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 -ml-1" />
          {t('welcomeScreen.createFirstNote')}
        </button>
      )}
      {!showCreateButton && !message && ( // Only show this if no specific message is passed and not showing create button
           <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400">
             {t('welcomeScreen.selectOrCreate')}
           </p>
      )}
    </div>
  );
};
