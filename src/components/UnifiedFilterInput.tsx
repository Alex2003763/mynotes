import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { XIcon, SearchIcon } from './Icons';

export const UnifiedFilterInput: React.FC = () => {
  const {
    currentFilterTags,
    setCurrentFilterTags,
    currentSearchQuery,
    setCurrentSearchQuery,
    tags: availableTags,
  } = useNotes();
  const { t } = useI18n();

  const [inputValue, setInputValue] = useState(currentSearchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(currentSearchQuery);
  }, [currentSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setCurrentSearchQuery(value);

    if (value.includes('#')) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    if (!currentFilterTags.includes(tag)) {
      setCurrentFilterTags([...currentFilterTags, tag]);
    }
    setInputValue('');
    setCurrentSearchQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentFilterTags(currentFilterTags.filter(tag => tag !== tagToRemove));
  };

  const filteredSuggestions = inputValue.includes('#')
    ? availableTags.filter(tag =>
        tag.toLowerCase().includes(inputValue.split('#').pop()?.toLowerCase() || '')
      )
    : [];

  return (
    <div className="relative">
      <div className="group relative flex items-center w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md focus-within:shadow-md transition-all duration-200 focus-within:border-primary dark:focus-within:border-primary-light overflow-hidden">
        {/* Search icon with animated background */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-light/20 rounded-full scale-0 group-focus-within:scale-100 transition-transform duration-200"></div>
            <SearchIcon className="relative h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary dark:group-focus-within:text-primary-light transition-colors duration-200" />
          </div>
        </div>

        {/* Tags and input container */}
        <div className="flex items-center flex-wrap gap-1.5 pl-10 pr-3 py-2.5 min-h-[2.5rem] w-full">
          {/* Active filter tags */}
          {currentFilterTags.map(tag => (
            <div key={tag} className="flex items-center bg-gradient-to-r from-primary/10 to-primary-light/10 border border-primary/20 text-primary dark:text-primary-light text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm animate-in slide-in-from-left-2 duration-200">
              <span className="mr-1">#{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                className="flex items-center justify-center w-3 h-3 rounded-full bg-primary/20 hover:bg-red-500 hover:text-white transition-all duration-150 group"
                aria-label={`Remove ${tag} tag`}
              >
                <XIcon className="h-2 w-2" />
              </button>
            </div>
          ))}
          
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            placeholder={currentFilterTags.length > 0 ? t('sidebar.searchInFiltered') : t('sidebar.searchOrTagPlaceholder')}
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 bg-transparent focus:outline-none text-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 min-w-0"
          />
        </div>

        {/* Focus ring effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 via-transparent to-primary-light/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
      </div>
      
      {/* Enhanced suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-150">
          <div className="p-1.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wide">
              {t('sidebar.availableTags')}
            </div>
            <ul className="space-y-0.5">
              {filteredSuggestions.slice(0, 6).map(tag => (
                <li key={tag}>
                  <button
                    onClick={() => addTag(tag)}
                    className="w-full flex items-center px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary-light/10 hover:text-primary dark:hover:text-primary-light rounded-md transition-all duration-150 group"
                  >
                    <span className="flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-primary/20 transition-colors duration-150">
                      <span className="text-xs">#</span>
                    </span>
                    <span className="font-medium">{tag}</span>
                  </button>
                </li>
              ))}
              {filteredSuggestions.length > 6 && (
                <li className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500 text-center border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                  {t('sidebar.andMoreTags', { count: (filteredSuggestions.length - 6).toString() })}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};