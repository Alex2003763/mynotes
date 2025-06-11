import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NoteEditor } from './NoteEditor';
import { ViewNote } from './ViewNote';
import { WelcomeScreen } from './WelcomeScreen';
import { NoteGridLayout } from './NoteGridLayout';
import { SortOptions } from './SortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { UnifiedFilterInput } from './UnifiedFilterInput';

export const MainContent: React.FC = () => {
  const {
    notes,
    loading,
    currentSort, setCurrentSort,
  } = useNotes();
  const { t } = useI18n();

  const handleSortChange = (sortKey: string) => {
    setCurrentSort(sortKey as any);
  };

  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-slate-800">
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
          <div className="flex-1 flex flex-col w-full">
            {/* Navigation controls */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <UnifiedFilterInput />
                </div>
                <div className="flex-shrink-0">
                  <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-100 dark:bg-slate-900">
              {loading ? (
                <div className="text-center py-10">
                  <p>{t('noteList.loading')}</p>
                </div>
              ) : notes && notes.length > 0 ? (
                <NoteGridLayout />
              ) : (
                <WelcomeScreen showCreateButton={true} />
              )}
            </div>
          </div>
        } />
        <Route path="*" element={
          <div className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Navigation controls */}
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <UnifiedFilterInput />
                </div>
                <div className="flex-shrink-0">
                  <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="text-center py-10">
                  <p>{t('noteList.loading')}</p>
                </div>
              ) : notes && notes.length > 0 ? (
                <NoteGridLayout />
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