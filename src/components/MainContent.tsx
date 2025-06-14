import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NoteEditor } from './NoteEditor';
import { ViewNote } from './ViewNote';
import { WelcomeScreen } from './WelcomeScreen';
import { NoteGridLayout } from './NoteGridLayout';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';

export const MainContent: React.FC = () => {
  const {
    notes,
    loading,
  } = useNotes();
  const { t } = useI18n();

  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-slate-800 min-h-0">
      <Routes>
        <Route path="/note/:noteId" element={
          <div className="flex-1 flex flex-col px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <NoteEditor />
          </div>
        } />
        <Route path="/new" element={
          <div className="flex-1 flex flex-col px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <NoteEditor isNewNote={true} />
          </div>
        } />
        <Route path="/view/:noteId" element={
          <div className="flex-1 flex flex-col px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 overflow-auto bg-white dark:bg-slate-800 shadow-inner">
            <ViewNote />
          </div>
        } />
        <Route path="/" element={
          <div className="flex-1 flex flex-col w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-0">
            {/* Content area with improved styling */}
            <div className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 md:pt-6">
              {loading ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center space-y-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto">
                      <div className="animate-spin rounded-full h-full w-full border-2 sm:border-3 border-primary border-t-transparent"></div>
                    </div>
                    <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">{t('noteList.loading')}</p>
                  </div>
                </div>
              ) : notes && notes.length > 0 ? (
                <div className="flex-1 px-2 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8 min-h-0">
                  <NoteGridLayout />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <WelcomeScreen showCreateButton={true} />
                </div>
              )}
            </div>
          </div>
        } />
        <Route path="*" element={
          <div className="flex-1 flex flex-col w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 min-h-0">
            {/* Content area */}
            <div className="flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="text-center py-6 sm:py-10">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-4">
                    <div className="animate-spin rounded-full h-full w-full border-2 sm:border-3 border-primary border-t-transparent"></div>
                  </div>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">{t('noteList.loading')}</p>
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