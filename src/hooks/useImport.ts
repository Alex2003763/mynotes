import { useState } from 'react';
import { useNotes } from '../contexts/NoteContext';
import { useSettings } from '../contexts/SettingsContext';
import { importNotesFromJSON as fileImport } from '../services/fileService';
import { ConflictResolution } from '../components/dialogs/ConflictResolutionModal';
import { Note, AppSettings } from '../types';

type ImportOptions = {
  onConfirmSettings: (settings: AppSettings) => Promise<boolean>;
  onResolveConflict: (note: Note) => Promise<ConflictResolution>;
};

export const useImport = ({ onConfirmSettings, onResolveConflict }: ImportOptions) => {
  const { getNoteById, addOrUpdateNote } = useNotes();
  const { updateSettings } = useSettings();
  const [isImporting, setIsImporting] = useState(false);

  const importData = async (file: File) => {
    setIsImporting(true);
    try {
      const { notes, settings } = await fileImport(file);
      
      for (const note of notes) {
        const existing = await getNoteById(note.id);
        if (existing) {
          const resolution = await onResolveConflict(note);
          if (resolution === 'overwrite') {
            await addOrUpdateNote(note);
          } else if (resolution === 'keep_both') {
            await addOrUpdateNote({ ...note, id: crypto.randomUUID() });
          } // 'skip' does nothing
        } else {
          await addOrUpdateNote(note);
        }
      }

      if (settings) {
        const confirm = await onConfirmSettings(settings);
        if (confirm) {
          await updateSettings(settings);
        }
      }
    } catch (error) {
      console.error('Import failed', error);
      // Handle error display to user
    } finally {
      setIsImporting(false);
    }
  };

  return { isImporting, importData };
};