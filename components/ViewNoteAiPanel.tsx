import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { 
  summarizeText, 
  answerQuestionFromNote 
} from '../services/openRouterService';
import { SparklesIcon, DocumentTextIcon, ChatBubbleLeftEllipsisIcon, LightBulbIcon, ChevronDownIcon, ClipboardDocumentIcon, PlusCircleIcon, PencilSquareIcon, XCircleIcon } from './Icons';

interface ViewNoteAiPanelProps {
  displayApiMessage: (message: ApiFeedback | null) => void;
  selectedAiModel: string;
}

type AiViewAction = 'summarize_short' | 'summarize_bullet' | 'qna';

interface AiResultPreview {
  actionType: AiViewAction;
  originalTitle?: string;
  generatedContent: string; 
}

export const ViewNoteAiPanel: React.FC<ViewNoteAiPanelProps> = ({ 
  displayApiMessage,
  selectedAiModel
}) => {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const editorInteraction = useEditorInteraction();
  
  const [isLoading, setIsLoading] = useState<AiViewAction | null>(null);
  const [qnaQuestion, setQnaQuestion] = useState('');
  const [aiResultPreview, setAiResultPreview] = useState<AiResultPreview | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const activeEditorId = editorInteraction?.activeEditor?.id;

  const handleAiAction = async (action: AiViewAction) => {
    if (!editorInteraction || !editorInteraction.activeEditor) {
      displayApiMessage({ type: 'error', text: "Note data not available for AI action." });
      return;
    }
    const { getFullContentAsText, getTitle } = editorInteraction.activeEditor;
    const currentNoteTitle = getTitle();

    setIsLoading(action);
    displayApiMessage(null);
    setAiResultPreview(null);
    
    const noteContentForAI = await getFullContentAsText(); 

    try {
      let result: string | undefined; 
      
      if (!noteContentForAI && !currentNoteTitle && action !== 'qna') {
        displayApiMessage({ type: 'error', text: t('aiPanel.error.noContentToProcess') });
        setIsLoading(null);
        return;
      }
      
      const textToProcessForAI = noteContentForAI || currentNoteTitle; 

      switch (action) {
        case 'summarize_short':
          result = await summarizeText(textToProcessForAI, 'short', language, selectedAiModel);
          break;
        case 'summarize_bullet':
          result = await summarizeText(textToProcessForAI, 'bullet', language, selectedAiModel);
          break;
        case 'qna':
          if (!qnaQuestion) {
            displayApiMessage({ type: 'error', text: t('aiPanel.error.noQuestion') });
            setIsLoading(null); return;
          }
          result = await answerQuestionFromNote(qnaQuestion, textToProcessForAI, language, selectedAiModel);
          break;
      }
      
      if (result !== undefined) {
        setAiResultPreview({ actionType: action, generatedContent: result, originalTitle: currentNoteTitle });
        if (action === 'summarize_short' || action === 'summarize_bullet') {
             displayApiMessage({ type: 'success', text: t('aiPanel.success.summaryGenerated') });
        } else if (action === 'qna') {
            displayApiMessage({ type: 'success', text: t('aiPanel.success.answerReceived') });
        }
      } else {
        displayApiMessage({ type: 'info', text: t('aiPanel.error.actionFailed', {message: t('aiPanel.error.unknownError')}) });
      }

    } catch (error) {
      console.error(`AI Action (${action}) Error:`, error);
      displayApiMessage({ type: 'error', text: t('aiPanel.error.actionFailed', {message: error instanceof Error ? error.message : t('aiPanel.error.unknownError')})});
    } finally {
      setIsLoading(null);
    }
  };

  const handleCopyResult = () => {
    if (aiResultPreview) {
      navigator.clipboard.writeText(aiResultPreview.generatedContent)
        .then(() => displayApiMessage({ type: 'success', text: t('aiPanel.preview.copied') }))
        .catch(err => displayApiMessage({ type: 'error', text: t('aiPanel.preview.copyFailed') + ': ' + err}));
    }
  };

  const handleCreateNewWithResult = () => {
    if (aiResultPreview && editorInteraction?.activeEditor) {
      const originalTitle = aiResultPreview.originalTitle || editorInteraction.activeEditor.getTitle() || 'Note';
      navigate('/new', { state: { initialContentText: aiResultPreview.generatedContent, initialTitle: t('aiPanel.preview.newNoteTitlePrefix') + originalTitle } });
    }
  };

  const handleEditCurrentWithResult = () => {
    if (aiResultPreview && editorInteraction?.activeEditor) {
      navigate(`/note/${editorInteraction.activeEditor.id}`, { state: { initialContentText: aiResultPreview.generatedContent, replaceExistingContent: true } });
    }
  };
  
  const handleDiscardPreview = () => {
    setAiResultPreview(null);
    displayApiMessage(null);
  };

  useEffect(() => {
    setQnaQuestion('');
    setAiResultPreview(null);
  }, [activeEditorId]);


  const aiButtonClass = "flex items-center justify-center text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 focus:ring-primary-light";
  const enabledButtonClass = "bg-primary/10 hover:bg-primary/20 dark:bg-primary-dark/20 dark:hover:bg-primary-dark/30 border-primary/30 dark:border-primary-dark/40 text-primary dark:text-primary-light";
  const disabledButtonClass = "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed";
  
  const renderButton = (action: AiViewAction, labelKey: string, icon: React.ReactNode) => (
    <button
      onClick={() => handleAiAction(action)}
      disabled={!!isLoading || !editorInteraction?.activeEditor}
      className={`${aiButtonClass} ${isLoading || !editorInteraction?.activeEditor ? disabledButtonClass : enabledButtonClass}`}
      title={isLoading ? t('aiPanel.processing', {label: t(labelKey)}) : t(labelKey)}
      aria-label={t(labelKey)}
    >
      {isLoading === action ? <SparklesIcon className="w-4 h-4 mr-0 sm:mr-1 animate-spin-slow" /> : icon}
      <span className="hidden sm:inline ml-1.5">{t(labelKey)}</span>
    </button>
  );

  if (!editorInteraction?.activeEditor) {
    return (
        <div className="p-3 my-1">
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">{t('noteEditor.aiFeatures.keyNotSet')}</p>
        </div>
    );
  }

  return (
    <div className="p-3 my-1">
      <button 
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="w-full flex items-center justify-between text-left mb-3 p-1 hover:bg-primary/10 dark:hover:bg-primary-dark/20 rounded-md"
        aria-expanded={isPanelOpen}
        aria-controls="ai-view-features-collapsible-panel"
      >
        <h3 className="text-md font-semibold text-primary dark:text-primary-light flex items-center">
          <LightBulbIcon className="w-5 h-5 mr-2" />
          {t('aiPanel.title')}
        </h3>
        <ChevronDownIcon className={`w-5 h-5 text-primary dark:text-primary-light transform transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isPanelOpen && (
        <div id="ai-view-features-collapsible-panel" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {renderButton('summarize_short', 'aiPanel.summarizeShort', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('summarize_bullet', 'aiPanel.summarizeBullet', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
          </div>
          
          <div className="pt-2 border-t border-primary/10 dark:border-primary-dark/20">
              <label htmlFor="view-qna-question" className="block text-xs font-medium text-primary dark:text-primary-light mb-1">{t('aiPanel.qnaLabel')}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  id="view-qna-question"
                  value={qnaQuestion}
                  onChange={(e) => setQnaQuestion(e.target.value)}
                  placeholder={t('aiPanel.qnaPlaceholder')}
                  className="flex-grow p-2 border border-primary/30 dark:border-primary-dark/40 rounded-md text-xs sm:text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-light dark:text-slate-100"
                  disabled={!!isLoading || !editorInteraction?.activeEditor}
                  aria-label={t('aiPanel.qnaPlaceholder')}
                />
                 {renderButton('qna', 'aiPanel.qnaButton', <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
              </div>
          </div>

          {aiResultPreview && (
            <div className="mt-3 p-2 border border-green-500/30 dark:border-green-400/30 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">{t('aiPanel.preview.title')}</h4>
              <textarea
                readOnly
                value={aiResultPreview.generatedContent} 
                className="w-full h-48 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 resize-none"
                aria-label={t('aiPanel.preview.contentAreaLabel')}
              />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                <button onClick={handleCopyResult} className={`${aiButtonClass} bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200`}>
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.copy')}
                </button>
                <button onClick={handleCreateNewWithResult} className={`${aiButtonClass} ${enabledButtonClass}`}>
                    <PlusCircleIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.createNew')}
                </button>
                {aiResultPreview.actionType !== 'qna' && editorInteraction?.activeEditor?.applyAiChangesToEditor && ( 
                    <button onClick={handleEditCurrentWithResult} className={`${aiButtonClass} ${enabledButtonClass}`}>
                       <PencilSquareIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.editCurrent')}
                    </button>
                )}
                <button onClick={handleDiscardPreview} className={`${aiButtonClass} bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400`}>
                    <XCircleIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.discard')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};