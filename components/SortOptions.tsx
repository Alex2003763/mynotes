
import React from 'react';
import { SortOption } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface SortOptionsProps {
  currentSort: SortOption;
  onSortChange: (sortKey: SortOption) => void;
}

export const SortOptions: React.FC<SortOptionsProps> = ({ currentSort, onSortChange }) => {
  const { t } = useI18n();

  const sortOptionsMap: { value: SortOption, labelKey: string }[] = [
    { value: SortOption.UpdatedAtDesc, labelKey: 'sortOptions.updatedAtDesc' },
    { value: SortOption.UpdatedAtAsc, labelKey: 'sortOptions.updatedAtAsc' },
    { value: SortOption.CreatedAtDesc, labelKey: 'sortOptions.createdAtDesc' },
    { value: SortOption.CreatedAtAsc, labelKey: 'sortOptions.createdAtAsc' },
    { value: SortOption.TitleAsc, labelKey: 'sortOptions.titleAsc' },
    { value: SortOption.TitleDesc, labelKey: 'sortOptions.titleDesc' },
  ];

  return (
    <div>
      <label htmlFor="sort-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 px-1">
        {t('sidebar.sortTitle')}
      </label>
      <select
        id="sort-notes"
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary-light focus:border-primary-light bg-white dark:bg-slate-700 text-sm focus:outline-none shadow-sm"
        aria-label={t('sidebar.sortTitle')}
      >
        {sortOptionsMap.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};