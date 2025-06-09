
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditorJS, { OutputData, API, BlockToolConstructable } from '@editorjs/editorjs';
// Editor.js Tools
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import CodeTool from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import ImageTool from '@editorjs/image';
import Warning from '@editorjs/warning';
import Table from '@editorjs/table';
import Checklist from '@editorjs/checklist';

import { useNotes } from '../contexts/NoteContext';
import { Note, ApiFeedback, EditorJsOutputData, EditorJsBlock } from '../types';
import { TagInput } from './TagInput';
import { AiFeaturesPanel } from './AiFeaturesPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { exportNoteAsMarkdown, exportNoteAsTXT, exportNotesAsJSON } from '../services/fileService';
import { TrashIcon, DownloadIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, SaveIcon, ChevronDownIcon } from './Icons';
// EDITOR_HOLDER_ID is not used directly anymore, using ref.
// import { EDITOR_HOLDER_ID } from '../constants';


// Helper to convert plain text to basic EditorJS OutputData (paragraphs)
const textToEditorJsData = (text: string): EditorJsOutputData => {
  const blocks = text.split('\n\n') // Split by double newlines for paragraphs
    .filter(paragraph => paragraph.trim() !== '')
    .map(paragraph => ({
      type: 'paragraph' as const,
      data: { text: paragraph.trim() },
    }));
  return {
    time: Date.now(),
    blocks: blocks.length > 0 ? blocks : [{type: 'paragraph', data: {text: ''}}],
    version: "2.29.1" 
  };
};

// Helper function to convert EditorJsOutputData to plain text
const editorDataToText = (data: EditorJsOutputData | undefined | null): string => {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks
    .map(block => {
      if (!block || typeof block.data !== 'object') return ''; 
      switch (block.type) {
        case 'header':
          return block.data.text;
        case 'paragraph':
          return block.data.text;
        case 'list':
          return Array.isArray(block.data.items) ? block.data.items.join(' ') : '';
        case 'quote':
          return `${block.data.text} ${block.data.caption || ''}`;
        case 'code':
          return block.data.code;
        case 'checklist':
          return Array.isArray(block.data.items) ? block.data.items.map((item: {text: string, checked: boolean}) => item.text).join(' ') : '';
        default:
          if(block.data && typeof block.data.text === 'string') return block.data.text;
          return '';
      }
    })
    .join('\n') 
    .replace(/<[^>]+>/g, '');
};

interface NoteEditorProps {
  isNewNote?: boolean;
}

const EDITOR_VERSION_STRING = "2.29.1"; 

const createEmptyEditorData = (): EditorJsOutputData => ({
  time: Date.now(),
  blocks: [{ type: 'paragraph', data: { text: '' } }],
  version: EDITOR_VERSION_STRING,
});

export const NoteEditor: React.FC<NoteEditorProps> = ({ isNewNote = false }) => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { getNoteById, addNote, updateNote, deleteNote, loading: notesLoading, currentNote: contextNote, selectNote } = useNotes();
  const { settings } = useSettings();
  const { t, language } = useI18n();

  const [localNote, setLocalNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [initialDataForEditor, setInitialDataForEditor] = useState<EditorJsOutputData | null>(null);
  const [currentEditorContent, setCurrentEditorContent] = useState<EditorJsOutputData | null>(null);
  
  const editorInstanceRef = useRef<EditorJS | null>(null);
  const editorHolderRef = useRef<HTMLDivElement | null>(null); // Ref for the editor container div


  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [apiMessage, setApiMessage] = useState<ApiFeedback | null>(null);
  const apiMessageTimeoutRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(true);

  const editorPlaceholderText = useRef(t('noteEditor.contentPlaceholder')); // Stabilize placeholder

  useEffect(() => {
    editorPlaceholderText.current = t('noteEditor.contentPlaceholder');
  }, [t]);


  const displayApiMessage = (message: ApiFeedback) => {
    if (apiMessageTimeoutRef.current) clearTimeout(apiMessageTimeoutRef.current);
    setApiMessage(message);
    apiMessageTimeoutRef.current = window.setTimeout(() => setApiMessage(null), 4000);
  };

  // Step 1: Effect to load note data and set `initialDataForEditor`
  useEffect(() => {
    setIsLoadingEditor(true);
    const loadNote = async () => {
      if (isNewNote) {
        const emptyContent = createEmptyEditorData();
        const newTempNote: Note = {
          id: `temp-${Date.now()}`,
          title: '',
          content: emptyContent,
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setLocalNote(newTempNote);
        setTitle('');
        setTags([]);
        setInitialDataForEditor(emptyContent); 
        setCurrentEditorContent(emptyContent);
        if (noteId) selectNote(null); 
      } else if (noteId) {
        let noteToLoad: Note | undefined | null = null;
        if (contextNote && contextNote.id === noteId) {
          noteToLoad = contextNote;
        } else {
          noteToLoad = await getNoteById(noteId);
        }

        if (noteToLoad) {
          setLocalNote(noteToLoad);
          setTitle(noteToLoad.title);
          setTags(noteToLoad.tags);

          let contentToSet: EditorJsOutputData;
          if (typeof noteToLoad.content === 'string') {
            console.warn(`Note ID ${noteId}: Content is a string. Converting.`);
            contentToSet = textToEditorJsData(noteToLoad.content);
          } else if (
            noteToLoad.content &&
            typeof noteToLoad.content === 'object' &&
            Array.isArray(noteToLoad.content.blocks)
          ) {
            const validatedBlocks = noteToLoad.content.blocks.map((block: any) => {
              // Ensure block and block.data are objects
              if (typeof block !== 'object' || block === null || typeof block.data !== 'object' || block.data === null) {
                console.warn(`Sanitizing block (ID: ${block?.id || 'N/A'}): Malformed block structure. Converting to empty paragraph.`);
                return { type: 'paragraph', data: { text: '' } };
              }
              
              const newBlock = { ...block, data: { ...block.data } }; // Deep copy data

              if (newBlock.type === 'header') {
                if (typeof newBlock.data.text !== 'string') {
                  console.warn(`Sanitizing header block (ID: ${newBlock.id || 'N/A'}): 'text' was not a string or missing. Setting to empty string.`);
                  newBlock.data.text = '';
                }
                if (typeof newBlock.data.level !== 'number' || newBlock.data.level < 1 || newBlock.data.level > 6) {
                  console.warn(`Sanitizing header block (ID: ${newBlock.id || 'N/A'}): 'level' was invalid or missing (${newBlock.data.level}). Setting to 2.`);
                  newBlock.data.level = 2; // Default to H2
                }
              }
              // Add similar validation for other crucial block types if necessary
              // For example, for 'list':
              // if (newBlock.type === 'list') {
              //   if (!Array.isArray(newBlock.data.items)) newBlock.data.items = [];
              //   if (typeof newBlock.data.style !== 'string' || (newBlock.data.style !== 'ordered' && newBlock.data.style !== 'unordered')) {
              //     newBlock.data.style = 'unordered';
              //   }
              // }
              return newBlock;
            }).filter(block => block !== null); // Remove any blocks that became null after potential future stricter validation

            contentToSet = { ...(noteToLoad.content as EditorJsOutputData), blocks: validatedBlocks };
            if (contentToSet.blocks.length === 0) {
              contentToSet = createEmptyEditorData();
            }
          } else {
            console.warn(`Note ID ${noteId}: Content malformed, null, or undefined. Initializing empty.`);
            contentToSet = createEmptyEditorData();
          }
          setInitialDataForEditor(contentToSet);
          setCurrentEditorContent(contentToSet);
        } else {
          console.warn(`Note ${noteId} not found. Navigating to home.`);
          navigate('/');
          setInitialDataForEditor(null);
          setCurrentEditorContent(null);
        }
      } else {
        setInitialDataForEditor(null);
        setCurrentEditorContent(null);
      }
      setIsLoadingEditor(false);
    };

    loadNote();
  }, [noteId, isNewNote, getNoteById, navigate, contextNote, selectNote]);


  // Step 2: Effect to initialize Editor.js when `initialDataForEditor` is ready AND holder is mounted
  useEffect(() => {
    if (!initialDataForEditor || !editorHolderRef.current || isLoadingEditor) {
      return;
    }

    // Destroy previous instance
    if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
      try {
        editorInstanceRef.current.destroy();
      } catch (e) {
        console.error("Error destroying previous Editor.js instance:", e);
      }
    }
    editorInstanceRef.current = null;
    
    // Clear the holder 
    const holder = editorHolderRef.current;
    while (holder.firstChild) {
        holder.removeChild(holder.firstChild);
    }
    
    // Defer Editor.js instantiation slightly longer.
    // NOTE on "getLayoutMap() must be called from a top-level browsing context...":
    // This error is often encountered when the application is running in a sandboxed iframe
    // (e.g., in some online IDEs or preview environments). The iframe's security policy
    // (sandbox attribute or Permissions-Policy header) may restrict access to the
    // getLayoutMap() browser API. This is an environmental restriction and typically
    // cannot be "fixed" from within the iframe's content code.
    // The 100ms delay below is an attempt to ensure the DOM is as settled as possible,
    // which can sometimes help with rendering-related issues in complex libraries,
    // but it won't override a strict permission policy.
    const editorTimeout = setTimeout(() => {
        if (!editorHolderRef.current || !initialDataForEditor) { // Re-check as state might change
             console.warn("Editor holder or initial data became null before deferred initialization.");
             return;
        }
        try {
            const editor = new EditorJS({
              holder: editorHolderRef.current, 
              data: initialDataForEditor,
              placeholder: editorPlaceholderText.current, 
            //   autofocus: false, // Removed to potentially help with layout issues
              tools: {
                paragraph: { class: Paragraph as unknown as BlockToolConstructable, inlineToolbar: true },
                header: Header as unknown as BlockToolConstructable, // Default level can be set here if needed: { class: Header, config: { defaultLevel: 2 } }
                list: List as unknown as BlockToolConstructable,
                quote: Quote as unknown as BlockToolConstructable,
                code: CodeTool as unknown as BlockToolConstructable,
                delimiter: Delimiter as unknown as BlockToolConstructable,
                image: {
                    class: ImageTool as unknown as BlockToolConstructable,
                    config: {
                        uploader: {
                            uploadByFile: (file: File) => new Promise(r => { const reader = new FileReader(); reader.onload = e => r({success:1, file:{url: e.target?.result as string}}); reader.readAsDataURL(file);}),
                            uploadByUrl: (url: string) => (url && (url.startsWith('http') || url.startsWith('data:'))) ? Promise.resolve({success:1, file:{url}}) : Promise.resolve({success:0, file:{url:'', message:'Invalid URL'}})
                        }
                    }
                },
                warning: Warning as unknown as BlockToolConstructable,
                table: Table as unknown as BlockToolConstructable,
                checklist: Checklist as unknown as BlockToolConstructable,
              },
              onChange: async (api: API, event: CustomEvent) => {
                if (api && typeof api.saver?.save === 'function') {
                  const savedData = await api.saver.save();
                  if (savedData && Array.isArray(savedData.blocks)) {
                     setCurrentEditorContent(savedData); 
                  } else {
                     console.warn("Editor.js onChange returned invalid data structure.", savedData);
                  }
                }
              },
              onReady: () => { /* console.log('Editor.js is ready.'); */ },
            });
            editorInstanceRef.current = editor;
        } catch (e) {
            console.error("Failed to initialize Editor.js:", e);
            displayApiMessage({type: 'error', text: 'Editor failed to load. Try refreshing or check console.'});
        }
    }, 50); // Reduced delay slightly based on previous changes, ensure DOM is ready

    return () => {
      clearTimeout(editorTimeout);
      if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
        try {
          editorInstanceRef.current.destroy();
        } catch (e) { /* console.error("Error destroying Editor.js on cleanup:", e); */ }
      }
      editorInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataForEditor, isLoadingEditor, isNewNote]); // Added isNewNote as it affects initialData

  
  // Auto-save logic
  const handleAutoSave = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(async () => {
      if (!localNote || !currentEditorContent || !Array.isArray(currentEditorContent.blocks)) { 
        return;
      }

      const isTrulyEmptyNewNote = localNote.id.startsWith('temp-') && title.trim() === '' && (currentEditorContent.blocks.length === 0 || (currentEditorContent.blocks.length === 1 && currentEditorContent.blocks[0].type === 'paragraph' && !currentEditorContent.blocks[0].data.text?.trim()));
      
      if (isTrulyEmptyNewNote) {
        return;
      }
      
      const validatedContentForSave = {
        ...currentEditorContent,
        blocks: Array.isArray(currentEditorContent.blocks) ? currentEditorContent.blocks : []
      };
      
      const noteDataForSave = { title, content: validatedContentForSave, tags };

      if (!localNote.id.startsWith('temp-')) {
        const originalContentText = editorDataToText(localNote.content); 
        const currentContentTextFromState = editorDataToText(currentEditorContent);
        
        const noChanges = title === localNote.title &&
                          currentContentTextFromState === originalContentText && 
                          JSON.stringify(tags) === JSON.stringify(localNote.tags);
        if (noChanges) {
            return;
        }
      }
      
      if (localNote.id.startsWith('temp-')) {
        const newNote = await addNote(noteDataForSave);
        if (newNote) {
          navigate(`/note/${newNote.id}`, { replace: true });
        }
      } else {
        const noteToUpdate = { ...localNote, ...noteDataForSave };
        await updateNote(noteToUpdate);
      }
    }, 2000); 
  }, [localNote, title, currentEditorContent, tags, addNote, updateNote, navigate]);


  useEffect(() => {
    if (localNote && currentEditorContent && !isLoadingEditor) { 
      handleAutoSave();
    }
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [title, currentEditorContent, tags, localNote, handleAutoSave, isLoadingEditor]);


  const handleManualSave = async () => {
    if (!localNote) {
        displayApiMessage({ type: 'error', text: t('noteEditor.saveError') + ' (No local note)' });
        return;
    }
    
    let contentToSave = currentEditorContent;
    if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
        try {
            contentToSave = await editorInstanceRef.current.save();
             if (contentToSave && Array.isArray(contentToSave.blocks)) {
                setCurrentEditorContent(contentToSave);
            } else {
                throw new Error("Editor returned invalid data on save.");
            }
        } catch (e) {
            console.error("Error getting data from editor on manual save:", e);
            displayApiMessage({ type: 'error', text: t('noteEditor.saveError') + ' (Editor data retrieval failed)' });
            return;
        }
    }

    if (!contentToSave || !Array.isArray(contentToSave.blocks)) { 
        displayApiMessage({ type: 'error', text: t('noteEditor.saveError')  + ' (No valid content to save)'});
        return;
    }
    setApiMessage(null);
    
    const validatedContentForSave = {
        ...contentToSave,
        blocks: Array.isArray(contentToSave.blocks) ? contentToSave.blocks : []
    };

    const noteDataToSave = { title, content: validatedContentForSave, tags };

    try {
      if (isNewNote || localNote.id.startsWith('temp-')) {
        const isTrulyEmpty = title.trim() === '' && (validatedContentForSave.blocks.length === 0 || (validatedContentForSave.blocks.length === 1 && validatedContentForSave.blocks[0].type === 'paragraph' && !validatedContentForSave.blocks[0].data.text?.trim()));
        if (isTrulyEmpty) {
            displayApiMessage({ type: 'error', text: t('noteEditor.emptyNoteError') });
            return;
        }
        const newNote = await addNote(noteDataToSave);
        if (newNote) {
          navigate(`/note/${newNote.id}`, { replace: true });
          displayApiMessage({ type: 'success', text: t('noteEditor.createSuccess') });
        }
      } else {
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
        setTitle('');
        setTags([]);
        const emptyData = createEmptyEditorData();
        setInitialDataForEditor(emptyData); 
        setCurrentEditorContent(emptyData);
        setLocalNote(null);
        if (editorInstanceRef.current?.clear) editorInstanceRef.current.clear();
        navigate('/'); 
    }
  };

  const handleExport = (format: 'json' | 'md' | 'txt') => {
    const contentForExport = currentEditorContent || localNote?.content;
    if (!localNote || localNote.id.startsWith('temp-') || !contentForExport || !Array.isArray(contentForExport.blocks)) { 
      displayApiMessage({type: 'info', text: t('noteEditor.saveBeforeExport')});
      return;
    }
    const noteToExport: Note = { 
        ...localNote, 
        title, 
        content: contentForExport, 
        tags 
    };
    const filenameBase = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note';
    switch (format) {
      case 'json': exportNotesAsJSON([noteToExport], settings, `${filenameBase}.json`); break;
      case 'md': exportNoteAsMarkdown(noteToExport, `${filenameBase}.md`); break;
      case 'txt': exportNoteAsTXT(noteToExport, `${filenameBase}.txt`); break;
    }
    setShowExportOptions(false);
  };
  
  const getFullContentAsText = async (): Promise<string> => {
    if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
      const savedData = await editorInstanceRef.current.save();
      return editorDataToText(savedData);
    }
    return editorDataToText(currentEditorContent); 
  };

  const applyAiSuggestionToEditor = (textOutput: string) => {
    const newEditorData = textToEditorJsData(textOutput);
    if (editorInstanceRef.current && typeof editorInstanceRef.current.render === 'function') {
      editorInstanceRef.current.render(newEditorData); 
      setCurrentEditorContent(newEditorData); 
    } else {
        // This case should ideally not happen if editor is initialized correctly
        console.warn("Attempting to apply AI suggestion but editor instance is not fully available. Setting as initial data.");
        setInitialDataForEditor(newEditorData); 
        setCurrentEditorContent(newEditorData);
    }
  };


  if (isLoadingEditor || (notesLoading && !isNewNote && !localNote && !initialDataForEditor)) { 
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">{t('noteEditor.loading')}</div>;
  }
  
  if (!isNewNote && !noteId && !localNote && !isLoadingEditor) {
     return <div className="p-6 text-center text-slate-500 dark:text-slate-400">{t('noteEditor.loading')}</div>; 
  }
  if (!isNewNote && noteId && !localNote && !isLoadingEditor) {
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
  
  const fontSizeClass = settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base';

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

  const aiButtonDisabled = settings.openRouterApiKeyStatus !== 'valid';
  let aiButtonTitle = t('noteEditor.aiFeatures.toggle');
  if (settings.openRouterApiKeyStatus === 'checking') aiButtonTitle = t('noteEditor.aiFeatures.checkingKey');
  else if (settings.openRouterApiKeyStatus === 'invalid') aiButtonTitle = t('noteEditor.aiFeatures.keyInvalid');
  else if (settings.openRouterApiKeyStatus === 'unset' || (settings.openRouterApiKeyStatus === 'set' && !settings.openRouterApiKey)) aiButtonTitle = t('noteEditor.aiFeatures.keyMissing');
  else if (aiButtonDisabled) aiButtonTitle = t('noteEditor.aiFeatures.keyNotSet');


  return (
    <div className={`p-0 md:px-2 h-full flex flex-col ${fontSizeClass} relative`}>
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
      
      <div className="my-3 flex items-center justify-between">
        <button 
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`px-3 py-1.5 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary transition-colors flex items-center
                        ${aiButtonDisabled ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-secondary dark:bg-secondary-dark text-white hover:bg-secondary-light dark:hover:bg-secondary'}`}
            disabled={aiButtonDisabled}
            title={aiButtonTitle}
            aria-expanded={showAiPanel}
        >
          {t('noteEditor.aiFeatures.toggle')}
          {settings.openRouterApiKeyStatus === 'checking' && <span className="ml-1.5 text-xs">{t('noteEditor.aiFeatures.checkingKey')}</span>}
          {settings.openRouterApiKeyStatus === 'invalid' && <span className="ml-1.5 text-xs">{t('noteEditor.aiFeatures.keyInvalid')}</span>}
          {(settings.openRouterApiKeyStatus === 'unset' || (settings.openRouterApiKeyStatus === 'set' && !settings.openRouterApiKey)) && <span className="ml-1.5 text-xs">{t('noteEditor.aiFeatures.keyMissing')}</span>}
          <ChevronDownIcon className={`w-4 h-4 ml-1.5 transform transition-transform ${showAiPanel ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showAiPanel && settings.openRouterApiKeyStatus === 'valid' && (localNote || isNewNote) && (
        <AiFeaturesPanel
          noteTitle={title} 
          getFullContentAsText={getFullContentAsText}
          onSuggestionsApplied={applyAiSuggestionToEditor} 
          onTagsSuggested={(newTags) => setTags(prev => Array.from(new Set([...prev, ...newTags])))}
          setApiMessage={displayApiMessage}
          selectedAiModel={settings.aiModel}
        />
      )}
      
      <div className="flex-1 flex flex-col mt-1 min-h-[300px] sm:min-h-[400px] border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 overflow-y-auto">
        <div 
            ref={editorHolderRef} 
            className="p-2 prose dark:prose-invert max-w-none w-full h-full"
        >
        { (isLoadingEditor || (!initialDataForEditor && (noteId || isNewNote) && !editorHolderRef.current )) && <p className="text-center text-slate-400 p-4">{t('noteEditor.loading')}</p> }
        </div>
      </div>
    </div>
  );
};
