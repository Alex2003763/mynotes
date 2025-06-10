import React, { useState, useEffect } from 'react';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { 
  correctGrammarAndSpelling, 
  expandContent, 
  suggestTags as suggestTagsApi
} from '../services/openRouterService';
import { SparklesIcon, CheckBadgeIcon, TagIcon, LightBulbIcon, ChevronDownIcon, ClipboardDocumentIcon, CheckCircleIcon, XCircleIcon } from './Icons';

interface AiFeaturesPanelProps {
  displayApiMessage: (message: ApiFeedback | null) => void;
  selectedAiModel: string;
}

type AiEditAction = 'correct_grammar' | 'expand' | 'suggest_tags';

interface AiEditResultPreview {
  actionType: AiEditAction;
  generatedContent: string; 
}

export const AiFeaturesPanel: React.FC<AiFeaturesPanelProps> = ({ 
  displayApiMessage,
  selectedAiModel
}) => {
  const { t, language } = useI18n();
  const editorInteraction = useEditorInteraction();

  const [isLoading, setIsLoading] = useState<AiEditAction | null>(null);
  const [expansionInstruction, setExpansionInstruction] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [aiResultPreview, setAiResultPreview] = useState<AiEditResultPreview | null>(null);

  const activeEditorId = editorInteraction?.activeEditor?.id;


  const handleAiAction = async (action: AiEditAction) => {
    if (!editorInteraction || !editorInteraction.activeEditor) {
      displayApiMessage({ type: 'error', text: "Editor not available for AI action." });
      return;
    }
    const { getFullContentAsText, applyAiChangesToEditor, setTagsFromAI, getTitle } = editorInteraction.activeEditor;
    const currentNoteTitle = getTitle();

    setIsLoading(action);
    displayApiMessage(null);
    setAiResultPreview(null);

    const currentContentText = await getFullContentAsText(); 

    try {
      let result: string | string[] | undefined; 
      let successMessageKey: string | null = null;
      let successMessageParams: Record<string, string> | undefined = undefined;
      let infoMessageKey: string | null = null;

      if (!currentContentText && action !== 'suggest_tags' && !currentNoteTitle) {
        displayApiMessage({ type: 'error', text: t('aiPanel.error.noContentToProcess') });
        setIsLoading(null);
        return;
      }
      
      const textToProcessForAI = currentContentText || currentNoteTitle; 

      switch (action) {
        case 'correct_grammar':
          result = await correctGrammarAndSpelling(textToProcessForAI, language, selectedAiModel);
          setAiResultPreview({actionType: action, generatedContent: result}); 
          successMessageKey = 'aiPanel.success.correctionGenerated';
          break;
        case 'expand':
          if (!expansionInstruction) {
            displayApiMessage({ type: 'error', text: t('aiPanel.error.noInstruction') });
            setIsLoading(null); return;
          }
          result = await expandContent(textToProcessForAI, expansionInstruction, language, selectedAiModel);
          setAiResultPreview({actionType: action, generatedContent: result}); 
          successMessageKey = 'aiPanel.success.expansionGenerated';
          break;
        case 'suggest_tags':
          const contentForTags = `${currentNoteTitle}\n${currentContentText}`.trim();
          result = await suggestTagsApi(contentForTags, language, selectedAiModel);
          if (Array.isArray(result) && result.length > 0) {
            setTagsFromAI(result); 
            successMessageKey = 'aiPanel.success.tagsSuggested';
            successMessageParams = { tags: result.join(', ') };
          } else {
            infoMessageKey = 'aiPanel.info.noNewTags';
          }
          break;
      }
      if (successMessageKey) {
        displayApiMessage({ type: 'success', text: t(successMessageKey, successMessageParams) });
      } else if (infoMessageKey) {
        displayApiMessage({ type: 'info', text: t(infoMessageKey) });
      }

    } catch (error) {
      console.error(`AI Action (${action}) Error:`, error);
      displayApiMessage({ type: 'error', text: t('aiPanel.error.actionFailed', {message: error instanceof Error ? error.message : t('aiPanel.error.unknownError')})});
    } finally {
      setIsLoading(null);
    }
  };
  
  const handleApplyPreview = () => {
    if (aiResultPreview && editorInteraction && editorInteraction.activeEditor) {
      editorInteraction.activeEditor.applyAiChangesToEditor(aiResultPreview.generatedContent);
      displayApiMessage({type: 'success', text: t('aiPanel.preview.applied')}); 
      setAiResultPreview(null);
    }
  };

  const handleCopyPreview = () => {
    if (aiResultPreview) {
      navigator.clipboard.writeText(aiResultPreview.generatedContent)
        .then(() => displayApiMessage({ type: 'success', text: t('aiPanel.preview.copied') }))
        .catch(err => displayApiMessage({ type: 'error', text: t('aiPanel.preview.copyFailed') + ': ' + err}));
    }
  };
  
  const handleDiscardPreview = () => {
    setAiResultPreview(null);
    displayApiMessage(null);
  };

  useEffect(() => {
    setExpansionInstruction('');
    setAiResultPreview(null);
  }, [activeEditorId]);


  const aiButtonClass = "flex items-center justify-center text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 focus:ring-primary-light";
  const enabledButtonClass = "bg-primary/10 hover:bg-primary/20 dark:bg-primary-dark/20 dark:hover:bg-primary-dark/30 border-primary/30 dark:border-primary-dark/40 text-primary dark:text-primary-light";
  const disabledButtonClass = "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed";
  
  const renderButton = (action: AiEditAction, labelKey: string, icon: React.ReactNode) => (
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
        aria-controls="ai-features-collapsible-panel"
      >
        <h3 className="text-md font-semibold text-primary dark:text-primary-light flex items-center">
          <LightBulbIcon className="w-5 h-5 mr-2" />
          {t('aiPanel.title')}
        </h3>
        <ChevronDownIcon className={`w-5 h-5 text-primary dark:text-primary-light transform transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isPanelOpen && (
        <div id="ai-features-collapsible-panel" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {renderButton('correct_grammar', 'aiPanel.correctText', <CheckBadgeIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
            {renderButton('suggest_tags', 'aiPanel.suggestTags', <TagIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
          </div>

          <div className="space-y-2 pt-2 border-t border-primary/10 dark:border-primary-dark/20">
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
                  disabled={!!isLoading || !editorInteraction?.activeEditor}
                  aria-label={t('aiPanel.expandPlaceholder')}
                />
                {renderButton('expand', 'aiPanel.expandButton', <SparklesIcon className="w-4 h-4 mr-0 sm:mr-1"/>)}
              </div>
            </div>
          </div>

          {aiResultPreview && (aiResultPreview.actionType === 'correct_grammar' || aiResultPreview.actionType === 'expand') && (
            <div className="mt-3 p-2 border border-green-500/30 dark:border-green-400/30 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">{t('aiPanel.preview.title')}</h4>
              <textarea
                readOnly
                value={aiResultPreview.generatedContent} 
                className="w-full h-48 p-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 resize-none"
                aria-label={t('aiPanel.preview.contentAreaLabel')}
              />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                 <button onClick={handleApplyPreview} className={`${aiButtonClass} ${enabledButtonClass}`}>
                    <CheckCircleIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.apply')}
                </button>
                <button onClick={handleCopyPreview} className={`${aiButtonClass} bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200`}>
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1"/>{t('aiPanel.preview.copy')}
                </button>
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