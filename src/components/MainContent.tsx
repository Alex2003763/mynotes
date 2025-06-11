import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { NoteEditor } from './NoteEditor';
import { ViewNote } from './ViewNote';
import { WelcomeScreen } from './WelcomeScreen';
import { NoteList } from './NoteList';
import { SearchBar } from './SearchBar';
import { TagFilter } from './TagFilter';
import { SortOptions } from './SortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';

export const MainContent: React.FC = () => {
  const {
    notes,
    loading,
    currentSort, setCurrentSort,
    currentFilterTags, setCurrentFilterTags,
    currentSearchQuery, setCurrentSearchQuery
  } = useNotes();
  const { t } = useI18n();
  const location = useLocation();
  
  const [localSearchQuery, setLocalSearchQuery] = useState(currentSearchQuery);

  useEffect(() => {
    setLocalSearchQuery(currentSearchQuery);
  }, [currentSearchQuery]);

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
    <main className="flex-1 flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
      <Routes>
        <Route path="/note/:noteId" element={
          <div className="flex-1 flex flex-col px-1 sm:px-2 md:px-3 lg:px-4 py-3 sm:py-4 md:py-5 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <NoteEditor />
          </div>
        } />
        <Route path="/new" element={
          <div className="flex-1 flex flex-col px-1 sm:px-2 md:px-3 lg:px-4 py-3 sm:py-4 md:py-5 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <NoteEditor isNewNote={true} />
          </div>
        } />
        <Route path="/view/:noteId" element={
          <div className="flex-1 flex flex-col px-1 sm:px-2 md:px-3 lg:px-4 py-3 sm:py-4 md:py-5 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <ViewNote />
          </div>
        } />
        <Route path="/" element={
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Navigation controls */}
            <div className="mb-8 space-y-6">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {t('sidebar.notesTitle')}
                </h1>
              </div>
              
              {/* Search and filters */}
              <div className="space-y-4">
                <div className="max-w-lg mx-auto">
                  <SearchBar
                    value={localSearchQuery}
                    onChange={handleSearch}
                    onSearch={() => setCurrentSearchQuery(localSearchQuery)}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                  <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
                  <TagFilter selectedTags={currentFilterTags} onTagToggle={handleTagToggle} />
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-center py-10">
                  <p>{t('noteList.loading')}</p>
                </div>
              ) : notes && notes.length > 0 ? (
                <div className="h-full overflow-y-auto">
                  <div className="max-w-4xl mx-auto">
                    <NoteList />
                  </div>
                </div>
              ) : (
                <WelcomeScreen showCreateButton={true} />
              )}
            </div>
          </div>
        } />
        <Route path="*" element={
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Navigation controls */}
            <div className="mb-8 space-y-6">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {t('sidebar.notesTitle')}
                </h1>
              </div>
              
              {/* Search and filters */}
              <div className="space-y-4">
                <div className="max-w-lg mx-auto">
                  <SearchBar
                    value={localSearchQuery}
                    onChange={handleSearch}
                    onSearch={() => setCurrentSearchQuery(localSearchQuery)}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                  <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
                  <TagFilter selectedTags={currentFilterTags} onTagToggle={handleTagToggle} />
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-center py-10">
                  <p>{t('noteList.loading')}</p>
                </div>
              ) : notes && notes.length > 0 ? (
                <div className="h-full overflow-y-auto">
                  <div className="max-w-4xl mx-auto">
                    <NoteList />
                  </div>
                </div>
              ) : (
                <WelcomeScreen showCreateButton={true} />
              )}
            </div>
          </div>
        } />
      </Routes>
    </main>
  );
};