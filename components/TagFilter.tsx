
import React from 'react';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';

interface TagFilterProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({ selectedTags, onTagToggle }) => {
  const { tags: availableTags } = useNotes();
  const { t } = useI18n();

  if (availableTags.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400 px-1">{t('sidebar.noTagsAvailable')}</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 px-1">{t('sidebar.filterTagsTitle')}</h4>
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`
                px-3 py-1.5 text-xs rounded-full border
                ${isSelected 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}
                transition-all duration-150 ease-in-out
              `}
              aria-pressed={isSelected}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};
