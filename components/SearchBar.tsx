
import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { SearchIcon } from './Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onSearch }) => {
  const { t } = useI18n();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };
  return (
    <div className="relative">
      <input
        type="search"
        placeholder={t('sidebar.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary-light focus:border-primary-light bg-white dark:bg-slate-700 text-sm focus:outline-none shadow-sm"
        aria-label={t('sidebar.searchPlaceholder')}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  );
};
