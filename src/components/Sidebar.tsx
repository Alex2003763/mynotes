import React, { useState, useEffect } from 'react';
import { NoteList } from './NoteList';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';
import { SortOptions } from './SortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';

interface SidebarProps {
  width: number; // For desktop resizable width
}

export const Sidebar: React.FC<SidebarProps> = ({ width }) => {
  const { 
    currentSort, setCurrentSort,
    currentFilterTags, setCurrentFilterTags,
    currentSearchQuery, setCurrentSearchQuery 
  } = useNotes();
  const { t } = useI18n();
  
  const [localSearchQuery, setLocalSearchQuery] = useState(currentSearchQuery);

  useEffect(() => {
    setLocalSearchQuery(currentSearchQuery);
  }, [currentSearchQuery]);

  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    // Debounce or search on enter/blur can be added here
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
  
  const sidebarStyle: React.CSSProperties = { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };

  return (
    <aside
      className="relative z-20 flex flex-col flex-shrink-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 print:hidden"
      style={sidebarStyle}
      aria-label={t('sidebar.notesTitle')}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-5">
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