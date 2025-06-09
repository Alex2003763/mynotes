
import React, { useState } from 'react';
import { NoteList } from './NoteList';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';
import { SortOptions } from './SortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { XIcon } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    currentSort, setCurrentSort,
    currentFilterTags, setCurrentFilterTags,
    currentSearchQuery, setCurrentSearchQuery 
  } = useNotes();
  const { t } = useI18n();
  
  const [localSearchQuery, setLocalSearchQuery] = useState(currentSearchQuery);

  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    setCurrentSearchQuery(query); 
  };

  const handleSortChange = (sortKey: string) => {
    setCurrentSort(sortKey as any);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = currentFilterTags.includes(tag)
      ? currentFilterTags.filter(t => t !== tag)
      : [...currentFilterTags, tag];
    setCurrentFilterTags(newTags);
  };
  
  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-30 flex-shrink-0
        w-72 md:w-80 bg-slate-50 dark:bg-slate-800 
        border-r border-slate-200 dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex md:flex-col
        print:hidden
      `}
      aria-label={t('sidebar.notesTitle')}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center md:hidden">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('sidebar.notesTitle')}</h2>
            <button 
                onClick={onClose} 
                className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={t('header.toggleSidebarOpen')}
            >
                <XIcon className="w-5 h-5" />
            </button>
        </div>

        <div className="p-4 space-y-5"> {/* Increased space-y */}
          <SearchBar 
            value={localSearchQuery} 
            onChange={handleSearch} 
            onSearch={() => setCurrentSearchQuery(localSearchQuery)}
          />
          <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
          <TagFilter selectedTags={currentFilterTags} onTagToggle={handleTagToggle} />
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <NoteList />
        </div>
      </div>
    </aside>
  );
};
