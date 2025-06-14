import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Note, NotePage, SortOption } from '../types';

export enum FilterOption {
  All = 'all',
  Favorites = 'favorites',
}
import {
  getAllNotes as dbGetAllNotes,
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getNote as dbGetNote,
  getAllTags as dbGetAllTags
} from '../services/dbService';
import { useSettings } from './SettingsContext';
import { useFilteredNotes, useDebouncedCallback } from '../utils/performance';
import OfflineCacheService from '../services/offlineCacheService';

interface NotesContextType {
  notes: Note[];
  tags: string[];
  selectedNoteId: string | null;
  currentNote: Note | null;
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  fetchTags: () => Promise<void>;
  addNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'pages' | 'isPinned' | 'isFavorite'> & { pages?: NotePage[] }) => Promise<Note | null>;
  updateNote: (note: Note) => Promise<void>;
  addOrUpdateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (id: string | null) => void;
  getNoteById: (id: string) => Promise<Note | undefined>;
  currentSort: SortOption;
  setCurrentSort: (sort: SortOption) => void;
  currentFilterTags: string[];
  setCurrentFilterTags: (tags: string[]) => void;
  currentSearchQuery: string;
  setCurrentSearchQuery: (query: string) => void;
  toggleNoteAttribute: (id: string, attribute: 'isPinned' | 'isFavorite') => Promise<void>;
  currentFilter: FilterOption;
  setCurrentFilter: (filter: FilterOption) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  const [currentSort, setCurrentSort] = useState<SortOption>(settings.defaultSort);
  const [currentFilterTags, setCurrentFilterTags] = useState<string[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');
  const [currentFilter, setCurrentFilter] = useState<FilterOption>(FilterOption.All);

  useEffect(() => {
    setCurrentSort(settings.defaultSort);
  }, [settings.defaultSort]);

  // 離線狀態監聽
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('Notes: Back online, syncing data...');
      // 重新獲取最新數據
      fetchNotes();
      fetchTags();
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log('Notes: Gone offline, using cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('cache-back-online', handleOnline);
    window.addEventListener('cache-offline-mode', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('cache-back-online', handleOnline);
      window.removeEventListener('cache-offline-mode', handleOffline);
    };
  }, []);

  // 初始化離線快取服務
  useEffect(() => {
    OfflineCacheService.initialize().catch(error => {
      console.warn('Failed to initialize offline cache service:', error);
    });
  }, []);

  // Memoized filtered and sorted notes
  const notes = useMemo(() => {
    let filtered = allNotes;

    // Apply favorite filtering
    if (currentFilter === FilterOption.Favorites) {
      filtered = filtered.filter(note => (note as any).isFavorite);
    }

    // Apply tag filtering
    if (currentFilterTags.length > 0) {
      filtered = filtered.filter(note =>
        currentFilterTags.every(tag => note.tags.includes(tag))
      );
    }

    // Apply search filtering
    if (currentSearchQuery.trim() !== '') {
      const lowerQuery = currentSearchQuery.toLowerCase();
      filtered = filtered.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(lowerQuery);
        const contentMatch = note.pages.some(page => page.content.toLowerCase().includes(lowerQuery));
        return titleMatch || contentMatch;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if ((a as any).isPinned && !(b as any).isPinned) return -1;
      if (!(a as any).isPinned && (b as any).isPinned) return 1;

      switch (currentSort) {
        case SortOption.CreatedAtAsc:
          return a.createdAt - b.createdAt;
        case SortOption.CreatedAtDesc:
          return b.createdAt - a.createdAt;
        case SortOption.UpdatedAtAsc:
          return a.updatedAt - b.updatedAt;
        case SortOption.UpdatedAtDesc:
          return b.updatedAt - a.updatedAt;
        case SortOption.TitleAsc:
          return a.title.localeCompare(b.title);
        case SortOption.TitleDesc:
          return b.title.localeCompare(a.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return sorted;
  }, [allNotes, currentSort, currentFilterTags, currentSearchQuery, currentFilter]);

  const migrateNote = (note: Note): Note => {
    if ((!note.pages || note.pages.length === 0) && typeof note.content === 'string') {
      return {
        ...note,
        pages: [{ id: crypto.randomUUID(), title: 'Page 1', content: note.content }],
        content: undefined,
      };
    }
    // Ensure pages is always an array
    return { ...note, pages: note.pages || [] };
  };

  // 增強的獲取函數，支援離線模式
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetchedNotes: Note[] = [];
      
      if (navigator.onLine) {
        // 在線時從數據庫獲取
        fetchedNotes = await dbGetAllNotes();
        
        // 緩存到離線存儲
        await OfflineCacheService.cacheNotes(fetchedNotes);
      } else {
        // 離線時嘗試從快取獲取
        const cachedNotes = await OfflineCacheService.getCachedNotes();
        if (cachedNotes) {
          fetchedNotes = cachedNotes;
          console.log('Notes: Using cached notes (offline mode)');
        } else {
          // 如果沒有快取，嘗試從數據庫獲取（可能失敗）
          try {
            fetchedNotes = await dbGetAllNotes();
          } catch (dbError) {
            console.warn('Notes: Failed to fetch from DB while offline:', dbError);
            setError('離線模式下無法載入筆記。請檢查網路連線。');
            setLoading(false);
            return;
          }
        }
      }
      
      setAllNotes(fetchedNotes.map(migrateNote));
    } catch (e) {
      console.error("Failed to fetch notes:", e);
      
      // 在錯誤情況下嘗試從快取獲取
      try {
        const cachedNotes = await OfflineCacheService.getCachedNotes();
        if (cachedNotes) {
          setAllNotes(cachedNotes.map(migrateNote));
          console.log('Notes: Using cached notes as fallback');
        } else {
          setError(e instanceof Error ? e.message : 'Failed to fetch notes');
        }
      } catch (cacheError) {
        setError(e instanceof Error ? e.message : 'Failed to fetch notes');
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [fetchNotes, fetchTags]); // Only fetch once on mount - filtering/sorting now handled in memory

  const addNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'pages' | 'isPinned' | 'isFavorite'> & { pages?: NotePage[] }): Promise<Note | null> => {
    setLoading(true);
    try {
      const newNote: Note = {
        ...noteData,
        id: crypto.randomUUID(),
        pages: noteData.pages || [{ id: crypto.randomUUID(), title: 'Page 1', content: '' }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false,
        isFavorite: false,
      } as Note;
      
      await dbAddNote(newNote);
      
      // 更新本地狀態
      const updatedNotes = [...allNotes, newNote];
      setAllNotes(updatedNotes);
      
      // 更新快取
      if (navigator.onLine) {
        await OfflineCacheService.cacheNotes(updatedNotes);
      }
      
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

  const addOrUpdateNote = async (note: Note): Promise<void> => {
    setLoading(true);
    try {
      await dbAddNote(note); // dbAddNote is just a put, so it works for both
      await fetchNotes();
      await fetchTags();
    } catch (e) {
      console.error("Failed to add or update note:", e);
      setError(e instanceof Error ? e.message : 'Failed to add or update note');
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
      
      // 更新本地狀態
      const updatedNotes = allNotes.map(n => n.id === note.id ? updatedNoteWithTimestamp : n);
      setAllNotes(updatedNotes);
      
      // 更新快取
      if (navigator.onLine) {
        await OfflineCacheService.cacheNotes(updatedNotes);
      }
      
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
        selectNote(null); // This call already sets currentNote to null
      }
      
      // 更新本地狀態
      const updatedNotes = allNotes.filter(n => n.id !== id);
      setAllNotes(updatedNotes);
      
      // 更新快取
      if (navigator.onLine) {
        await OfflineCacheService.cacheNotes(updatedNotes);
      }
      
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
      setCurrentNote(note ? migrateNote(note) : null);
      setLoading(false);
    } else {
      setCurrentNote(null);
    }
  }, []);

  const getNoteById = useCallback(async (id: string): Promise<Note | undefined> => {
    const note = await dbGetNote(id);
    return note ? migrateNote(note) : undefined;
  }, []);

  const toggleNoteAttribute = useCallback(async (id: string, attribute: 'isPinned' | 'isFavorite') => {
    const note = allNotes.find((n) => n.id === id);
    if (note) {
      const updatedNote: Note = {
        ...note,
        [attribute]: !(note as any)[attribute],
        updatedAt: Date.now(),
      };
      await dbUpdateNote(updatedNote);
      setAllNotes(prevNotes => prevNotes.map((n) => n.id === id ? updatedNote : n));
    }
  }, [allNotes]);

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
      addOrUpdateNote,
      deleteNote,
      selectNote,
      getNoteById,
      currentSort,
      setCurrentSort,
      currentFilterTags,
      setCurrentFilterTags,
      currentSearchQuery,
      setCurrentSearchQuery,
      toggleNoteAttribute,
      currentFilter,
      setCurrentFilter
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
