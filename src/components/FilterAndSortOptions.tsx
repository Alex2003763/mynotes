
import React from 'react';
import { SortOption } from '../types';

export enum FilterOption {
  All = 'all',
  Favorites = 'favorites',
}
import { useI18n } from '../contexts/I18nContext';

interface FilterAndSortOptionsProps {
  currentSort: SortOption;
  onSortChange: (sortKey: SortOption) => void;
  currentFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

export const FilterAndSortOptions: React.FC<FilterAndSortOptionsProps> = ({ currentSort, onSortChange, currentFilter, onFilterChange }) => {
  const { t } = useI18n();

  const sortOptionsMap: { value: SortOption, labelKey: string }[] = [
    { value: SortOption.UpdatedAtDesc, labelKey: 'sortOptions.updatedAtDesc' },
    { value: SortOption.UpdatedAtAsc, labelKey: 'sortOptions.updatedAtAsc' },
    { value: SortOption.CreatedAtDesc, labelKey: 'sortOptions.createdAtDesc' },
    { value: SortOption.CreatedAtAsc, labelKey: 'sortOptions.createdAtAsc' },
    { value: SortOption.TitleAsc, labelKey: 'sortOptions.titleAsc' },
    { value: SortOption.TitleDesc, labelKey: 'sortOptions.titleDesc' },
  ];

  const filterOptionsMap: { value: FilterOption, labelKey: string }[] = [
    { value: FilterOption.All, labelKey: 'filterOptions.all' },
    { value: FilterOption.Favorites, labelKey: 'filterOptions.favorites' },
  ];

  return (
    <div className="w-full space-y-4">
      <div>
        <label htmlFor="filter-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('sidebar.filterTitle')}
        </label>
        <div className="relative">
          <select
            id="filter-notes"
            value={currentFilter}
            onChange={(e) => onFilterChange(e.target.value as FilterOption)}
            className="
              w-full appearance-none bg-white dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              rounded-lg px-3 py-2 pr-8
              text-sm font-medium text-slate-900 dark:text-slate-100
              shadow-sm hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary-light/20
              focus:border-primary dark:focus:border-primary-light
              transition-all duration-200
              cursor-pointer
            "
            aria-label={t('sidebar.filterTitle')}
          >
            {filterOptionsMap.map(option => (
              <option key={option.value} value={option.value} className="py-2">
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <div className="w-4 h-4 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="sort-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('sidebar.sortTitle')}
        </label>
        <div className="relative">
          <select
            id="sort-notes"
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="
              w-full appearance-none bg-white dark:bg-slate-800
              border border-slate-200 dark:border-slate-700
              rounded-lg px-3 py-2 pr-8
              text-sm font-medium text-slate-900 dark:text-slate-100
              shadow-sm hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary-light/20
              focus:border-primary dark:focus:border-primary-light
              transition-all duration-200
              cursor-pointer
            "
            aria-label={t('sidebar.sortTitle')}
          >
            {sortOptionsMap.map(option => (
              <option key={option.value} value={option.value} className="py-2">
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <div className="w-4 h-4 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};