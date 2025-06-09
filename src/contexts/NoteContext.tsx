
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Note, SortOption } from '../types';
import { 
  getAllNotes as dbGetAllNotes, 
  addNote as dbAddNote, 
  updateNote as dbUpdateNote, 
  deleteNote as dbDeleteNote,
  getNote as dbGetNote,
  getAllTags as dbGetAllTags
} from '../services/dbService';
import { useSettings } from './SettingsContext';

interface NotesContextType {
  notes: Note[];
  tags: string[];
  selectedNoteId: string | null;
  currentNote: Note | null;
  loading: boolean;
  error: string | null;
  fetchNotes: (sortBy?: SortOption, filterTags?: string[], searchQuery?: string) => Promise<void>;
  fetchTags: () => Promise<void>;
  addNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note | null>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (id: string | null) => void;
  getNoteById: (id: string) => Promise<Note | undefined>;
  currentSort: SortOption;
  setCurrentSort: (sort: SortOption) => void;
  currentFilterTags: string[];
  setCurrentFilterTags: (tags: string[]) => void;
  currentSearchQuery: string;
  setCurrentSearchQuery: (query: string) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentSort, setCurrentSort] = useState<SortOption>(settings.defaultSort);
  const [currentFilterTags, setCurrentFilterTags] = useState<string[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');

  useEffect(() => {
    setCurrentSort(settings.defaultSort);
  }, [settings.defaultSort]);

  const fetchNotes = useCallback(async (
    sortBy: SortOption = currentSort, 
    filterTags: string[] = currentFilterTags, 
    searchQuery: string = currentSearchQuery
  ) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedNotes = await dbGetAllNotes(sortBy, filterTags, searchQuery);
      setNotes(fetchedNotes);
    } catch (e) {
      console.error("Failed to fetch notes:", e);
      setError(e instanceof Error ? e.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [currentSort, currentFilterTags, currentSearchQuery]);

  const fetchTags = useCallback(async () => {
    try {
      const fetchedTags = await dbGetAllTags();
      setTags(fetchedTags);
    } catch (e) {
      console.error("Failed to fetch tags:", e);
      //setError(e instanceof Error ? e.message : 'Failed to fetch tags');
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSort, currentFilterTags, currentSearchQuery]); // Removed fetchNotes, fetchTags to avoid loop

  const addNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note | null> => {
    setLoading(true);
    try {
      const newNote: Note = {
        ...noteData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await dbAddNote(newNote);
      await fetchNotes(); // Refresh notes list
      await fetchTags(); // Refresh tags list
      selectNote(newNote.id);
      return newNote;
    } catch (e) {
      console.error("Failed to add note:", e);
      setError(e instanceof Error ? e.message : 'Failed to add note');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (note: Note): Promise<void> => {
    setLoading(true);
    try {
      const updatedNoteWithTimestamp = { ...note, updatedAt: Date.now() };
      await dbUpdateNote(updatedNoteWithTimestamp);
      setCurrentNote(updatedNoteWithTimestamp);
      await fetchNotes(); // Refresh notes list
      await fetchTags(); // Refresh tags list
    } catch (e) {
      console.error("Failed to update note:", e);
      setError(e instanceof Error ? e.message : 'Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      await dbDeleteNote(id);
      if (selectedNoteId === id) {
        selectNote(null);
        setCurrentNote(null);
      }
      await fetchNotes(); // Refresh notes list
      await fetchTags(); // Refresh tags list
    } catch (e) {
      console.error("Failed to delete note:", e);
      setError(e instanceof Error ? e.message : 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  const selectNote = useCallback(async (id: string | null) => {
    setSelectedNoteId(id);
    if (id) {
      setLoading(true);
      const note = await dbGetNote(id);
      setCurrentNote(note || null);
      setLoading(false);
    } else {
      setCurrentNote(null);
    }
  }, []);

  const getNoteById = useCallback(async (id: string): Promise<Note | undefined> => {
    return dbGetNote(id);
  }, []);

  return (
    <NotesContext.Provider value={{ 
      notes, 
      tags,
      selectedNoteId, 
      currentNote, 
      loading, 
      error, 
      fetchNotes, 
      fetchTags,
      addNote, 
      updateNote, 
      deleteNote, 
      selectNote,
      getNoteById,
      currentSort,
      setCurrentSort,
      currentFilterTags,
      setCurrentFilterTags,
      currentSearchQuery,
      setCurrentSearchQuery
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};