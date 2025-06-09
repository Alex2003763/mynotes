import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { Note, AppSettings, SortOption, EditorJsOutputData, EditorJsBlock } from '../types';
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
      },
    });
  }
  return dbPromise;
};

// Helper function to convert EditorJsOutputData to plain text
const editorDataToText = (data: EditorJsOutputData | undefined | string): string => {
  if (!data) return '';
  if (typeof data === 'string') return data; // Should not happen with new structure but handle defensively

  if (data && Array.isArray(data.blocks)) {
    return data.blocks
      .map(block => {
        switch (block.type) {
          case 'header':
            return block.data.text;
          case 'paragraph':
            return block.data.text;
          case 'list':
            return block.data.items.join(' ');
          case 'quote':
            return `${block.data.text} - ${block.data.caption}`;
          case 'code':
            return block.data.code;
          case 'checklist':
            return block.data.items.map((item: {text: string, checked: boolean}) => item.text).join(' ');
          // Add other block types as needed
          default:
            return '';
        }
      })
      .join(' ')
      .replace(/<[^>]+>/g, ''); // Strip any HTML tags that might be in text
  }
  return '';
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
  await db.put(NOTES_STORE_NAME, note); // put will add or update
};

export const deleteNote = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(NOTES_STORE_NAME, id);
};

export const getAllNotes = async (sortBy: SortOption = SortOption.UpdatedAtDesc, filterTags: string[] = [], searchQuery: string = ''): Promise<Note[]> => {
  const db = await getDb();
  let notes = await db.getAll(NOTES_STORE_NAME);

  // Filter by tags (AND logic for multiple tags)
  if (filterTags.length > 0) {
    notes = notes.filter(note => filterTags.every(tag => note.tags.includes(tag)));
  }

  // Filter by search query (title or content)
  if (searchQuery.trim() !== '') {
    const lowerQuery = searchQuery.toLowerCase();
    notes = notes.filter(note => {
      const contentText = editorDataToText(note.content);
      return note.title.toLowerCase().includes(lowerQuery) || 
             contentText.toLowerCase().includes(lowerQuery);
    });
  }
  
  // Sort
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
        return b.updatedAt - a.updatedAt; // Default sort
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