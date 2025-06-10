
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Cherry from 'cherry-markdown';

import { useNotes } from '../contexts/NoteContext';
import { Note, ApiFeedback } from '../types';
import { TagInput } from './TagInput';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { exportNoteAsMarkdown, exportNoteAsTXT, exportNotesAsJSON } from '../services/fileService';
import { TrashIcon, DownloadIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, SaveIcon, ChevronDownIcon } from './Icons';
import { EDITOR_HOLDER_ID } from '../constants';


// Helper functions for Markdown (string) content
export const createEmptyMarkdown = (): string => '';
export const textToMarkdown = (text: string): string => text; // Markdown is text
export const sanitizeMarkdownString = (data: any): string => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && Array.isArray(data.blocks)) {
    // Attempt to convert from old EditorJS format if encountered
    console.warn("Sanitizing: Input data looks like old EditorJS format. Converting to plain text.");
    return data.blocks.map((b: any) => b?.data?.text || '').join('\n\n');
  }
  console.warn(`Sanitizing: Input data is not a string or recognized format. Type: ${typeof data}. Returning empty string. Data:`, data);
  return '';
};


interface NoteEditorProps {
  isNewNote?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ isNewNote = false }) => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getNoteById, addNote, updateNote, deleteNote, loading: notesLoading, currentNote: contextNote, selectNote, selectedNoteId } = useNotes();
  const { settings } = useSettings();
  const { t } = useI18n();
  const { setActiveEditorInteraction, activeEditor } = useEditorInteraction();

  const [localNote, setLocalNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [initialMarkdownForEditor, setInitialMarkdownForEditor] = useState<string | null>(null);
  const [currentMarkdownContent, setCurrentMarkdownContent] = useState<string | null>(null);
  
  const editorInstanceRef = useRef<Cherry | null>(null);
  const editorHolderRef = useRef<HTMLDivElement | null>(null); 
  const lastInitializedNoteIdOrNewFlagRef = useRef<string | null>(null);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [apiMessage, setApiMessage] = useState<ApiFeedback | null>(null);
  const apiMessageTimeoutRef = useRef<number | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(true);

  const editorPlaceholderText = useRef(t('noteEditor.contentPlaceholder')); 

  useEffect(() => {
    editorPlaceholderText.current = t('noteEditor.contentPlaceholder');
  }, [t]);

  const displayApiMessage = useCallback((message: ApiFeedback | null) => {
    if (apiMessageTimeoutRef.current) clearTimeout(apiMessageTimeoutRef.current);
    setApiMessage(message);
    if (message) {
        apiMessageTimeoutRef.current = window.setTimeout(() => setApiMessage(null), 5000);
    }
  }, []);

 useEffect(() => {
    setIsLoadingEditor(true);
    const passedState = location.state as { initialContentText?: string; initialTitle?: string, replaceExistingContent?: boolean };

    const loadNote = async () => {
      let markdownForEditorInit: string | undefined = undefined;
      let noteTitle = '';
      let noteTags: string[] = [];
      let noteToSetAsLocal: Note | null = null;

      if (isNewNote) {
        if (passedState?.initialContentText) {
          markdownForEditorInit = sanitizeMarkdownString(passedState.initialContentText);
          noteTitle = passedState.initialTitle || '';
          navigate(location.pathname, { replace: true, state: null });
        } else if (lastInitializedNoteIdOrNewFlagRef.current !== 'new' || !editorInstanceRef.current) {
          markdownForEditorInit = createEmptyMarkdown();
        }
        lastInitializedNoteIdOrNewFlagRef.current = 'new';
        const tempNoteContent = markdownForEditorInit || currentMarkdownContent || createEmptyMarkdown();
        noteToSetAsLocal = {
          id: `temp-${Date.now()}`, title: noteTitle, content: tempNoteContent,
          tags: noteTags, createdAt: Date.now(), updatedAt: Date.now(),
        };
        if (noteId && noteId !== 'new' && selectedNoteId !== null) selectNote(null); 

      } else if (noteId) {
        let noteToLoad: Note | undefined | null = null;
        if (passedState?.replaceExistingContent && passedState?.initialContentText) {
            noteToLoad = await getNoteById(noteId);
            if (noteToLoad) {
                markdownForEditorInit = sanitizeMarkdownString(passedState.initialContentText);
                noteTitle = noteToLoad.title; 
                noteTags = noteToLoad.tags; 
                noteToSetAsLocal = {...noteToLoad, content: markdownForEditorInit};
                navigate(location.pathname, { replace: true, state: null });
            } else { 
                 markdownForEditorInit = sanitizeMarkdownString(passedState.initialContentText);
                 noteTitle = ''; 
                 noteTags = [];
                 noteToSetAsLocal = {
                     id: noteId, 
                     title: noteTitle, content: markdownForEditorInit, tags: noteTags, 
                     createdAt: Date.now(), updatedAt: Date.now()
                 };
                 navigate(location.pathname, { replace: true, state: null });
            }
        } else if (contextNote && contextNote.id === noteId) {
          noteToLoad = contextNote;
        } else {
          noteToLoad = await getNoteById(noteId);
        }

        if (noteToLoad) {
          noteToSetAsLocal = noteToLoad;
          noteTitle = noteTitle || noteToLoad.title; 
          noteTags = noteTags.length > 0 ? noteTags : noteToLoad.tags;

          if (!markdownForEditorInit && (!editorInstanceRef.current || lastInitializedNoteIdOrNewFlagRef.current !== noteId)) {
            markdownForEditorInit = sanitizeMarkdownString(noteToLoad.content);
          }
          lastInitializedNoteIdOrNewFlagRef.current = noteId;
        } else if (!passedState?.initialContentText) { 
          console.warn(`Note ${noteId} not found. Navigating to home.`);
          navigate('/');
          lastInitializedNoteIdOrNewFlagRef.current = null;
          setIsLoadingEditor(false);
          return;
        }
      } else { 
        if (lastInitializedNoteIdOrNewFlagRef.current !== 'empty' || !editorInstanceRef.current) {
          markdownForEditorInit = createEmptyMarkdown();
          lastInitializedNoteIdOrNewFlagRef.current = 'empty';
        }
         noteToSetAsLocal = null; 
         noteTitle = ''; 
         noteTags = [];
      }
      
      setLocalNote(noteToSetAsLocal);
      setTitle(noteTitle);
      setTags(noteTags);

      if (markdownForEditorInit !== undefined) {
        setInitialMarkdownForEditor(markdownForEditorInit);
        setCurrentMarkdownContent(markdownForEditorInit); 
      }
      setIsLoadingEditor(false);
    };

    loadNote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, isNewNote, getNoteById, navigate, contextNote, selectNote, location.state]); 

  const getFullContentAsTextInternal = useCallback(async (): Promise<string> => {
    if (editorInstanceRef.current) {
      return editorInstanceRef.current.getMarkdown();
    }
    return currentMarkdownContent || '';
  }, [currentMarkdownContent]);

  const applyAiChangesToEditorInternal = useCallback((newMarkdown: string) => {
    const sanitizedMarkdown = sanitizeMarkdownString(newMarkdown);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setMarkdown(sanitizedMarkdown); 
      setCurrentMarkdownContent(sanitizedMarkdown); 
    } else {
        console.warn("Attempting to apply AI suggestion but editor instance is not fully available. Setting as initial data for next render.");
        setInitialMarkdownForEditor(sanitizedMarkdown); 
        setCurrentMarkdownContent(sanitizedMarkdown);
    }
  }, []);

  const getTitleInternal = useCallback(() => title, [title]);
  const setTagsFromAIInternal = useCallback((newTags: string[]) => {
    setTags(prev => Array.from(new Set([...prev, ...newTags])));
  }, []);


  useEffect(() => {
    if (localNote) {
        const editorId = localNote.id;
        setActiveEditorInteraction({
            id: editorId,
            getTitle: getTitleInternal,
            getFullContentAsText: getFullContentAsTextInternal,
            applyAiChangesToEditor: applyAiChangesToEditorInternal,
            setTagsFromAI: setTagsFromAIInternal,
        });
        
        return () => {
            // Only clear if this editor instance was the active one
            if (activeEditor && activeEditor.id === editorId) {
                setActiveEditorInteraction(null);
            }
        };
    } else if (!localNote && activeEditor && (isNewNote || (noteId && activeEditor.id === noteId))) {
        // If localNote becomes null (e.g., navigating away from an unsaved new note, or note deleted)
        // and this editor was the active one, clear it.
        setActiveEditorInteraction(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localNote, setActiveEditorInteraction, getTitleInternal, getFullContentAsTextInternal, applyAiChangesToEditorInternal, setTagsFromAIInternal]);


  useEffect(() => {
    if (isLoadingEditor || !editorHolderRef.current || initialMarkdownForEditor === null) {
      return;
    }
  
    if (editorInstanceRef.current) {
      try {
        editorInstanceRef.current.destroy();
      } catch (e) {
         console.warn("Error destroying previous Cherry instance:", e);
      }
    }
    editorInstanceRef.current = null;
  
    const holder = editorHolderRef.current;
  
    // Direct initialization
    if (!editorHolderRef.current || initialMarkdownForEditor === null) {
      console.warn("Editor holder or initial markdown became null before initialization. Aborting editor setup.");
      return;
    }

    try {
      const cherryConfig = {
        el: holder, // Use the current ref
        value: initialMarkdownForEditor,
        toolbars: {
          theme: 'light', 
          showToolbar: true,
        },
        editor: {
          height: '100%', 
          defaultModel: 'editOnly',
          // placeholder: editorPlaceholderText.current, // Cherry Markdown might not support placeholder this way
        },
        fileUpload: (file: File, callback: (url: string, params?: Record<string, any>) => void) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64Str = e.target?.result as string;
            callback(base64Str, { name: file.name }); 
          };
          reader.readAsDataURL(file);
        },
        callback: {
          afterChange: (markdown: string, html: string) => {
            setCurrentMarkdownContent(markdown);
          },
        },
      };
      const cherryInstance = new Cherry(cherryConfig);
      editorInstanceRef.current = cherryInstance;

    } catch (e) {
      console.error("Failed to initialize Cherry Markdown editor:", e);
      displayApiMessage({type: 'error', text: 'Editor failed to load. Try refreshing.'});
    }
  
    return () => {
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroy();
        } catch (e) { /* console.error("Error destroying Cherry on cleanup:", e); */ }
      }
      editorInstanceRef.current = null;
    };
  // The key prop on the holder div handles major re-initialization.
  // This useEffect handles the initial setup and changes to initialMarkdownForEditor if the key doesn't change.
  }, [initialMarkdownForEditor, isLoadingEditor, displayApiMessage]); 
  
  const isContentTrulyEmpty = (content: string | null): boolean => {
    return !content || content.trim() === '';
  };

  const handleManualSave = async () => {
    if (!localNote && !isNewNote) {
        displayApiMessage({ type: 'error', text: t('noteEditor.saveError') + ' (No local note context)' });
        return;
    }
    
    let contentFromEditor = currentMarkdownContent; 
    if (editorInstanceRef.current) {
        contentFromEditor = editorInstanceRef.current.getMarkdown();
    }

    const sanitizedContentForSave = sanitizeMarkdownString(contentFromEditor);
    setCurrentMarkdownContent(sanitizedContentForSave); 
    setApiMessage(null);
    
    const noteDataToSave = { title, content: sanitizedContentForSave, tags };

    try {
      if (isNewNote || (localNote && localNote.id.startsWith('temp-'))) {
        const isTrulyEmpty = title.trim() === '' && isContentTrulyEmpty(sanitizedContentForSave);
        if (isTrulyEmpty) {
            displayApiMessage({ type: 'error', text: t('noteEditor.emptyNoteError') });
            return;
        }
        const newNote = await addNote(noteDataToSave);
        if (newNote) {
          navigate(`/note/${newNote.id}`, { replace: true });
          displayApiMessage({ type: 'success', text: t('noteEditor.createSuccess') });
        }
      } else if (localNote) { 
        const noteToUpdate = { ...localNote, ...noteDataToSave };
        await updateNote(noteToUpdate); 
        displayApiMessage({ type: 'success', text: t('noteEditor.saveSuccess') });
      }
    } catch (err) {
      displayApiMessage({ type: 'error', text: t('noteEditor.saveError') });
    }
  };

  const handleDelete = async () => {
    if (localNote && !localNote.id.startsWith('temp-')) { 
      if (window.confirm(t('noteEditor.deleteConfirmation'))) {
        await deleteNote(localNote.id);
        navigate('/');
      }
    } else { 
        setTitle(''); setTags([]);   
        setInitialMarkdownForEditor(createEmptyMarkdown()); 
        setCurrentMarkdownContent(createEmptyMarkdown());
        if (editorInstanceRef.current) editorInstanceRef.current.setMarkdown('');
        
        if (localNote && contextNote && localNote.id === contextNote.id) selectNote(null);
        if (localNote && selectedNoteId === localNote.id) selectNote(null);
        
        setLocalNote(null); 
        lastInitializedNoteIdOrNewFlagRef.current = null; 
        navigate('/'); 
    }
  };

  const handleExport = (format: 'json' | 'md' | 'txt') => {
    let contentForExport = sanitizeMarkdownString(currentMarkdownContent || localNote?.content);
    if (editorInstanceRef.current) { // Prefer content directly from editor if available
        contentForExport = editorInstanceRef.current.getMarkdown();
    }


    if (!localNote || localNote.id.startsWith('temp-')) { 
      if (title.trim() === '' && isContentTrulyEmpty(contentForExport)) {
        displayApiMessage({type: 'info', text: t('noteEditor.saveBeforeExport') + " (Note is empty)"});
        return;
      }
      const tempNoteForExport: Note = { 
          id: localNote?.id || `temp-${Date.now()}`, title, content: contentForExport, tags,
          createdAt: localNote?.createdAt || Date.now(), updatedAt: localNote?.updatedAt || Date.now()
      };
      const filenameBase = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
      switch (format) {
          case 'json': exportNotesAsJSON([tempNoteForExport], settings, `${filenameBase}.json`); break;
          case 'md': exportNoteAsMarkdown(tempNoteForExport, `${filenameBase}.md`); break;
          case 'txt': exportNoteAsTXT(tempNoteForExport, `${filenameBase}.txt`); break;
      }
      return;
    }

    const noteToExport: Note = { ...localNote, title, content: contentForExport, tags };
    const filenameBase = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
    switch (format) {
      case 'json': exportNotesAsJSON([noteToExport], settings, `${filenameBase}.json`); break;
      case 'md': exportNoteAsMarkdown(noteToExport, `${filenameBase}.md`); break;
      case 'txt': exportNoteAsTXT(noteToExport, `${filenameBase}.txt`); break;
    }
    setShowExportOptions(false);
  };
  

  if (isLoadingEditor || (notesLoading && !isNewNote && !localNote && !(location.state as any)?.initialContentText)) { 
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">{t('noteEditor.loading')}</div>;
  }
  
  if (!isNewNote && noteId && !localNote && !isLoadingEditor && !(location.state as any)?.initialContentText) {
     return (
        <div className="p-6 text-center text-slate-500 dark:text-slate-400">
          <h2 className="text-xl font-semibold mb-2">{t('noteEditor.notFound.title')}</h2>
          <p>{t('noteEditor.notFound.message')}</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-light transition-colors">
            {t('noteEditor.notFound.goToList')}
          </button>
        </div>
      );
  }
  
  const renderApiMessage = () => {
    if (!apiMessage) return null;
    let bgColor = 'bg-red-600 dark:bg-red-500';
    let icon = <ExclamationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />;

    if (apiMessage.type === 'success') {
      bgColor = 'bg-green-600 dark:bg-green-500';
      icon = <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />;
    } else if (apiMessage.type === 'info') {
      bgColor = 'bg-blue-600 dark:bg-blue-500';
      icon = <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />;
    }

    return (
      <div 
        className={`fixed top-20 right-5 p-3 rounded-md shadow-xl text-white ${bgColor} flex items-center z-[100] max-w-sm transition-all`}
        role="alert"
      >
        {icon}
        <span className="text-sm">{apiMessage.text}</span>
      </div>
    );
  };
  
  // Determine a unique key for the editor container
  let editorKey = 'empty-editor';
  if (isNewNote) {
    editorKey = localNote?.id || 'new-note-editor-temp'; // Use temp ID if available, else a generic new key
  } else if (noteId) {
    editorKey = noteId;
  }


  return (
    <div className="flex flex-col h-full"> 
      {renderApiMessage()}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          placeholder={t('noteEditor.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-grow text-2xl font-semibold p-2 border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary-light bg-transparent focus:outline-none"
          aria-label={t('noteEditor.titlePlaceholder')}
        />
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleManualSave}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary-dark transition-colors flex items-center"
            aria-label={t('noteEditor.saveButton')}
            disabled={notesLoading || isLoadingEditor}
          >
            <SaveIcon className="w-5 h-5 mr-2"/>
            {t('noteEditor.saveButton')}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="p-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary transition-colors flex items-center"
              title={t('noteEditor.exportButtonTitle')}
              aria-haspopup="true"
              aria-expanded={showExportOptions}
            >
              <DownloadIcon className="w-5 h-5"/>
              <ChevronDownIcon className="w-4 h-4 ml-1 text-slate-500 dark:text-slate-400"/>
            </button>
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-20 py-1">
                <button onClick={() => handleExport('md')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('noteEditor.exportOptions.md')}</button>
                <button onClick={() => handleExport('txt')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('noteEditor.exportOptions.txt')}</button>
                <button onClick={() => handleExport('json')} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('noteEditor.exportOptions.jsonFull')}</button>
              </div>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="p-2 border border-red-500/50 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-red-500 transition-colors"
            title={t('noteEditor.deleteButtonTitle')}
            aria-label={t('noteEditor.deleteButtonTitle')}
          >
           <TrashIcon className="w-5 h-5"/>
          </button>
        </div>
      </div>

      <TagInput tags={tags} setTags={setTags} />
      
      <div className="flex-1 flex flex-col mt-1 overflow-hidden">
        <div 
            id={EDITOR_HOLDER_ID} 
            key={editorKey} // Added key here
            ref={editorHolderRef} 
            className="w-full h-full" 
        >
        {/* Conditional loading placeholder can be added here if Cherry takes time to init after key change */}
        { (isLoadingEditor || (initialMarkdownForEditor === null && (noteId || isNewNote) && !editorHolderRef.current?.hasChildNodes() )) && 
            <div className="w-full h-full flex items-center justify-center text-slate-400 p-4 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600">
                {t('noteEditor.loading')}
            </div> 
        }
        </div>
      </div>
    </div>
  );
};
