import React, { useState, useCallback, useEffect } from 'react'; 
import { useLocation } from 'react-router-dom';
import { AiFeaturesPanel } from './AiFeaturesPanel';
import { ViewNoteAiPanel } from './ViewNoteAiPanel';
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';
import { ApiFeedback } from '../types';
import { useEditorInteraction } from '../contexts/EditorInteractionContext'; 
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, LightBulbIcon } from './Icons';

interface RightSidebarProps {
  width: number; 
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ width }) => {
  const location = useLocation();
  const { settings } = useSettings();
  const { t } = useI18n();
  const editorInteraction = useEditorInteraction(); 

  const [apiMessage, setApiMessage] = useState<ApiFeedback | null>(null);
  const apiMessageTimeoutRef = React.useRef<number | null>(null);

  const displayApiMessage = useCallback((message: ApiFeedback | null) => {
    if (apiMessageTimeoutRef.current) clearTimeout(apiMessageTimeoutRef.current);
    setApiMessage(message);
    if (message) {
      apiMessageTimeoutRef.current = window.setTimeout(() => {
        setApiMessage(null);
      }, 5000);
    }
  }, []);
  
  const isEditMode = location.pathname.startsWith('/note/') || location.pathname.startsWith('/new');
  const isViewMode = location.pathname.startsWith('/view/');

  const canShowAiTools = settings.openRouterApiKeyStatus === 'valid';
  const editorReady = !!editorInteraction?.activeEditor;

  useEffect(() => {
    // Clear panel-specific messages if editor context changes or becomes unavailable
    if (!editorReady && apiMessage) {
        setApiMessage(null);
    }
  }, [editorReady, apiMessage]);

  useEffect(() => {
    if ((isEditMode || isViewMode) && canShowAiTools && !editorReady) {
      console.log("RightSidebar: AI tools may be shown, but editor context is not yet ready. Current path:", location.pathname, "Active Editor ID:", editorInteraction?.activeEditor?.id);
    }
  }, [isEditMode, isViewMode, canShowAiTools, editorReady, location.pathname, editorInteraction?.activeEditor?.id]);

  const renderApiMessageToast = () => {
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
        className={`absolute top-4 right-4 p-3 rounded-md shadow-xl text-white ${bgColor} flex items-center z-50 max-w-xs transition-all`}
        role="alert"
        onClick={() => setApiMessage(null)} 
      >
        {icon}
        <span className="text-sm">{apiMessage.text}</span>
      </div>
    );
  };
  
  const sidebarStyle: React.CSSProperties = { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };

  return (
    <aside
      className={`
        flex-shrink-0 relative right-sidebar-container
        bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900
        border-l border-slate-200 dark:border-slate-700
        print:hidden flex flex-col shadow-sm
      `}
      style={sidebarStyle}
      aria-label={t('aiPanel.title')}
    >
      {renderApiMessageToast()}
      <div className="flex flex-col h-full">
        {/* 標題區域 */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary-dark/20 flex items-center justify-center mr-3">
                <LightBulbIcon className="w-5 h-5 text-primary dark:text-primary-light" />
              </div>
              {t('aiPanel.title')}
            </h2>
          </div>
          
          {/* 狀態指示器 */}
          <div className="mt-2 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${canShowAiTools && editorReady ? 'bg-green-400' : canShowAiTools ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {canShowAiTools && editorReady
                ? t('aiPanel.ready')
                : canShowAiTools
                ? t('aiPanel.loadingContext')
                : t('noteEditor.aiFeatures.keyNotSet')
              }
            </span>
          </div>
        </div>
        
        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!canShowAiTools && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <LightBulbIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('noteEditor.aiFeatures.keyNotSet')}
              </p>
            </div>
          )}
          
          {canShowAiTools && !editorReady && (isEditMode || isViewMode) && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 dark:bg-primary-dark/20 flex items-center justify-center">
                <LightBulbIcon className="w-8 h-8 text-primary dark:text-primary-light animate-pulse" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('aiPanel.loadingContext')}
              </p>
            </div>
          )}
          
          {canShowAiTools && editorReady && isEditMode && (
            <div className="p-2 ai-panel-container">
              <AiFeaturesPanel
                displayApiMessage={displayApiMessage}
                selectedAiModel={settings.aiModel}
              />
            </div>
          )}
          
          {canShowAiTools && editorReady && isViewMode && (
            <div className="p-2 ai-panel-container">
              <ViewNoteAiPanel
                displayApiMessage={displayApiMessage}
                selectedAiModel={settings.aiModel}
              />
            </div>
          )}
        </div>
        
        {/* 底部信息區域 */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white/30 dark:bg-slate-800/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap">
              <span className="truncate max-w-[150px]" title={settings.aiModel}>
                Model: {settings.aiModel.split('/').pop() || 'N/A'}
              </span>
              {canShowAiTools && editorReady && (
                <span className="flex items-center flex-shrink-0">
                  <div className="w-1 h-1 rounded-full bg-green-400 mr-1"></div>
                  <span className="hidden sm:inline">
                    {isEditMode ? 'Edit Mode' : 'View Mode'}
                  </span>
                  <span className="sm:hidden">
                    {isEditMode ? 'Edit' : 'View'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};