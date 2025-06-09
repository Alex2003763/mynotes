
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { NoteItem } from './NoteItem';
import { PlusCircleIcon } from './Icons';

export const NoteList: React.FC = () => {
  const { notes, loading, error, selectedNoteId, selectNote } = useNotes();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSelectNote = (id: string) => {
    selectNote(id);
    navigate(`/note/${id}`);
  };
  
  const handleNewNote = () => {
    navigate('/new');
  };

  if (loading && notes.length === 0) {
    return <div className="p-4 text-center text-slate-500 dark:text-slate-400">{t('noteList.loading')}</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{t('noteList.error', { message: error })}</div>;
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        <p>{t('noteList.noNotesFound')}</p>
        <button 
          onClick={handleNewNote} 
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark transition-colors"
        >
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          {t('noteList.createNewNote')}
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {notes.map(note => (
        <NoteItem 
          key={note.id} 
          note={note} 
          isSelected={note.id === selectedNoteId}
          onSelect={() => handleSelectNote(note.id)} 
        />
      ))}
    </div>
  );
};