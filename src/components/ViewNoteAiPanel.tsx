
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { 
  summarizeText, 
  answerQuestionFromNote 
} from '../services/openRouterService';
import { SparklesIcon, DocumentTextIcon, ChatBubbleLeftEllipsisIcon, LightBulbIcon, ChevronDownIcon, ClipboardDocumentIcon, PlusCircleIcon, PencilSquareIcon, XCircleIcon } from './Icons';

interface ViewNoteAiPanelProps {
  noteId: string;
  noteTitle: string;
  noteContent: string; 
  setApiMessage: (message: ApiFeedback | null) => void;
  selectedAiModel: string;
}

type AiViewAction = 'summarize_short' | 'summarize_bullet' | 'qna';

interface AiResultPreview {
  actionType: AiViewAction;
  originalTitle?: string; // To keep track of the original note title for "Edit Current Note"
  generatedContent: string;
}

export const ViewNoteAiPanel: React.FC<ViewNoteAiPanelProps> = ({ 
  noteId,
  noteTitle,
  noteContent,
  setApiMessage,
  selectedAiModel
}) => {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<AiViewAction | null>(null);
  const [qnaQuestion, setQnaQuestion] = useState('');
  const [aiResultPreview, setAiResultPreview] = useState<AiResultPreview | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleAiAction = async (action: AiViewAction) => {
    setIsLoading(action);
    setApiMessage(null);
    setAiResultPreview(null);

    try {
      let result: string | undefined;
      
      if (!noteContent && !noteTitle && action !== 'qna') { // QnA might still work if question is general
        setApiMessage({ type: 'error', text: t('aiPanel.error.noContentToProcess') });
        setIsLoading(null);
        return;
      }
      
      const textToProcessForAI = noteContent || noteTitle;

      switch (action) {
        case 'summarize_short':
          result = await summarizeText(textToProcessForAI, 'short', language, selectedAiModel);
          break;
        case 'summarize_bullet':
          result = await summarizeText(textToProcessForAI, 'bullet', language, selectedAiModel);
          break;
        case 'qna':
          if (!qnaQuestion) {
            setApiMessage({ type: 'error', text: t('aiPanel.error.noQuestion') });
            setIsLoading(null); return;
          }
          result = await answerQuestionFromNote(qnaQuestion, textToProcessForAI, language, selectedAiModel);
          break;
      }
      
      if (result !== undefined) {
        setAiResultPreview({ actionType: action, generatedContent: result, originalTitle: noteTitle });
        // Only show explicit success message for summary actions.
        // For QnA, the result appearing in the preview is the primary feedback.
        if (action === 'summarize_short' || action === 'summarize_bullet') {
             setApiMessage({ type: 'success', text: t('aiPanel.success.summaryGenerated') });
        }
        // If an explicit message for QnA success is desired, it could be added here:
        // else if (action === 'qna') {
        //   setApiMessage({ type: 'success', text: t('aiPanel.success.answerReceived') });
        // }
      } else {
        setApiMessage({ type: 'info', text: t('aiPanel.error.actionFailed', {message: t('aiPanel.error.unknownError')}) });
      }

    } catch (error) {
      console.error(`AI Action (${action}) Error:`, error);
      setApiMessage({ type: 'error', text: t('aiPanel.error.actionFailed', {message: error instanceof Error ? error.message : t('aiPanel.error.unknownError')})});
    } finally {
      setIsLoading(null);
    }
  };

  const handleCopyResult = () => {
    if (aiResultPreview) {
      navigator.clipboard.writeText(aiResultPreview.generatedContent)
        .then(() => setApiMessage({ type: 'success', text: t('aiPanel.preview.copied') }))
        .catch(err => setApiMessage({ type: 'error', text: t('aiPanel.preview.copyFailed') + ': ' + err}));
    }
  };

  const handleCreateNewWithResult = () => {
    if (aiResultPreview) {
      navigate('/new', { state: { initialContentText: aiResultPreview.generatedContent, initialTitle: t('aiPanel.preview.newNoteTitlePrefix') + (aiResultPreview.originalTitle || noteTitle) } });
    }
  };

  const handleEditCurrentWithResult = () => {
    if (aiResultPreview) {
      navigate(`/note/${noteId}`, { state: { initialContentText: aiResultPreview.generatedContent, replaceExistingContent: true } });
    }
  };
  
  const handleDiscardPreview = () => {
    setAiResultPreview(null);
    setApiMessage(null);
  };

  const aiButtonClass = "flex items-center justify-center text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 focus:ring-primary-light";
  const enabledButtonClass = "bg-primary/10 hover:bg-primary/20 dark:bg-primary-dark/20 dark:hover:bg-primary-dark/30 border-primary/30 dark:border-primary-dark/40 text-primary dark:text-primary-light";
  const disabledButtonClass = "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed";
  
  const renderButton = (action: AiViewAction, labelKey: string, icon: React.ReactNode) => (
    <button
      onClick={() => handleAiAction(action)}
      disabled={!!isLoading}
      className={`${aiButtonClass} ${isLoading ? disabledButtonClass : enabledButtonClass}`}
      title={isLoading ? t('aiPanel.processing', {label: t(labelKey)}) : t(labelKey)}
      aria-label={t(labelKey)}
    >
      {isLoading === action ? <SparklesIcon className="w-4 h-4 mr-0 sm:mr-1 animate-spin-slow" /> : icon}
      <span className="hidden sm:inline ml-1.5">{t(labelKey)}</span>
    </button>
  );

  return (
    <div className="p-3 my-4 border border-primary/20 dark:border-primary-dark/30 rounded-lg bg-primary/5 dark:bg-primary-dark/10">
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
        <div id="ai-view-features-collapsible-panel" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {renderButton('summarize_short', 'aiPanel.summarizeShort', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('summarize_bullet', 'aiPanel.summarizeBullet', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
          </div>
          
          {/* Q&A */}
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
                  disabled={!!isLoading}
                  aria-label={t('aiPanel.qnaPlaceholder')}
                />
                 {renderButton('qna', 'aiPanel.qnaButton', <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
              </div>
          </div>

          {aiResultPreview && (
            <div className="mt-4 p-3 border border-green-500/30 dark:border-green-400/30 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">{t('aiPanel.preview.title')}</h4>
              <textarea
                readOnly
                value={aiResultPreview.generatedContent}
                className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 resize-none"
                aria-label={t('aiPanel.preview.contentAreaLabel')}
              />
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <button onClick={handleCopyResult} className={`${aiButtonClass} bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200`}>
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.copy')}
                </button>
                <button onClick={handleCreateNewWithResult} className={`${aiButtonClass} ${enabledButtonClass}`}>
                    <PlusCircleIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.createNew')}
                </button>
                {aiResultPreview.actionType !== 'qna' && ( // "Edit Current" doesn't make sense for QnA
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
