import React, { useState, useEffect, useCallback } from 'react';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import {
  correctGrammarAndSpelling,
  expandContent,
  suggestTags as suggestTagsApi,
  summarizeText,
  correctGrammarAndSpellingStreaming,
  expandContentStreaming,
  summarizeTextStreaming
} from '../services/openRouterService';
import { SparklesIcon, CheckBadgeIcon, TagIcon, LightBulbIcon, ChevronDownIcon, ClipboardDocumentIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, BoltIcon, AdjustmentsHorizontalIcon } from './Icons';

interface AiFeaturesPanelProps {
  displayApiMessage: (message: ApiFeedback | null) => void;
  selectedAiModel: string;
}

type AiEditAction = 'correct_grammar' | 'expand' | 'suggest_tags' | 'quick_improve' | 'make_formal' | 'make_casual' | 'summarize_inline';

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
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const [aiResultPreview, setAiResultPreview] = useState<AiEditResultPreview | null>(null);
  const [favoriteTools, setFavoriteTools] = useState<AiEditAction[]>(['correct_grammar', 'suggest_tags', 'quick_improve', 'summarize_inline']);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const activeEditorId = editorInteraction?.activeEditor?.id;

  // 快捷鍵支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorInteraction?.activeEditor || isLoading) return;
      
      // Ctrl/Cmd + Shift + 組合鍵
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key) {
          case 'G':
            e.preventDefault();
            handleAiAction('correct_grammar');
            break;
          case 'T':
            e.preventDefault();
            handleAiAction('suggest_tags');
            break;
          case 'Q':
            e.preventDefault();
            handleAiAction('quick_improve');
            break;
          case 'S':
            e.preventDefault();
            handleAiAction('summarize_inline');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorInteraction?.activeEditor, isLoading]);


  const handleStreamingChunk = useCallback((chunk: string) => {
    setStreamingContent(prev => {
      const newContent = prev + chunk;
      // 同時更新預覽內容以確保實時顯示
      setAiResultPreview(currentPreview =>
        currentPreview ? {...currentPreview, generatedContent: newContent} : null
      );
      return newContent;
    });
  }, []);

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
    setStreamingContent('');
    setIsStreaming(false);

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

      // 使用流式輸出的操作
      const streamingActions: AiEditAction[] = ['correct_grammar', 'expand', 'quick_improve', 'make_formal', 'make_casual', 'summarize_inline'];
      
      if (streamingActions.includes(action)) {
        setIsStreaming(true);
        // 初始化預覽
        const initialPreview = {actionType: action, generatedContent: ''};
        setAiResultPreview(initialPreview);
        
        switch (action) {
          case 'correct_grammar':
            await correctGrammarAndSpellingStreaming(textToProcessForAI, language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.correctionGenerated';
            break;
          case 'expand':
            if (!expansionInstruction) {
              displayApiMessage({ type: 'error', text: t('aiPanel.error.noInstruction') });
              setIsLoading(null);
              setIsStreaming(false);
              return;
            }
            await expandContentStreaming(textToProcessForAI, expansionInstruction, language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.expansionGenerated';
            break;
          case 'quick_improve':
            await expandContentStreaming(textToProcessForAI, t('aiPanel.quickImprove.instruction'), language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.quickImproveGenerated';
            break;
          case 'make_formal':
            await expandContentStreaming(textToProcessForAI, t('aiPanel.makeFormal.instruction'), language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.formalGenerated';
            break;
          case 'make_casual':
            await expandContentStreaming(textToProcessForAI, t('aiPanel.makeCasual.instruction'), language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.casualGenerated';
            break;
          case 'summarize_inline':
            await summarizeTextStreaming(textToProcessForAI, 'short', language, selectedAiModel, handleStreamingChunk);
            successMessageKey = 'aiPanel.success.summaryGenerated';
            break;
        }
        
        // 流式完成，保持當前內容不變
        setIsStreaming(false);
        // 預覽內容已經通過 handleStreamingChunk 實時更新，無需再次設置
      } else {
        // 非流式操作保持原樣
        switch (action) {
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
      setIsStreaming(false);
    }
  };
  
  const handleApplyPreview = () => {
    const contentToApply = aiResultPreview?.generatedContent || streamingContent;
    if (contentToApply && editorInteraction && editorInteraction.activeEditor) {
      editorInteraction.activeEditor.applyAiChangesToEditor(contentToApply);
      displayApiMessage({type: 'success', text: t('aiPanel.preview.applied')});
      setAiResultPreview(null);
      setStreamingContent('');
    }
  };

  const handleCopyPreview = () => {
    const contentToCopy = aiResultPreview?.generatedContent || streamingContent;
    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy)
        .then(() => displayApiMessage({ type: 'success', text: t('aiPanel.preview.copied') }))
        .catch(err => displayApiMessage({ type: 'error', text: t('aiPanel.preview.copyFailed') + ': ' + err}));
    }
  };
  
  const handleDiscardPreview = () => {
    setAiResultPreview(null);
    setStreamingContent('');
    setIsStreaming(false);
    displayApiMessage(null);
  };

  useEffect(() => {
    setExpansionInstruction('');
    setAiResultPreview(null);
    setStreamingContent('');
    setIsStreaming(false);
  }, [activeEditorId]);


  // 動態計算按鈕類別，根據 sidebar 寬度調整
  const getResponsiveButtonClass = (isCompact = false) => {
    const baseClass = "flex items-center justify-center border rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 focus:ring-primary-light";
    
    if (isCompact) {
      // 極小寬度：只顯示圖標，更小的 padding
      return `${baseClass} text-xs px-1.5 py-1.5 min-w-[2rem] aspect-square`;
    } else {
      // 正常寬度
      return `${baseClass} text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 min-h-[2.5rem]`;
    }
  };

  const enabledButtonClass = "bg-primary/10 hover:bg-primary/20 dark:bg-primary-dark/20 dark:hover:bg-primary-dark/30 border-primary/30 dark:border-primary-dark/40 text-primary dark:text-primary-light";
  const disabledButtonClass = "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed";
  
  const renderButton = (action: AiEditAction, labelKey: string, icon: React.ReactNode, isCompact = false) => {
    const buttonClass = getResponsiveButtonClass(isCompact);
    
    return (
      <button
        onClick={() => handleAiAction(action)}
        disabled={!!isLoading || !editorInteraction?.activeEditor}
        className={`${buttonClass} ${isLoading || !editorInteraction?.activeEditor ? disabledButtonClass : enabledButtonClass}`}
        title={isLoading ? t('aiPanel.processing', {label: t(labelKey)}) : t(labelKey)}
        aria-label={t(labelKey)}
      >
        {isLoading === action ? <SparklesIcon className="w-4 h-4 animate-spin-slow" /> : icon}
        {!isCompact && <span className="hidden sm:inline ml-1.5 truncate max-w-[8rem]">{t(labelKey)}</span>}
      </button>
    );
  };

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
        <div id="ai-features-collapsible-panel" className="space-y-4">
          {/* 常用工具區域 - 響應式布局 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between ai-panel-header">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{t('aiPanel.frequentTools')}</h4>
              <div className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block ai-panel-shortcuts">
                Ctrl+Shift+G/T/Q/S
              </div>
            </div>
            
            {/* 響應式按鈕網格 */}
            <div className="ai-button-grid">
              {favoriteTools.slice(0, 4).map((tool, index) => {
                const toolConfig: { [key in AiEditAction]?: { labelKey: string; icon: React.ReactNode; shortcut: string } } = {
                  correct_grammar: { labelKey: 'aiPanel.correctText', icon: <CheckBadgeIcon className="w-4 h-4"/>, shortcut: 'G' },
                  suggest_tags: { labelKey: 'aiPanel.suggestTags', icon: <TagIcon className="w-4 h-4"/>, shortcut: 'T' },
                  quick_improve: { labelKey: 'aiPanel.quickImprove', icon: <BoltIcon className="w-4 h-4"/>, shortcut: 'Q' },
                  summarize_inline: { labelKey: 'aiPanel.summarizeInline', icon: <DocumentTextIcon className="w-4 h-4"/>, shortcut: 'S' },
                  expand: { labelKey: 'aiPanel.expandButton', icon: <SparklesIcon className="w-4 h-4"/>, shortcut: 'E' },
                  make_formal: { labelKey: 'aiPanel.makeFormal', icon: <CheckBadgeIcon className="w-4 h-4"/>, shortcut: 'F' },
                  make_casual: { labelKey: 'aiPanel.makeCasual', icon: <CheckBadgeIcon className="w-4 h-4"/>, shortcut: 'C' }
                };
                
                const config = toolConfig[tool];
                return config ? (
                  <div key={`${tool}-${index}`} className="ai-button-item">
                    {renderButton(tool, config.labelKey, config.icon)}
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* 快速工具切換 */}
          <div className="pt-3 border-t border-primary/10 dark:border-primary-dark/20">
            <button
              onClick={() => setIsQuickToolsOpen(!isQuickToolsOpen)}
              className="w-full flex items-center justify-between text-left p-2 hover:bg-primary/5 dark:hover:bg-primary-dark/10 rounded-md"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                {t('aiPanel.quickTools')}
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-slate-500 transform transition-transform ${isQuickToolsOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isQuickToolsOpen && (
              <div className="mt-2 ai-button-grid">
                <div className="ai-button-item">
                  {renderButton('make_formal', 'aiPanel.makeFormal', <CheckBadgeIcon className="w-4 h-4"/>)}
                </div>
                <div className="ai-button-item">
                  {renderButton('make_casual', 'aiPanel.makeCasual', <CheckBadgeIcon className="w-4 h-4"/>)}
                </div>
              </div>
            )}
          </div>

          {/* 自定義擴展區域 */}
          <div className="space-y-2 pt-3 border-t border-primary/10 dark:border-primary-dark/20">
            <div>
              <label htmlFor="expansion-instruction" className="block text-xs font-medium text-primary dark:text-primary-light mb-1">
                {t('aiPanel.expandRewriteLabel')}
              </label>
              <div className="ai-input-container">
                <input
                  type="text"
                  id="expansion-instruction"
                  value={expansionInstruction}
                  onChange={(e) => setExpansionInstruction(e.target.value)}
                  placeholder={t('aiPanel.expandPlaceholder')}
                  className="flex-grow p-2 border border-primary/30 dark:border-primary-dark/40 rounded-md text-xs sm:text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-light dark:text-slate-100"
                  disabled={!!isLoading || !editorInteraction?.activeEditor}
                  aria-label={t('aiPanel.expandPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && expansionInstruction.trim()) {
                      handleAiAction('expand');
                    }
                  }}
                />
                {renderButton('expand', 'aiPanel.expandButton', <SparklesIcon className="w-4 h-4"/>)}
              </div>
            </div>
          </div>

          {/* 結果預覽區域 */}
          {(aiResultPreview || isStreaming) && (
            <div className="mt-4 p-3 border border-green-500/30 dark:border-green-400/30 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">
                  {t('aiPanel.preview.title')}
                </h4>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                      <SparklesIcon className="w-3 h-3 mr-1 animate-spin" />
                      {t('aiPanel.streaming')}
                    </div>
                  )}
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {aiResultPreview && t(`aiPanel.${aiResultPreview.actionType}`)}
                  </div>
                </div>
              </div>
              <textarea
                readOnly
                value={aiResultPreview?.generatedContent || streamingContent || ''}
                className="w-full h-40 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 resize-none"
                aria-label={t('aiPanel.preview.contentAreaLabel')}
              />
              <div className="mt-3 ai-preview-actions">
                 <button
                   onClick={handleApplyPreview}
                   disabled={isStreaming}
                   className={`${getResponsiveButtonClass()} ${isStreaming ? disabledButtonClass : enabledButtonClass}`}
                 >
                    <CheckCircleIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.apply')}</span>
                </button>
                <button
                  onClick={handleCopyPreview}
                  disabled={isStreaming}
                  className={`${getResponsiveButtonClass()} ${isStreaming ? disabledButtonClass : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200'}`}
                >
                    <ClipboardDocumentIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.copy')}</span>
                </button>
                <button
                  onClick={handleDiscardPreview}
                  className={`${getResponsiveButtonClass()} bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400`}
                >
                    <XCircleIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.discard')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};