
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Cherry from 'cherry-markdown';

import { useNotes } from '../contexts/NoteContext';
import { Note, NotePage, ApiFeedback } from '../types';
import { TagInput } from './TagInput';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { exportNoteAsMarkdown, exportNoteAsTXT, exportNotesAsJSON } from '../services/fileService';
import { TrashIcon, DownloadIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, SaveIcon, ChevronDownIcon, ArrowLeftIcon, PlusIcon, XMarkIcon } from './Icons';
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
  const [activePageId, setActivePageId] = useState<string | null>(null);
  
  const [initialMarkdownForEditor, setInitialMarkdownForEditor] = useState<string | null>(null);
  
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
      let noteToSetAsLocal: Note | null = null;

      if (isNewNote) {
        const firstPage: NotePage = { id: crypto.randomUUID(), title: 'Page 1', content: passedState?.initialContentText || '' };
        noteToSetAsLocal = {
          id: `temp-${Date.now()}`,
          title: passedState?.initialTitle || '',
          pages: [firstPage],
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        if (passedState) navigate(location.pathname, { replace: true, state: null });
        if (noteId && noteId !== 'new' && selectedNoteId !== null) selectNote(null);
      } else if (noteId) {
        let noteToLoad: Note | undefined | null = contextNote && contextNote.id === noteId ? contextNote : await getNoteById(noteId);

        if (noteToLoad) {
          if (passedState?.replaceExistingContent && passedState?.initialContentText) {
            const updatedPage: NotePage = { ...noteToLoad.pages[0], content: sanitizeMarkdownString(passedState.initialContentText) };
            noteToLoad = { ...noteToLoad, pages: [updatedPage, ...noteToLoad.pages.slice(1)] };
            navigate(location.pathname, { replace: true, state: null });
          }
          noteToSetAsLocal = noteToLoad;
        } else {
          console.warn(`Note ${noteId} not found. Navigating to home.`);
          navigate('/');
          return;
        }
      }

      setLocalNote(noteToSetAsLocal);
      if (noteToSetAsLocal) {
        setTitle(noteToSetAsLocal.title);
        setTags(noteToSetAsLocal.tags);
        const firstPageId = noteToSetAsLocal.pages[0]?.id || null;
        setActivePageId(firstPageId);
        setInitialMarkdownForEditor(noteToSetAsLocal.pages[0]?.content || '');
      } else {
        setTitle('');
        setTags([]);
        setActivePageId(null);
        setInitialMarkdownForEditor('');
      }
      setIsLoadingEditor(false);
    };

    loadNote();
  }, [noteId, isNewNote, getNoteById, navigate, contextNote, selectNote, location.state]);

  const getFullContentAsTextInternal = useCallback(async (): Promise<string> => {
    if (!localNote || !activePageId) return '';
    
    // If the editor is active, get fresh content from it
    if (editorInstanceRef.current) {
      return editorInstanceRef.current.getMarkdown();
    }

    // Otherwise, return the content from the state
    const activePage = localNote.pages.find(p => p.id === activePageId);
    return activePage?.content || '';
  }, [localNote, activePageId]);

  const applyAiChangesToEditorInternal = useCallback((newMarkdown: string) => {
    const sanitizedMarkdown = sanitizeMarkdownString(newMarkdown);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setMarkdown(sanitizedMarkdown);
    } else {
      setInitialMarkdownForEditor(sanitizedMarkdown);
    }
    // Also update the localNote state
    setLocalNote(prevNote => {
      if (!prevNote || !activePageId) return prevNote;
      const newPages = prevNote.pages.map(p =>
        p.id === activePageId ? { ...p, content: sanitizedMarkdown } : p
      );
      return { ...prevNote, pages: newPages };
    });
  }, [activePageId]);

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
      // If instance exists, just update content to avoid full re-initialization
      if (editorInstanceRef.current.getMarkdown() !== initialMarkdownForEditor) {
        editorInstanceRef.current.setMarkdown(initialMarkdownForEditor);
      }
      return;
    }
  
    const holder = editorHolderRef.current;
    try {
      const cherryConfig = {
        el: holder,
        value: initialMarkdownForEditor,
        toolbars: { theme: settings.theme, showToolbar: true },
        editor: { height: '100%', defaultModel: 'editOnly' as const },
        fileUpload: (file: File, callback: (url: string, params?: Record<string, any>) => void) => {
          const reader = new FileReader();
          reader.onload = (e) => callback(e.target?.result as string, { name: file.name });
          reader.readAsDataURL(file);
        },
        callback: {
          afterChange: (markdown: string) => {
            setLocalNote(prevNote => {
              if (!prevNote || !activePageId) return prevNote;
              const newPages = prevNote.pages.map(p =>
                p.id === activePageId ? { ...p, content: markdown } : p
              );
              return { ...prevNote, pages: newPages };
            });
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
        } catch (e) { /* ignore */ }
        editorInstanceRef.current = null;
      }
    };
  }, [initialMarkdownForEditor, isLoadingEditor, displayApiMessage, activePageId]);
  
  const isNoteTrulyEmpty = (note: Note | null): boolean => {
    if (!note) return true;
    const hasContent = note.pages.some(p => p.content.trim() !== '');
    return note.title.trim() === '' && !hasContent;
  };

  const handleManualSave = async () => {
    if (!localNote) {
      displayApiMessage({ type: 'error', text: t('noteEditor.saveError') + ' (No local note context)' });
      return;
    }

    // Ensure latest content from editor is in localNote state before saving
    let noteToSave = localNote;
    if (editorInstanceRef.current && activePageId) {
      const currentMarkdown = editorInstanceRef.current.getMarkdown();
      const newPages = localNote.pages.map(p => p.id === activePageId ? { ...p, content: currentMarkdown } : p);
      noteToSave = { ...localNote, pages: newPages };
      setLocalNote(noteToSave); // Update state to reflect final content
    }
    
    const finalNoteData = { ...noteToSave, title, tags };

    try {
      if (isNewNote || finalNoteData.id.startsWith('temp-')) {
        if (isNoteTrulyEmpty(finalNoteData)) {
          displayApiMessage({ type: 'error', text: t('noteEditor.emptyNoteError') });
          return;
        }
        const newNote = await addNote(finalNoteData);
        if (newNote) {
          navigate(`/note/${newNote.id}`, { replace: true });
          displayApiMessage({ type: 'success', text: t('noteEditor.createSuccess') });
        }
      } else {
        await updateNote(finalNoteData);
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
        const firstPage: NotePage = { id: crypto.randomUUID(), title: 'Page 1', content: '' };
        setLocalNote({
          id: `temp-${Date.now()}`, title: '', pages: [firstPage], tags: [],
          createdAt: Date.now(), updatedAt: Date.now(),
        });
        setActivePageId(firstPage.id);
        setInitialMarkdownForEditor('');
        if (editorInstanceRef.current) editorInstanceRef.current.setMarkdown('');
        
        if (localNote && contextNote && localNote.id === contextNote.id) selectNote(null);
        if (localNote && selectedNoteId === localNote.id) selectNote(null);
        
        setLocalNote(null); 
        lastInitializedNoteIdOrNewFlagRef.current = null; 
        navigate('/'); 
    }
  };

  const handleExport = (format: 'json' | 'md' | 'txt') => {
    if (!localNote) return;
    
    let noteToExport = { ...localNote, title, tags };
    if (editorInstanceRef.current && activePageId) {
      const currentMarkdown = editorInstanceRef.current.getMarkdown();
      const newPages = noteToExport.pages.map(p => p.id === activePageId ? { ...p, content: currentMarkdown } : p);
      noteToExport = { ...noteToExport, pages: newPages };
    }

    if (isNoteTrulyEmpty(noteToExport)) {
      displayApiMessage({type: 'info', text: t('noteEditor.saveBeforeExport') + " (Note is empty)"});
      return;
    }

    const filenameBase = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
    switch (format) {
      case 'json': exportNotesAsJSON([noteToExport], settings, `${filenameBase}.json`); break;
      // For md/txt, we might want to export the active page or all pages concatenated
      // For now, let's export the active page
      case 'md': {
        const activePage = noteToExport.pages.find(p => p.id === activePageId);
        if (activePage) exportNoteAsMarkdown({ ...noteToExport, content: activePage.content }, `${filenameBase}.md`);
        break;
      }
      case 'txt': {
        const activePage = noteToExport.pages.find(p => p.id === activePageId);
        if (activePage) exportNoteAsTXT({ ...noteToExport, content: activePage.content }, `${filenameBase}.txt`);
        break;
      }
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
  let editorKey = localNote ? `${localNote.id}-${activePageId}` : 'empty-editor';


  return (
    <div className="flex flex-col h-full"> 
      {renderApiMessage()}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-grow">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors flex-shrink-0"
            title={t('noteEditor.backButton')}
            aria-label={t('noteEditor.backButton')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            placeholder={t('noteEditor.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-grow text-2xl font-semibold p-2 border-b-2 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary-light bg-transparent focus:outline-none"
            aria-label={t('noteEditor.titlePlaceholder')}
          />
        </div>
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

      {/* Pages Tab UI */}
      <div className="mt-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          {localNote?.pages.map((page, index) => (
            <div key={page.id} className="relative group">
              <button
                onClick={() => setActivePageId(page.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activePageId === page.id
                    ? 'border-primary text-primary dark:text-primary-light'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {page.title}
              </button>
              {localNote.pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('noteEditor.deletePageConfirmation', { pageTitle: page.title }))) {
                      setLocalNote(prev => {
                        if (!prev) return null;
                        const newPages = prev.pages.filter(p => p.id !== page.id);
                        if (activePageId === page.id) {
                          const newActiveId = newPages[index] ? newPages[index].id : newPages[index - 1]?.id;
                          setActivePageId(newActiveId);
                          setInitialMarkdownForEditor(newPages.find(p => p.id === newActiveId)?.content || '');
                        }
                        return { ...prev, pages: newPages };
                      });
                    }
                  }}
                  className="absolute top-0 right-0 p-0.5 bg-slate-200 dark:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t('noteEditor.deletePageButton')}
                >
                  <XMarkIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              if (!localNote) return;
              const newPage: NotePage = {
                id: crypto.randomUUID(),
                title: `Page ${localNote.pages.length + 1}`,
                content: '',
              };
              const newPages = [...localNote.pages, newPage];
              setLocalNote({ ...localNote, pages: newPages });
              setActivePageId(newPage.id);
              setInitialMarkdownForEditor('');
            }}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-light rounded-md"
            aria-label={t('noteEditor.addPageButton')}
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col mt-1 overflow-hidden">
        <div
            id={EDITOR_HOLDER_ID}
            key={editorKey}
            ref={editorHolderRef}
            className="w-full h-full"
        >
        { (isLoadingEditor || (initialMarkdownForEditor === null && (noteId || isNewNote))) &&
            <div className="w-full h-full flex items-center justify-center text-slate-400 p-4 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600">
                {t('noteEditor.loading')}
            </div>
        }
        </div>
      </div>
    </div>
  );
};
