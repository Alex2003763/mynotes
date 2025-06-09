import React, { useState } from 'react';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { 
  summarizeText, 
  correctGrammarAndSpelling, 
  expandContent, 
  suggestTags as suggestTagsApi, 
  answerQuestionFromNote 
} from '../services/openRouterService';
import { SparklesIcon, DocumentTextIcon, CheckBadgeIcon, ChatBubbleLeftEllipsisIcon, TagIcon, LightBulbIcon, ChevronDownIcon } from './Icons';

interface AiFeaturesPanelProps {
  noteTitle: string; // Current note title for context
  getFullContentAsText: () => Promise<string>; // Function to get current editor content as plain text
  onSuggestionsApplied: (newText: string) => void; // Callback to apply AI text output to editor
  onTagsSuggested: (newTags: string[]) => void;
  setApiMessage: (message: ApiFeedback | null) => void;
  selectedAiModel: string; // Pass the selected AI model ID
}

type AiAction = 'summarize_short' | 'summarize_bullet' | 'correct_grammar' | 'expand' | 'suggest_tags' | 'qna';

export const AiFeaturesPanel: React.FC<AiFeaturesPanelProps> = ({ 
  noteTitle,
  getFullContentAsText, 
  onSuggestionsApplied, 
  onTagsSuggested,
  setApiMessage,
  selectedAiModel
}) => {
  const { t, language } = useI18n();
  const [isLoading, setIsLoading] = useState<AiAction | null>(null);
  const [qnaQuestion, setQnaQuestion] = useState('');
  const [qnaAnswer, setQnaAnswer] = useState('');
  const [expansionInstruction, setExpansionInstruction] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleAiAction = async (action: AiAction) => {
    setIsLoading(action);
    setApiMessage(null);
    setQnaAnswer(''); 

    const currentContentText = await getFullContentAsText();
    // For Editor.js, most AI actions will operate on the whole content.
    // "Selection" is not straightforward with block editors for this context.
    // We assume AI operations work on the whole text and the result replaces the whole content.

    try {
      let result: string | string[] | undefined;
      let successMessageKey: string | null = null;
      let successMessageParams: Record<string, string> | undefined = undefined;
      let infoMessageKey: string | null = null;

      if (!currentContentText && !['suggest_tags', 'qna'].includes(action) && !noteTitle) { // Allow tag suggestion/QnA if there's at least a title
        setApiMessage({ type: 'error', text: t('aiPanel.error.noContentToProcess') });
        setIsLoading(null);
        return;
      }
      
      const textToProcessForAI = currentContentText || noteTitle; // Use title as fallback for some actions

      switch (action) {
        case 'summarize_short':
          result = await summarizeText(textToProcessForAI, 'short', language, selectedAiModel);
          onSuggestionsApplied(result);
          successMessageKey = 'aiPanel.success.summaryApplied';
          break;
        case 'summarize_bullet':
          result = await summarizeText(textToProcessForAI, 'bullet', language, selectedAiModel);
          onSuggestionsApplied(result);
          successMessageKey = 'aiPanel.success.bulletSummaryApplied';
          break;
        case 'correct_grammar':
          result = await correctGrammarAndSpelling(textToProcessForAI, language, selectedAiModel);
          onSuggestionsApplied(result);
          successMessageKey = 'aiPanel.success.correctionApplied';
          break;
        case 'expand':
          if (!expansionInstruction) {
            setApiMessage({ type: 'error', text: t('aiPanel.error.noInstruction') });
            setIsLoading(null); return;
          }
          result = await expandContent(textToProcessForAI, expansionInstruction, language, selectedAiModel);
          onSuggestionsApplied(result);
          successMessageKey = 'aiPanel.success.expansionApplied';
          break;
        case 'suggest_tags':
          // Use title and content for better tag suggestions
          const contentForTags = `${noteTitle}\n${currentContentText}`.trim();
          result = await suggestTagsApi(contentForTags, language, selectedAiModel);
          if (Array.isArray(result) && result.length > 0) {
            onTagsSuggested(result);
            successMessageKey = 'aiPanel.success.tagsSuggested';
            successMessageParams = { tags: result.join(', ') };
          } else {
            infoMessageKey = 'aiPanel.info.noNewTags';
          }
          break;
        case 'qna':
          if (!qnaQuestion) {
            setApiMessage({ type: 'error', text: t('aiPanel.error.noQuestion') });
            setIsLoading(null); return;
          }
          result = await answerQuestionFromNote(qnaQuestion, textToProcessForAI, language, selectedAiModel);
          setQnaAnswer(result);
          // QnA answer is displayed, not directly applied to editor content typically
          successMessageKey = 'aiPanel.success.answerReceived';
          break;
      }
      if (successMessageKey) {
        setApiMessage({ type: 'success', text: t(successMessageKey, successMessageParams) });
      } else if (infoMessageKey) {
        setApiMessage({ type: 'info', text: t(infoMessageKey) });
      }

    } catch (error) {
      console.error(`AI Action (${action}) Error:`, error);
      setApiMessage({ type: 'error', text: t('aiPanel.error.actionFailed', {message: error instanceof Error ? error.message : t('aiPanel.error.unknownError')})});
    } finally {
      setIsLoading(null);
    }
  };

  const aiButtonClass = "flex items-center justify-center text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 focus:ring-primary-light";
  const enabledButtonClass = "bg-primary/10 hover:bg-primary/20 dark:bg-primary-dark/20 dark:hover:bg-primary-dark/30 border-primary/30 dark:border-primary-dark/40 text-primary dark:text-primary-light";
  const disabledButtonClass = "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed";
  
  const renderButton = (action: AiAction, labelKey: string, icon: React.ReactNode) => (
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
        aria-controls="ai-features-collapsible-panel"
      >
        <h3 className="text-md font-semibold text-primary dark:text-primary-light flex items-center">
          <LightBulbIcon className="w-5 h-5 mr-2" />
          {t('aiPanel.title')}
        </h3>
        <ChevronDownIcon className={`w-5 h-5 text-primary dark:text-primary-light transform transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isPanelOpen && (
        <div id="ai-features-collapsible-panel" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {renderButton('summarize_short', 'aiPanel.summarizeShort', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('summarize_bullet', 'aiPanel.summarizeBullet', <DocumentTextIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('correct_grammar', 'aiPanel.correctText', <CheckBadgeIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('suggest_tags', 'aiPanel.suggestTags', <TagIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
          </div>

          <div className="space-y-3 pt-2 border-t border-primary/10 dark:border-primary-dark/20">
            {/* Content Expansion */}
            <div>
              <label htmlFor="expansion-instruction" className="block text-xs font-medium text-primary dark:text-primary-light mb-1">{t('aiPanel.expandRewriteLabel')}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  id="expansion-instruction"
                  value={expansionInstruction}
                  onChange={(e) => setExpansionInstruction(e.target.value)}
                  placeholder={t('aiPanel.expandPlaceholder')}
                  className="flex-grow p-2 border border-primary/30 dark:border-primary-dark/40 rounded-md text-xs sm:text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-light dark:text-slate-100"
                  disabled={!!isLoading}
                  aria-label={t('aiPanel.expandPlaceholder')}
                />
                {renderButton('expand', 'aiPanel.expandButton', <SparklesIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
              </div>
            </div>

            {/* Q&A */}
            <div>
              <label htmlFor="qna-question" className="block text-xs font-medium text-primary dark:text-primary-light mb-1">{t('aiPanel.qnaLabel')}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  id="qna-question"
                  value={qnaQuestion}
                  onChange={(e) => setQnaQuestion(e.target.value)}
                  placeholder={t('aiPanel.qnaPlaceholder')}
                  className="flex-grow p-2 border border-primary/30 dark:border-primary-dark/40 rounded-md text-xs sm:text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-light dark:text-slate-100"
                  disabled={!!isLoading}
                  aria-label={t('aiPanel.qnaPlaceholder')}
                />
                 {renderButton('qna', 'aiPanel.qnaButton', <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
              </div>
              {qnaAnswer && (
                <div className="mt-2 p-2 text-xs sm:text-sm border border-primary/20 dark:border-primary-dark/30 rounded-md bg-white/50 dark:bg-slate-700/50 text-primary dark:text-primary-light">
                  <strong>{t('aiPanel.qnaAnswerPrefix')}</strong> {qnaAnswer}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};