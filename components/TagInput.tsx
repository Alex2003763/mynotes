
import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { XIcon, TagIcon } from './Icons';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, setTags }) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { // Support English and Chinese comma
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag) && tags.length < 10) { // Limit max tags
        setTags([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="mb-4">
      <label htmlFor="tags-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {t('tagInput.label')}
      </label>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center px-2.5 py-1 bg-primary/80 text-white text-xs font-medium rounded-full"
          >
            <TagIcon className="w-3 h-3 mr-1.5 text-indigo-200"/>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1.5 -mr-0.5 p-0.5 rounded-full text-indigo-200 hover:text-white hover:bg-black/20 focus:outline-none"
              aria-label={t('tagInput.removeTag', { tag })}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id="tags-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={tags.length > 0 ? t('tagInput.placeholderAdd') : t('tagInput.placeholderNew')}
          className="flex-grow p-1 bg-transparent focus:outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          aria-label={t('tagInput.label')}
        />
      </div>
    </div>
  );
};