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
          <div className="flex-1 flex flex-col w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Content area with improved styling */}
            <div className="flex-1 flex flex-col min-h-0 pt-6">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 mx-auto">
                      <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary border-t-transparent"></div>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{t('noteList.loading')}</p>
                  </div>
                </div>
              ) : notes && notes.length > 0 ? (
                <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
                  <NoteGridLayout />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <WelcomeScreen showCreateButton={true} />
                </div>
              )}
            </div>
          </div>
        } />
        <Route path="*" element={
          <div className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6">
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