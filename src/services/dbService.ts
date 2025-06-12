import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { Note, AppSettings, SortOption } from '../types';
import { DB_NAME, NOTES_STORE_NAME, SETTINGS_STORE_NAME, DB_VERSION, DEFAULT_SETTINGS_KEY } from '../constants';

interface MyNotesDB extends DBSchema {
  [NOTES_STORE_NAME]: {
    key: string;
    value: Note;
    indexes: {
      title: string;
      createdAt: number;
      updatedAt: number;
      tags: string[];
      isPinned: number;
      isFavorite: number;
    };
  };
  [SETTINGS_STORE_NAME]: {
    key: string;
    value: AppSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<MyNotesDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MyNotesDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<MyNotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
       if (oldVersion < 1) {
         if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
           const store = db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
           store.createIndex('title', 'title', { unique: false });
           store.createIndex('createdAt', 'createdAt', { unique: false });
           store.createIndex('updatedAt', 'updatedAt', { unique: false });
           store.createIndex('tags', 'tags', { multiEntry: true });
         }
         if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
           db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'key' });
         }
       }
       if (oldVersion < 2) {
         const notesStore = transaction.objectStore(NOTES_STORE_NAME);
         if (!notesStore.indexNames.contains('isPinned')) {
           notesStore.createIndex('isPinned', 'isPinned', { unique: false });
         }
         if (!notesStore.indexNames.contains('isFavorite')) {
           notesStore.createIndex('isFavorite', 'isFavorite', { unique: false });
         }
       }
      },
    });
  }
  return dbPromise;
};

// Helper function to convert Markdown to plain text for search
// This is a very basic conversion. For more accurate conversion, a library might be needed.
const markdownToPlainText = (markdown: string | undefined): string => {
  if (!markdown) return '';
  
  let text = markdown;
  // Remove headings
  text = text.replace(/^#+\s*(.*)/gm, '$1');
  // Remove emphasis (bold, italic)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove strikethrough
  text = text.replace(/~~(.*?)~~/g, '$1');
  // Remove links, keeping the text
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // Remove images, keeping alt text if present
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1');
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove code blocks (simple version, might not handle all cases)
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove blockquotes
  text = text.replace(/^\>\s*(.*)/gm, '$1');
  // Remove horizontal rules
  text = text.replace(/^---\s*$/gm, '');
  text = text.replace(/^\*\*\*\s*$/gm, '');
  // Remove list markers (simple version)
  text = text.replace(/^[\*\-\+]\s*/gm, '');
  text = text.replace(/^\d+\.\s*/gm, '');
  // Replace multiple newlines with a single space for better searchability of paragraphs
  text = text.replace(/\n+/g, ' ');
  // Remove any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  return text.trim();
};


export const addNote = async (note: Note): Promise<void> => {
  const db = await getDb();
  await db.put(NOTES_STORE_NAME, note);
};

export const getNote = async (id: string): Promise<Note | undefined> => {
  const db = await getDb();
  return db.get(NOTES_STORE_NAME, id);
};

export const updateNote = async (note: Note): Promise<void> => {
  const db = await getDb();
  await db.put(NOTES_STORE_NAME, note);
};

export const deleteNote = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(NOTES_STORE_NAME, id);
};
// Optimized version - filtering and sorting now handled in memory by the context
export const getAllNotes = async (): Promise<Note[]> => {
  const db = await getDb();
  return db.getAll(NOTES_STORE_NAME);
};

// Keep the old function for backward compatibility but mark as deprecated
export const getAllNotesWithFilter = async (sortBy: SortOption = SortOption.UpdatedAtDesc, filterTags: string[] = [], searchQuery: string = ''): Promise<Note[]> => {
  const db = await getDb();
  let notes = await db.getAll(NOTES_STORE_NAME);

  if (filterTags.length > 0) {
    notes = notes.filter(note => filterTags.every(tag => note.tags.includes(tag)));
  }

  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    notes = notes.filter(note => {
      const contentText = markdownToPlainText(note.content);
      return note.title.toLowerCase().includes(lowerQuery) ||
             contentText.toLowerCase().includes(lowerQuery);
    });
  }
  
  notes.sort((a, b) => {
    switch (sortBy) {
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
  return notes;
};

export const getAllTags = async (): Promise<string[]> => {
  const db = await getDb();
  const notes = await db.getAll(NOTES_STORE_NAME);
  const tagSet = new Set<string>();
  notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
};


export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const db = await getDb();
  await db.put(SETTINGS_STORE_NAME, { ...settings, key: DEFAULT_SETTINGS_KEY });
};

export const getSettings = async (): Promise<AppSettings | undefined> => {
  const db = await getDb();
  return db.get(SETTINGS_STORE_NAME, DEFAULT_SETTINGS_KEY);
};
