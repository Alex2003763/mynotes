
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import EditorJS, { OutputData, API, BlockToolConstructable } from '@editorjs/editorjs';
// Editor.js Tools
import HeaderTool from '@editorjs/header';
import ListTool from '@editorjs/list';
import ParagraphTool from '@editorjs/paragraph';
import QuoteTool from '@editorjs/quote';
import CodeToolTool from '@editorjs/code';
import DelimiterTool from '@editorjs/delimiter';
import ImageToolTool from '@editorjs/image';
import WarningTool from '@editorjs/warning';
import TableTool from '@editorjs/table';
import ChecklistTool from '@editorjs/checklist';

import { useNotes } from '../contexts/NoteContext';
import { Note, ApiFeedback, EditorJsOutputData, EditorJsBlock } from '../types';
import { TagInput } from './TagInput';
import { AiFeaturesPanel } from './AiFeaturesPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { exportNoteAsMarkdown, exportNoteAsTXT, exportNotesAsJSON } from '../services/fileService';
import { TrashIcon, DownloadIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, SaveIcon, ChevronDownIcon, LightBulbIcon } from './Icons';
import { EDITOR_HOLDER_ID } from '../constants';

const EDITOR_VERSION_STRING = "2.30.0"; // Use a consistent version string

export const createEmptyEditorData = (version = EDITOR_VERSION_STRING): EditorJsOutputData => ({
  time: Date.now(),
  blocks: [{ type: 'paragraph', data: { text: '' } }],
  version: version,
});

// Helper to convert plain text to basic EditorJS OutputData (paragraphs)
export const textToEditorJsData = (text: string): EditorJsOutputData => {
  const paragraphs = text.split(/[\r\n]+/).map(p => p.trim());
  const blocks = paragraphs
    .map(paragraph => ({
      type: 'paragraph' as const,
      data: { text: paragraph },
    }));
  return {
    time: Date.now(),
    blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
    version: EDITOR_VERSION_STRING
  };
};

const editorDataToText = (data: EditorJsOutputData | undefined | null): string => {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks
    .map(block => {
      if (!block || typeof block.data !== 'object' || block.data === null) return '';
      switch (block.type) {
        case 'header':
          return block.data.text || '';
        case 'paragraph':
          return block.data.text || '';
        case 'list':
          return Array.isArray(block.data.items) ? block.data.items.join(' ') : '';
        case 'quote':
          return `${block.data.text || ''} ${block.data.caption || ''}`.trim();
        case 'code':
          return block.data.code || '';
        case 'checklist':
          return Array.isArray(block.data.items) ? block.data.items.map((item: any) => item.text || '').join(' ') : '';
        default:
          if (block.data && typeof (block.data as any).text === 'string') return (block.data as any).text;
          return '';
      }
    })
    .join('\n')
    .replace(/<[^>]+>/g, '');
};

export const sanitizeEditorOutputData = (data: any): EditorJsOutputData => {
  const defaultVersion = EDITOR_VERSION_STRING;
  const defaultTime = Date.now();

  if (typeof data === 'string') {
    console.warn("Sanitizing: Input data is a string. Converting to basic EditorJsOutputData.");
    return textToEditorJsData(data);
  }

  if (!data || typeof data !== 'object') {
    console.warn("Sanitizing: Input data is not a valid object. Returning empty structure.");
    return createEmptyEditorData(defaultVersion);
  }

  const output: EditorJsOutputData = {
    time: typeof data.time === 'number' ? data.time : defaultTime,
    blocks: [],
    version: typeof data.version === 'string' ? data.version : defaultVersion,
  };

  if (!Array.isArray(data.blocks)) {
    console.warn("Sanitizing: Data.blocks is not an array. Returning structure with one empty paragraph.");
    output.blocks = [{ type: 'paragraph', data: { text: '' } }];
    return output;
  }

  output.blocks = data.blocks.map((block: any, index: number): EditorJsBlock | null => {
    if (typeof block !== 'object' || block === null) {
      console.warn(`Sanitizing block ${index}: Block is not an object. Converting to empty paragraph.`);
      return { id: block?.id || `malformed-${index}`, type: 'paragraph', data: { text: '' } };
    }
    if (typeof block.type !== 'string' || !block.type) {
      console.warn(`Sanitizing block ${index} (ID: ${block.id || 'N/A'}): Type is missing or not a string. Converting to empty paragraph.`);
      return { id: block.id || `malformed-type-${index}`, type: 'paragraph', data: { text: '' } };
    }
    
    const blockDataInput = (typeof block.data === 'object' && block.data !== null) ? block.data : {};
    const sanitizedBlock: EditorJsBlock = { 
        id: typeof block.id === 'string' ? block.id : undefined, 
        type: block.type, 
        data: { ...blockDataInput } 
    };

    switch (sanitizedBlock.type) {
      case 'paragraph':
        sanitizedBlock.data = {
          text: typeof blockDataInput.text === 'string' ? blockDataInput.text : ''
        };
        break;
      case 'header':
        let level = parseInt(String(blockDataInput.level), 10);
        if (isNaN(level) || level < 1 || level > 6) level = 2;
        sanitizedBlock.data = {
          text: typeof blockDataInput.text === 'string' ? blockDataInput.text : '',
          level: level
        };
        break;
      case 'list':
        if (!Array.isArray(sanitizedBlock.data.items) || !sanitizedBlock.data.items.every((item: any) => typeof item === 'string')) {
          sanitizedBlock.data.items = (Array.isArray(sanitizedBlock.data.items) ? sanitizedBlock.data.items.filter((item:any) => typeof item === 'string').map((item:any) => String(item)) : []) as string[];
        }
        if (typeof sanitizedBlock.data.style !== 'string' || !['ordered', 'unordered'].includes(sanitizedBlock.data.style)) {
          sanitizedBlock.data.style = 'unordered';
        }
        break;
      case 'image':
        if (typeof sanitizedBlock.data.file !== 'object' || sanitizedBlock.data.file === null || typeof sanitizedBlock.data.file.url !== 'string') {
            if (typeof sanitizedBlock.data.url === 'string' && sanitizedBlock.data.url) { 
                 sanitizedBlock.data.file = { url: sanitizedBlock.data.url };
            } else {
                 console.warn(`Sanitizing image block (ID: ${sanitizedBlock.id || 'N/A'}): Invalid file URL. Block might not render.`);
                 sanitizedBlock.data.file = { url: '' }; 
            }
        }
        if (typeof sanitizedBlock.data.caption !== 'string') sanitizedBlock.data.caption = '';
        if (typeof sanitizedBlock.data.withBorder !== 'boolean') sanitizedBlock.data.withBorder = false;
        if (typeof sanitizedBlock.data.stretched !== 'boolean') sanitizedBlock.data.stretched = false;
        if (typeof sanitizedBlock.data.withBackground !== 'boolean') sanitizedBlock.data.withBackground = false;
        break;
      case 'checklist':
        if (!Array.isArray(sanitizedBlock.data.items) || !sanitizedBlock.data.items.every((item: any) => typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.checked === 'boolean')) {
          sanitizedBlock.data.items = (Array.isArray(sanitizedBlock.data.items) 
            ? sanitizedBlock.data.items.filter((item:any) => typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.checked === 'boolean')
            : []
          ) as {text: string, checked: boolean}[];
        }
        break;
      case 'code':
        if (typeof sanitizedBlock.data.code !== 'string') sanitizedBlock.data.code = '';
        break;
      case 'quote':
        if (typeof sanitizedBlock.data.text !== 'string') sanitizedBlock.data.text = '';
        if (typeof sanitizedBlock.data.caption !== 'string') sanitizedBlock.data.caption = '';
        if (typeof sanitizedBlock.data.alignment !== 'string' || !['left', 'center'].includes(sanitizedBlock.data.alignment)) {
             sanitizedBlock.data.alignment = 'left';
        }
        break;
      case 'table':
        if (typeof sanitizedBlock.data.withHeadings !== 'boolean') sanitizedBlock.data.withHeadings = false;
        if (!Array.isArray(sanitizedBlock.data.content) || !sanitizedBlock.data.content.every((row: any) => Array.isArray(row) && row.every((cell: any) => typeof cell === 'string'))) {
          const fixedContent: string[][] = [];
          if(Array.isArray(sanitizedBlock.data.content)) {
            sanitizedBlock.data.content.forEach((rowItem: any) => {
              if(Array.isArray(rowItem)) {
                fixedContent.push(rowItem.map(cell => typeof cell === 'string' ? cell : String(cell)));
              }
            });
          }
          sanitizedBlock.data.content = fixedContent;
        }
        break;
      case 'warning':
        if (typeof sanitizedBlock.data.title !== 'string') sanitizedBlock.data.title = '';
        if (typeof sanitizedBlock.data.message !== 'string') sanitizedBlock.data.message = '';
        break;
      case 'delimiter': break;
      default:
        console.warn(`Sanitizing block (ID: ${sanitizedBlock.id || 'N/A'}): Unknown block type "${sanitizedBlock.type}". Keeping data as is, but ensuring data is an object.`);
        if (typeof sanitizedBlock.data !== 'object' || sanitizedBlock.data === null) {
          sanitizedBlock.data = {}; 
        }
    }
    return sanitizedBlock;
  }).filter(block => block !== null) as EditorJsBlock[]; 

  if (output.blocks.length === 0) {
    console.warn("Sanitizing: All blocks were invalid or removed. Returning structure with one empty paragraph.");
    output.blocks = [{ type: 'paragraph', data: { text: '' } }];
  }

  return output;
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
  const { t, language } = useI18n();

  const [localNote, setLocalNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [initialDataForEditor, setInitialDataForEditor] = useState<EditorJsOutputData | null>(null);
  const [currentEditorContent, setCurrentEditorContent] = useState<EditorJsOutputData | null>(null);
  
  const editorInstanceRef = useRef<EditorJS | null>(null);
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
      let noteDataForEditorInitialization: EditorJsOutputData | undefined = undefined;
      let noteTitle = '';
      let noteTags: string[] = [];

      if (isNewNote) {
        if (passedState?.initialContentText) {
          noteDataForEditorInitialization = sanitizeEditorOutputData(textToEditorJsData(passedState.initialContentText));
          noteTitle = passedState.initialTitle || '';
          // Clear state after using it
          navigate(location.pathname, { replace: true, state: null });
        } else if (lastInitializedNoteIdOrNewFlagRef.current !== 'new' || !editorInstanceRef.current) {
          noteDataForEditorInitialization = createEmptyEditorData();
        }
        lastInitializedNoteIdOrNewFlagRef.current = 'new';
        const tempNoteContent = noteDataForEditorInitialization || currentEditorContent || createEmptyEditorData();
        setLocalNote({
          id: `temp-${Date.now()}`, title: noteTitle, content: tempNoteContent,
          tags: noteTags, createdAt: Date.now(), updatedAt: Date.now(),
        });
        setTitle(noteTitle);
        setTags(noteTags);
        if (noteId && noteId !== 'new') selectNote(null);

      } else if (noteId) {
        let noteToLoad: Note | undefined | null = null;
        if (passedState?.replaceExistingContent && passedState?.initialContentText) {
            // Load existing note for title/tags, but use passed content
            noteToLoad = await getNoteById(noteId);
            if (noteToLoad) {
                noteDataForEditorInitialization = sanitizeEditorOutputData(textToEditorJsData(passedState.initialContentText));
                noteTitle = noteToLoad.title;
                noteTags = noteToLoad.tags;
                // Clear state after using it
                navigate(location.pathname, { replace: true, state: null });
            } else { // Note not found, treat as new with this content
                 noteDataForEditorInitialization = sanitizeEditorOutputData(textToEditorJsData(passedState.initialContentText));
                 noteTitle = ''; // Or a default title
                 noteTags = [];
                 navigate(location.pathname, { replace: true, state: null });
            }
        } else if (contextNote && contextNote.id === noteId) {
          noteToLoad = contextNote;
        } else {
          noteToLoad = await getNoteById(noteId);
        }

        if (noteToLoad) {
          setLocalNote(noteToLoad);
          setTitle(noteTitle || noteToLoad.title); // Use pre-filled title if available
          setTags(noteTags.length > 0 ? noteTags : noteToLoad.tags); // Use pre-filled tags if available

          if (!noteDataForEditorInitialization && (!editorInstanceRef.current || lastInitializedNoteIdOrNewFlagRef.current !== noteId)) {
            noteDataForEditorInitialization = sanitizeEditorOutputData(noteToLoad.content);
          }
          lastInitializedNoteIdOrNewFlagRef.current = noteId;
        } else if (!passedState?.initialContentText) { // Only navigate if not coming from a "create new with content" type action
          console.warn(`Note ${noteId} not found. Navigating to home.`);
          navigate('/');
          lastInitializedNoteIdOrNewFlagRef.current = null;
          setIsLoadingEditor(false);
          return;
        }
      } else { 
        if (lastInitializedNoteIdOrNewFlagRef.current !== 'empty' || !editorInstanceRef.current) {
          noteDataForEditorInitialization = createEmptyEditorData();
          lastInitializedNoteIdOrNewFlagRef.current = 'empty';
        }
        setLocalNote(null); setTitle(''); setTags([]);
      }

      if (noteDataForEditorInitialization) {
        setInitialDataForEditor(noteDataForEditorInitialization);
        setCurrentEditorContent(noteDataForEditorInitialization);
      }
      setIsLoadingEditor(false);
    };

    loadNote();
  }, [noteId, isNewNote, getNoteById, navigate, contextNote, selectNote, location.state]);


  useEffect(() => {
    if (isLoadingEditor || !editorHolderRef.current || !initialDataForEditor) {
      return;
    }
  
    if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
      try { editorInstanceRef.current.destroy(); } catch (e) { console.error("Error destroying previous Editor.js instance:", e); }
    }
    editorInstanceRef.current = null;
  
    const holder = editorHolderRef.current;
    while (holder.firstChild) holder.removeChild(holder.firstChild);
  
    const editorTimeout = setTimeout(() => {
      if (!editorHolderRef.current || !initialDataForEditor) {
        console.warn("Editor holder or initial data became null before deferred initialization. Aborting editor setup.");
        return; 
      }
      try {
        const editor = new EditorJS({
          holder: EDITOR_HOLDER_ID, data: initialDataForEditor,
          placeholder: editorPlaceholderText.current, defaultBlock: 'paragraph',
          tools: {
            paragraph: { class: ParagraphTool as unknown as BlockToolConstructable, inlineToolbar: true },
            header: HeaderTool as unknown as BlockToolConstructable, list: ListTool as unknown as BlockToolConstructable,
            quote: QuoteTool as unknown as BlockToolConstructable, code: CodeToolTool as unknown as BlockToolConstructable,
            delimiter: DelimiterTool as unknown as BlockToolConstructable,
            image: { class: ImageToolTool as unknown as BlockToolConstructable, config: { uploader: { uploadByFile: (file: File) => new Promise(r => { const reader = new FileReader(); reader.onload = e => r({success:1, file:{url: e.target?.result as string}}); reader.readAsDataURL(file);}), uploadByUrl: (url: string) => (url && (url.startsWith('http') || url.startsWith('data:'))) ? Promise.resolve({success:1, file:{url}}) : Promise.resolve({success:0, file:{url:'', message:'Invalid URL'}}) }}},
            warning: WarningTool as unknown as BlockToolConstructable, table: TableTool as unknown as BlockToolConstructable,
            checklist: ChecklistTool as unknown as BlockToolConstructable,
          },
          onChange: async (api: API, event: CustomEvent) => {
            if (api && typeof api.saver?.save === 'function') {
              const savedData = await api.saver.save();
              setCurrentEditorContent(savedData); 
            }
          },
          onReady: () => { /* console.log('Editor.js is ready.'); */ },
        });
        editorInstanceRef.current = editor;
      } catch (e) {
        console.error("Failed to initialize Editor.js:", e);
        displayApiMessage({type: 'error', text: 'Editor failed to load. Try refreshing.'});
      }
    }, 50); 
  
    return () => {
      clearTimeout(editorTimeout);
      if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
        try { editorInstanceRef.current.destroy(); } catch (e) { /* console.error("Error destroying Editor.js on cleanup:", e); */ }
      }
      editorInstanceRef.current = null;
    };
  }, [initialDataForEditor, isLoadingEditor, editorPlaceholderText.current]); 
  
  const isContentTrulyEmpty = (content: EditorJsOutputData | null): boolean => {
    if (!content || !Array.isArray(content.blocks)) return true;
    if (content.blocks.length === 0) return true;
    const sanitizedContent = sanitizeEditorOutputData(content); 
    if (sanitizedContent.blocks.length === 0) return true;
    if (sanitizedContent.blocks.length === 1 && sanitizedContent.blocks[0].type === 'paragraph') {
      const paragraphData = sanitizedContent.blocks[0].data;
      return !paragraphData || typeof paragraphData.text !== 'string' || paragraphData.text.trim() === '';
    }
    return false;
  };

  const handleManualSave = async () => {
    if (!localNote && !isNewNote) { // Should not happen if logic is correct
        displayApiMessage({ type: 'error', text: t('noteEditor.saveError') + ' (No local note context)' });
        return;
    }
    
    let contentFromEditor = currentEditorContent; 
    if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
        try { contentFromEditor = await editorInstanceRef.current.save(); } catch (e) {
            console.error("Error getting data from editor on manual save:", e);
            contentFromEditor = currentEditorContent; 
        }
    }

    const sanitizedContentForSave = sanitizeEditorOutputData(contentFromEditor);
    setCurrentEditorContent(sanitizedContentForSave); 
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
      } else if (localNote) { // Existing note
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
        if (localNote && contextNote && localNote.id === contextNote.id) selectNote(null);
        if (localNote && selectedNoteId === localNote.id) selectNote(null);
        navigate('/'); 
    }
  };

  const handleExport = (format: 'json' | 'md' | 'txt') => {
    let contentForExport = sanitizeEditorOutputData(currentEditorContent || localNote?.content);

    if (!localNote || localNote.id.startsWith('temp-')) { 
      if (title.trim() === '' && isContentTrulyEmpty(contentForExport)) {
        displayApiMessage({type: 'info', text: t('noteEditor.saveBeforeExport') + " (Note is empty)"});
        return;
      }
      // Note: If saving navigates, the context for export might be slightly off.
      // This path is for unsaved notes, so using current state is best.
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
      return; // No need to call manual save here for export of temp note.
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
  
  const getFullContentAsText = async (): Promise<string> => {
    let contentToProcess = currentEditorContent;
    if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
      try { contentToProcess = await editorInstanceRef.current.save(); } catch (e) {
        console.warn("Could not explicitly save editor for getFullContentAsText, using current state.", e);
      }
    }
    return editorDataToText(sanitizeEditorOutputData(contentToProcess)); 
  };

  const applyAiChangesToEditor = (newEditorData: EditorJsOutputData) => {
    const sanitizedNewData = sanitizeEditorOutputData(newEditorData); 
    if (editorInstanceRef.current && typeof editorInstanceRef.current.render === 'function') {
      editorInstanceRef.current.render(sanitizedNewData); 
      setCurrentEditorContent(sanitizedNewData); 
    } else {
        console.warn("Attempting to apply AI suggestion but editor instance is not fully available. Setting as initial data for next render.");
        setInitialDataForEditor(sanitizedNewData); 
        setCurrentEditorContent(sanitizedNewData);
    }
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

  const showAiFeatures = settings.openRouterApiKeyStatus === 'valid' && (localNote || isNewNote);

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
      
      {showAiFeatures && (
        <AiFeaturesPanel
          noteTitle={title} 
          getFullContentAsText={getFullContentAsText}
          onApplyChanges={applyAiChangesToEditor} 
          onTagsSuggested={(newTags) => setTags(prev => Array.from(new Set([...prev, ...newTags])))}
          setApiMessage={displayApiMessage}
          selectedAiModel={settings.aiModel}
        />
      )}
      
      <div className="flex-1 flex flex-col mt-1 min-h-[300px] sm:min-h-[400px] border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 overflow-y-auto">
        <div 
            id={EDITOR_HOLDER_ID} 
            ref={editorHolderRef} 
            className="p-2 prose dark:prose-invert max-w-none w-full h-full"
        >
        { (isLoadingEditor || (!initialDataForEditor && (noteId || isNewNote) && !editorHolderRef.current )) && <p className="text-center text-slate-400 p-4">{t('noteEditor.loading')}</p> }
        </div>
      </div>
    </div>
  );
};
