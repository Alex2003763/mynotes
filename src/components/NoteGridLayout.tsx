import React, { useState, useMemo } from 'react';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { NoteCard } from './NoteCard';
import {
  PlusCircleIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  ListBulletIcon,
  Bars3Icon
} from './Icons';
import { useNavigate } from 'react-router-dom';

interface NoteGridLayoutProps {
  onNoteSelect?: (noteId: string) => void;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortMode = 'updated' | 'created' | 'title' | 'tags';

const NoteGridLayoutComponent: React.FC<NoteGridLayoutProps> = ({ onNoteSelect }) => {
  const { notes, loading, error, selectedNoteId, selectNote } = useNotes();
  const { t } = useI18n();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // 記憶化排序後的筆記 - Now directly using notes from context as they should be pre-sorted/filtered
  const sortedNotes = notes; // Use notes directly from context

  const handleSelectNote = React.useCallback((id: string) => {
    selectNote(id);
    onNoteSelect?.(id);
    navigate(`/view/${id}`);
  }, [selectNote, onNoteSelect, navigate]);
  
  const handleNewNote = React.useCallback(() => {
    navigate('/new');
  }, [navigate]);

  const setNoteLoading = (noteId: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: isLoading }));
  };

  // 載入狀態
  if (loading && notes.length === 0) {
    return (
      <div className="note-grid-container">
        <div className="note-grid-header">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className={`note-grid note-grid-${viewMode}`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <NoteCard
              key={`skeleton-${index}`}
              note={{
                id: `skeleton-${index}`,
                title: '',
                content: '',
                tags: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
              }}
              isSelected={false}
              onSelect={() => {}}
              viewMode={viewMode === 'compact' ? 'list' : viewMode}
              isLoading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="note-grid-container">
        <div className="note-grid-empty">
          <div className="text-center text-red-500 dark:text-red-400">
            <h3 className="text-lg font-semibold mb-2">{t('noteGrid.loadError.title')}</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // 空狀態
  if (sortedNotes.length === 0) {
    return (
      <div className="note-grid-container">
        <div className="note-grid-empty">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500">
              <PlusCircleIcon className="w-full h-full" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('noteGrid.noNotes.title')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {t('noteGrid.noNotes.message')}
            </p>
            <button 
              onClick={handleNewNote} 
              className="
                inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm 
                text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-primary transition-all duration-200 hover:scale-105
              "
            >
              <PlusCircleIcon className="w-5 h-5 mr-2" />
              {t('noteList.createNewNote')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="note-grid-container">
      {/* 標題和控制項 */}
      <header className="note-grid-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('noteGrid.title', { count: sortedNotes.length.toString() })}
            </h2>
            
            {/* 視圖模式切換 */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => {
                const getIcon = () => {
                  switch (mode) {
                    case 'grid':
                      return <Squares2X2Icon className="w-4 h-4" />;
                    case 'list':
                      return <ListBulletIcon className="w-4 h-4" />;
                    case 'compact':
                      return <Bars3Icon className="w-4 h-4" />;
                  }
                };
                
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                      ${viewMode === mode
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }
                    `}
                    title={t(`noteGrid.viewModes.${mode}`)}
                  >
                    {getIcon()}
                    <span className="hidden md:inline">{t(`noteGrid.viewModes.${mode}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 新增筆記按鈕 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewNote}
              className="
                flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium
                hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md
              "
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('noteGrid.newNote')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 筆記網格 */}
      <main className={`note-grid note-grid-${viewMode}`}>
        {sortedNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelected={note.id === selectedNoteId}
            onSelect={() => handleSelectNote(note.id)}
            viewMode={viewMode === 'compact' ? 'list' : viewMode}
            isLoading={loadingStates[note.id] || false}
          />
        ))}
      </main>
    </div>
  );
};

export const NoteGridLayout = React.memo(NoteGridLayoutComponent);