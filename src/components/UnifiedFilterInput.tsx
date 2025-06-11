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
      <div className="flex items-center w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {currentFilterTags.map(tag => (
            <div key={tag} className="flex items-center bg-primary/20 text-primary dark:bg-primary-dark/30 dark:text-primary-light text-xs font-medium px-2 py-1 rounded-full">
              {tag}
              <button onClick={() => removeTag(tag)} className="ml-2 text-primary dark:text-primary-light hover:text-red-500">
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('sidebar.searchOrTagPlaceholder')}
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 bg-transparent focus:outline-none text-sm ml-2"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
          <ul className="py-1">
            {filteredSuggestions.map(tag => (
              <li
                key={tag}
                onClick={() => addTag(tag)}
                className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};