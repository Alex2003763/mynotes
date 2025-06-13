
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cherry from 'cherry-markdown';

import { useNotes } from '../contexts/NoteContext';
import { Note, ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { PencilSquareIcon, TagIcon, CalendarDaysIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ArrowLeftIcon } from './Icons';
import { sanitizeMarkdownString, createEmptyMarkdown } from './NoteEditor'; 
import { format } from 'date-fns';

const EDITOR_VIEW_HOLDER_ID = 'editorjs-view-container';

export const ViewNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { getNoteById, loading: notesLoading, currentNote: contextNote } = useNotes();
  const { t, dateFnsLocale, language } = useI18n();
  const { settings } = useSettings();
  const { setActiveEditorInteraction, activeEditor } = useEditorInteraction();

  const [noteToView, setNoteToView] = useState<Note | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const editorInstanceRef = useRef<Cherry | null>(null);
  const editorHolderRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<ApiFeedback | null>(null);
  const apiMessageTimeoutRef = useRef<number | null>(null);

  const displayApiMessage = useCallback((message: ApiFeedback | null) => {
    if (apiMessageTimeoutRef.current) clearTimeout(apiMessageTimeoutRef.current);
    setApiMessage(message);
    if (message) {
      apiMessageTimeoutRef.current = window.setTimeout(() => setApiMessage(null), 5000);
    }
  }, []);

  const getNoteContentAsTextForAI = useCallback(async (): Promise<string> => {
    if (!noteToView || !activePageId) return '';
    const activePage = noteToView.pages.find(p => p.id === activePageId);
    return activePage?.content || '';
  }, [noteToView, activePageId]);

  const applyAiChangesFromView = useCallback((newMarkdown: string) => {
    if (noteToView) {
      console.warn("Apply changes requested from ViewNote AI Panel. Navigating to editor.");
      navigate(`/note/${noteToView.id}`, { state: { initialContentText: newMarkdown, replaceExistingContent: true } });
    }
  }, [navigate, noteToView]);

  const getTitleForView = useCallback(() => noteToView?.title || '', [noteToView]);
  
  const setTagsFromAIForView = useCallback((newTags: string[]) => {
      console.warn("Set tags from AI called in ViewNote context, not implemented directly. Consider navigating to edit mode or handling differently.");
      if (noteToView) {
          displayApiMessage({type: 'info', text: t('aiPanel.info.tagsCannotBeAppliedInViewMode') || `Tags suggested: ${newTags.join(', ')}. Edit the note to apply.`});
      }
  }, [noteToView, displayApiMessage, t]);


  useEffect(() => {
    if (noteToView) {
        const editorId = noteToView.id;
        setActiveEditorInteraction({
            id: editorId,
            getTitle: getTitleForView,
            getFullContentAsText: getNoteContentAsTextForAI,
            applyAiChangesToEditor: applyAiChangesFromView,
            setTagsFromAI: setTagsFromAIForView,
        });

        return () => {
            if (activeEditor && activeEditor.id === editorId) {
                setActiveEditorInteraction(null);
            }
        };
    } else if (!noteToView && activeEditor && noteId && activeEditor.id === noteId) {
        setActiveEditorInteraction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteToView, setActiveEditorInteraction, getTitleForView, getNoteContentAsTextForAI, applyAiChangesFromView, setTagsFromAIForView]);

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
        if (noteData && noteData.pages.length > 0) {
          setActivePageId(noteData.pages[0].id);
        }
      } else {
        console.warn(`Note ${noteId} not found for viewing. Navigating to home.`);
        setNoteToView(null); 
        navigate('/'); 
      }
      setIsLoading(false);
    };

    loadNote();
  }, [noteId, getNoteById, navigate, contextNote]);

  useEffect(() => {
    if (isLoading || !noteToView || !editorHolderRef.current || !activePageId) {
      // If still loading, note not available, or ref not set, do nothing or cleanup
      if (!noteToView && editorInstanceRef.current) {
        try { editorInstanceRef.current.destroy(); } catch (e) { /* console.error("Error destroying view Cherry when note is null", e); */ }
        editorInstanceRef.current = null;
      }
      return;
    }

    const activePage = noteToView.pages.find(p => p.id === activePageId);
    const contentToRender = sanitizeMarkdownString(activePage?.content || createEmptyMarkdown());

    // If editor exists, just update content instead of recreating
    if (editorInstanceRef.current) {
      try {
        // @ts-ignore
        if (editorInstanceRef.current.getMarkdown() !== contentToRender) {
          // @ts-ignore
          editorInstanceRef.current.setMarkdown(contentToRender);
        }
        return;
      } catch (e) {
        console.warn("Error updating Cherry content, will recreate:", e);
        try {
          editorInstanceRef.current.destroy();
        } catch (destroyError) {
          console.warn("Error destroying Cherry during update:", destroyError);
        }
        editorInstanceRef.current = null;
      }
    }

    const holder = editorHolderRef.current;
    try {
        const cherryConfig = {
            el: holder,
            value: contentToRender,
            toolbars: {
                theme: settings.theme,
                showToolbar: false
            },
            editor: {
              defaultModel: 'previewOnly' as const,
              height: '100%',
            },
        };
        const cherryInstance = new Cherry(cherryConfig);
        editorInstanceRef.current = cherryInstance;
    } catch (e) {
        console.error("Failed to initialize read-only Cherry Markdown:", e);
        displayApiMessage({type: 'error', text: 'Failed to display note content.'});
    }

    return () => {
      if (editorInstanceRef.current) {
        try { editorInstanceRef.current.destroy(); } catch (e) { /* console.error("Error destroying view Cherry on cleanup:", e); */ }
      }
      editorInstanceRef.current = null;
    };
  }, [noteToView, isLoading, displayApiMessage, activePageId, settings.theme]);

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

  if (isLoading || (notesLoading && !noteToView) ) { 
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
  
  const dateFormat = language === 'zh' ? 'yyyy年M月d日 HH:mm' : 'MMMM d, yyyy HH:mm';
  const editorKey = `${noteToView.id}-${activePageId}` || 'view-note-fallback';
  
  return (
    <div className="flex flex-col h-full">
      {renderApiMessage()}
      <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-grow">
              <button
                onClick={() => navigate('/')}
                className="mt-1 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors flex-shrink-0"
                title={t('noteEditor.backButton')}
                aria-label={t('noteEditor.backButton')}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 break-words flex-grow">
                {noteToView.title || t('noteItem.untitled')}
              </h1>
            </div>
            <button
              onClick={() => navigate(`/note/${noteToView.id}`)}
              className="mt-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-primary-dark transition-colors flex items-center text-sm font-medium flex-shrink-0"
              title={t('viewNote.editButton')}
            >
              <PencilSquareIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('viewNote.editButton')}</span>
            </button>
        </div>

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

      {/* Pages Tab UI */}
      {noteToView.pages.length > 1 && (
        <div className="mb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            {noteToView.pages.map(page => (
              <button
                key={page.id}
                onClick={() => setActivePageId(page.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activePageId === page.id
                    ? 'border-primary text-primary dark:text-primary-light'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {page.title}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div
        id={EDITOR_VIEW_HOLDER_ID}
        key={editorKey}
        ref={editorHolderRef}
        contentEditable={false} // Reinforce non-editable nature
        className="flex-1 overflow-hidden max-w-none w-full" // Removed prose classes
      >
         {(isLoading || !noteToView) && 
            <div className="w-full h-full flex items-center justify-center text-slate-400 p-4 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600">
                {t('noteEditor.loading')}
            </div>
         }
      </div>
    </div>
  );
};
