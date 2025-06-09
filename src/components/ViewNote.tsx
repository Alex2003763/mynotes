
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditorJS, { OutputData, BlockToolConstructable } from '@editorjs/editorjs';
// Import Editor.js tools, same as in NoteEditor
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
import { Note, EditorJsOutputData, ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { PencilSquareIcon, TagIcon, CalendarDaysIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from './Icons';
import { sanitizeEditorOutputData, createEmptyEditorData, textToEditorJsData } from './NoteEditor'; // Import helpers
import { ViewNoteAiPanel } from './ViewNoteAiPanel'; // Import the new AI panel
import { format } from 'date-fns';

const EDITOR_VIEW_HOLDER_ID = 'editorjs-view-container';

const editorDataToText = (data: EditorJsOutputData | undefined | null): string => {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks
    .map(block => {
      if (!block || typeof block.data !== 'object' || block.data === null) return '';
      switch (block.type) {
        case 'header': return block.data.text || '';
        case 'paragraph': return block.data.text || '';
        case 'list': return Array.isArray(block.data.items) ? block.data.items.join(' ') : '';
        case 'quote': return `${block.data.text || ''} ${block.data.caption || ''}`.trim();
        case 'code': return block.data.code || '';
        case 'checklist': return Array.isArray(block.data.items) ? block.data.items.map((item: any) => item.text || '').join(' ') : '';
        default: if (block.data && typeof (block.data as any).text === 'string') return (block.data as any).text; return '';
      }
    })
    .join('\n')
    .replace(/<[^>]+>/g, '');
};


export const ViewNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { getNoteById, loading: notesLoading, currentNote: contextNote } = useNotes();
  const { t, dateFnsLocale, language } = useI18n();
  const { settings } = useSettings();

  const [noteToView, setNoteToView] = useState<Note | null>(null);
  const editorInstanceRef = useRef<EditorJS | null>(null);
  const editorHolderRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<ApiFeedback | null>(null);
  const apiMessageTimeoutRef = useRef<number | null>(null);
  const [currentContentAsText, setCurrentContentAsText] = useState<string>('');


  const displayApiMessage = useCallback((message: ApiFeedback | null) => {
    if (apiMessageTimeoutRef.current) clearTimeout(apiMessageTimeoutRef.current);
    setApiMessage(message);
    if (message) {
      apiMessageTimeoutRef.current = window.setTimeout(() => setApiMessage(null), 5000);
    }
  }, []);

  const getNoteContentAsText = useCallback(async (): Promise<string> => {
    if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
      try {
        const editorData = await editorInstanceRef.current.save();
        return editorDataToText(sanitizeEditorOutputData(editorData));
      } catch (e) {
        console.warn("Could not save editor for text extraction, using noteToView.content", e);
      }
    }
    return editorDataToText(sanitizeEditorOutputData(noteToView?.content));
  }, [noteToView]);


  useEffect(() => {
    const loadNote = async () => {
      setIsLoading(true);
      if (!noteId) {
        navigate('/');
        return;
      }

      let noteData: Note | null | undefined = null;
      if (contextNote && contextNote.id === noteId) {
        noteData = contextNote;
      } else {
        noteData = await getNoteById(noteId);
      }
      
      if (noteData) {
        setNoteToView(noteData);
        setCurrentContentAsText(editorDataToText(sanitizeEditorOutputData(noteData.content)));
      } else {
        console.warn(`Note ${noteId} not found for viewing. Navigating to home.`);
        navigate('/'); 
      }
      setIsLoading(false);
    };

    loadNote();
  }, [noteId, getNoteById, navigate, contextNote]);

  useEffect(() => {
    if (noteToView && editorHolderRef.current) {
      if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
        try { editorInstanceRef.current.destroy(); } catch (e) { console.error("Error destroying previous view Editor.js instance:", e); }
        editorInstanceRef.current = null;
      }

      const holder = editorHolderRef.current;
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      
      const sanitizedContent = sanitizeEditorOutputData(noteToView.content || createEmptyEditorData());
      
      const editorTimeout = setTimeout(() => {
        if (!editorHolderRef.current) return; 
        try {
            const editor = new EditorJS({
                holder: EDITOR_VIEW_HOLDER_ID, data: sanitizedContent, readOnly: true,
                tools: { 
                    paragraph: { class: ParagraphTool as unknown as BlockToolConstructable, inlineToolbar: true },
                    header: HeaderTool as unknown as BlockToolConstructable, list: ListTool as unknown as BlockToolConstructable,
                    quote: QuoteTool as unknown as BlockToolConstructable, code: CodeToolTool as unknown as BlockToolConstructable,
                    delimiter: DelimiterTool as unknown as BlockToolConstructable,
                    image: { class: ImageToolTool as unknown as BlockToolConstructable, config: { uploader: { uploadByFile: () => Promise.resolve({success:0, file:{url:''}}), uploadByUrl: () => Promise.resolve({success:0, file:{url:''}})}}},
                    warning: WarningTool as unknown as BlockToolConstructable, table: TableTool as unknown as BlockToolConstructable,
                    checklist: ChecklistTool as unknown as BlockToolConstructable,
                },
                onReady: async () => {
                   const textContent = await getNoteContentAsText(); // update text on ready
                   setCurrentContentAsText(textContent);
                },
            });
            editorInstanceRef.current = editor;
        } catch (e) { console.error("Failed to initialize read-only Editor.js:", e); }
      }, 50);

      return () => { 
        clearTimeout(editorTimeout);
        if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
          try { editorInstanceRef.current.destroy(); } catch (e) { /* console.error("Error destroying view Editor.js on cleanup:", e); */ }
        }
        editorInstanceRef.current = null;
      };
    } else if (!noteToView && editorInstanceRef.current) {
      if (typeof editorInstanceRef.current.destroy === 'function') {
        try { editorInstanceRef.current.destroy(); } catch (e) { console.error("Error destroying view Editor.js when noteToView is null:", e); }
      }
      editorInstanceRef.current = null;
    }
  }, [noteToView, getNoteContentAsText]);

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

  if (isLoading || notesLoading) {
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">{t('noteEditor.loading')}</div>;
  }

  if (!noteToView) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">{t('noteEditor.notFound.title')}</h2>
        <p>{t('noteEditor.notFound.message')}</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-light transition-colors">
          {t('noteEditor.notFound.goToList')}
        </button>
      </div>
    );
  }
  
  const fontSizeClass = settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base';
  const dateFormat = language === 'zh' ? 'yyyy年M月d日 HH:mm' : 'MMMM d, yyyy HH:mm';
  const showAiFeatures = settings.openRouterApiKeyStatus === 'valid' && noteToView;

  return (
    <div className={`p-0 md:px-2 h-full flex flex-col ${fontSizeClass} relative`}>
      {renderApiMessage()}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 break-words">
          {noteToView.title || t('noteItem.untitled')}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center">
            <CalendarDaysIcon className="w-4 h-4 mr-1.5" />
            {t('viewNote.createdAt')}: {format(new Date(noteToView.createdAt), dateFormat, { locale: dateFnsLocale })}
          </span>
          <span className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1.5" />
            {t('viewNote.updatedAt')}: {format(new Date(noteToView.updatedAt), dateFormat, { locale: dateFnsLocale })}
          </span>
        </div>
        {noteToView.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TagIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            {noteToView.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {showAiFeatures && noteToView && (
        <ViewNoteAiPanel
          noteId={noteToView.id}
          noteTitle={noteToView.title}
          noteContent={currentContentAsText} // Pass current text content
          setApiMessage={displayApiMessage}
          selectedAiModel={settings.aiModel}
        />
      )}

      <div 
        id={EDITOR_VIEW_HOLDER_ID}
        ref={editorHolderRef}
        className="prose dark:prose-invert max-w-none w-full flex-grow view-note-content p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 overflow-y-auto"
      >
        {/* Editor.js will render content here */}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
        <button
          onClick={() => navigate(`/note/${noteToView.id}`)}
          className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-primary-dark transition-colors flex items-center text-sm font-medium"
        >
          <PencilSquareIcon className="w-5 h-5 mr-2" />
          {t('viewNote.editButton')}
        </button>
      </div>
    </div>
  );
};
