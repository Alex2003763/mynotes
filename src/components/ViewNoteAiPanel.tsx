import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiFeedback } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useEditorInteraction } from '../contexts/EditorInteractionContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  summarizeTextStreaming,
  answerQuestionFromNoteStreaming
} from '../services/aiService';
import { SparklesIcon, DocumentTextIcon, ChatBubbleLeftEllipsisIcon, LightBulbIcon, ChevronDownIcon, ClipboardDocumentIcon, PlusCircleIcon, PencilSquareIcon, XCircleIcon, BoltIcon, AdjustmentsHorizontalIcon } from './Icons';

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
  const { settings } = useSettings();
  const navigate = useNavigate();
  const editorInteraction = useEditorInteraction();
  
  const [isLoading, setIsLoading] = useState<AiViewAction | null>(null);
  const [qnaQuestion, setQnaQuestion] = useState('');
  const [aiResultPreview, setAiResultPreview] = useState<AiResultPreview | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isAnalysisToolsOpen, setIsAnalysisToolsOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const activeEditorId = editorInteraction?.activeEditor?.id;

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

  // 快捷鍵支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorInteraction?.activeEditor || isLoading) return;
      
      // Ctrl/Cmd + Alt + 組合鍵 (避免與編輯模式衝突)
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        switch (e.key) {
          case 'S':
            e.preventDefault();
            handleAiAction('summarize_short');
            break;
          case 'B':
            e.preventDefault();
            handleAiAction('summarize_bullet');
            break;
          case 'Q':
            e.preventDefault();
            if (qnaQuestion.trim()) {
              handleAiAction('qna');
            } else {
              document.getElementById('view-qna-question')?.focus();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorInteraction?.activeEditor, isLoading, qnaQuestion]);

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
    setStreamingContent('');
    setIsStreaming(false);
    
    const noteContentForAI = await getFullContentAsText();

    try {
      let result: string | undefined;
      
      if (!noteContentForAI && !currentNoteTitle && action !== 'qna') {
        displayApiMessage({ type: 'error', text: t('aiPanel.error.noContentToProcess') });
        setIsLoading(null);
        return;
      }
      
      const textToProcessForAI = noteContentForAI || currentNoteTitle;
      const currentModel = settings.aiProvider === 'openrouter' ? selectedAiModel : settings.geminiModel;

      // 使用流式輸出的操作
      const streamingActions: AiViewAction[] = ['summarize_short', 'summarize_bullet', 'qna'];
      
      if (streamingActions.includes(action)) {
        setIsStreaming(true);
        // 初始化預覽
        const initialPreview = { actionType: action, generatedContent: '', originalTitle: currentNoteTitle };
        setAiResultPreview(initialPreview);
        
        switch (action) {
          case 'summarize_short':
            await summarizeTextStreaming(textToProcessForAI, 'short', language, currentModel, settings.aiProvider, settings.customSystemPrompt, handleStreamingChunk);
            displayApiMessage({ type: 'success', text: t('aiPanel.success.summaryGenerated') });
            break;
          case 'summarize_bullet':
            await summarizeTextStreaming(textToProcessForAI, 'bullet', language, currentModel, settings.aiProvider, settings.customSystemPrompt, handleStreamingChunk);
            displayApiMessage({ type: 'success', text: t('aiPanel.success.summaryGenerated') });
            break;
          case 'qna':
            if (!qnaQuestion) {
              displayApiMessage({ type: 'error', text: t('aiPanel.error.noQuestion') });
              setIsLoading(null);
              setIsStreaming(false);
              return;
            }
            await answerQuestionFromNoteStreaming(qnaQuestion, textToProcessForAI, language, currentModel, settings.aiProvider, settings.customSystemPrompt, handleStreamingChunk);
            displayApiMessage({ type: 'success', text: t('aiPanel.success.answerReceived') });
            break;
        }
        
        // 流式完成，保持當前內容不變
        setIsStreaming(false);
        // 預覽內容已經通過 handleStreamingChunk 實時更新，無需再次設置
      }

    } catch (error) {
      console.error(`AI Action (${action}) Error:`, error);
      displayApiMessage({ type: 'error', text: t('aiPanel.error.actionFailed', {message: error instanceof Error ? error.message : t('aiPanel.error.unknownError')})});
    } finally {
      setIsLoading(null);
      setIsStreaming(false);
    }
  };

  const handleCopyResult = () => {
    const contentToCopy = aiResultPreview?.generatedContent || streamingContent;
    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy)
        .then(() => displayApiMessage({ type: 'success', text: t('aiPanel.preview.copied') }))
        .catch(err => displayApiMessage({ type: 'error', text: t('aiPanel.preview.copyFailed') + ': ' + err}));
    }
  };

  const handleCreateNewWithResult = () => {
    const contentToUse = aiResultPreview?.generatedContent || streamingContent;
    if (contentToUse && editorInteraction?.activeEditor) {
      const originalTitle = aiResultPreview?.originalTitle || editorInteraction.activeEditor.getTitle() || 'Note';
      navigate('/new', { state: { initialContentText: contentToUse, initialTitle: t('aiPanel.preview.newNoteTitlePrefix') + originalTitle } });
    }
  };

  const handleEditCurrentWithResult = () => {
    const contentToUse = aiResultPreview?.generatedContent || streamingContent;
    if (contentToUse && editorInteraction?.activeEditor) {
      navigate(`/note/${editorInteraction.activeEditor.id}`, { state: { initialContentText: contentToUse, replaceExistingContent: true } });
    }
  };
  
  const handleDiscardPreview = () => {
    setAiResultPreview(null);
    setStreamingContent('');
    setIsStreaming(false);
    displayApiMessage(null);
  };

  useEffect(() => {
    setQnaQuestion('');
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
  
  const renderButton = (action: AiViewAction, labelKey: string, icon: React.ReactNode, isCompact = false) => {
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
          {/* 快速分析工具 - 響應式布局 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between ai-panel-header">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{t('aiPanel.frequentTools')}</h4>
              <div className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block ai-panel-shortcuts">
                Ctrl+Alt+S/B/Q
              </div>
            </div>
            <div className="ai-button-grid">
              <div className="ai-button-item">
                {renderButton('summarize_short', 'aiPanel.summarizeShort', <DocumentTextIcon className="w-4 h-4"/>)}
              </div>
              <div className="ai-button-item">
                {renderButton('summarize_bullet', 'aiPanel.summarizeBullet', <BoltIcon className="w-4 h-4"/>)}
              </div>
            </div>
          </div>

          {/* 問答功能 */}
          <div className="space-y-2 pt-3 border-t border-primary/10 dark:border-primary-dark/20">
            <div>
              <label htmlFor="view-qna-question" className="block text-xs font-medium text-primary dark:text-primary-light mb-1">
                {t('aiPanel.qnaLabel')}
              </label>
              <div className="ai-input-container">
                <input
                  type="text"
                  id="view-qna-question"
                  value={qnaQuestion}
                  onChange={(e) => setQnaQuestion(e.target.value)}
                  placeholder={t('aiPanel.qnaPlaceholder')}
                  className="flex-grow p-2 border border-primary/30 dark:border-primary-dark/40 rounded-md text-xs sm:text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-light dark:text-slate-100"
                  disabled={!!isLoading || !editorInteraction?.activeEditor}
                  aria-label={t('aiPanel.qnaPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && qnaQuestion.trim()) {
                      handleAiAction('qna');
                    }
                  }}
                />
                {renderButton('qna', 'aiPanel.qnaButton', <ChatBubbleLeftEllipsisIcon className="w-4 h-4"/>)}
              </div>
            </div>
          </div>

          {/* 結果預覽區域 */}
          {(aiResultPreview || isStreaming) && (
            <div className="mt-4 p-3 border border-green-500/30 dark:border-green-400/30 rounded-lg bg-green-50 dark:bg-green-900/20 ai-preview-container">
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
                  onClick={handleCopyResult}
                  disabled={isStreaming}
                  className={`${getResponsiveButtonClass()} ${isStreaming ? disabledButtonClass : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200'}`}
                >
                    <ClipboardDocumentIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.copy')}</span>
                </button>
                <button
                  onClick={handleCreateNewWithResult}
                  disabled={isStreaming}
                  className={`${getResponsiveButtonClass()} ${isStreaming ? disabledButtonClass : enabledButtonClass}`}
                >
                    <PlusCircleIcon className="w-4 h-4"/>
                    <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.createNew')}</span>
                </button>
                {aiResultPreview?.actionType !== 'qna' && editorInteraction?.activeEditor && (
                    <button
                      onClick={handleEditCurrentWithResult}
                      disabled={isStreaming}
                      className={`${getResponsiveButtonClass()} ${isStreaming ? disabledButtonClass : enabledButtonClass}`}
                    >
                       <PencilSquareIcon className="w-4 h-4"/>
                       <span className="hidden sm:inline ml-1 truncate">{t('aiPanel.preview.editCurrent')}</span>
                    </button>
                )}
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