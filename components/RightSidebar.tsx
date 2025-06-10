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
        flex-shrink-0 relative 
        bg-slate-50 dark:bg-slate-800 
        border-l border-slate-200 dark:border-slate-700
        print:hidden flex flex-col 
      `} 
      style={sidebarStyle}
      aria-label={t('aiPanel.title')}
    >
      {renderApiMessageToast()}
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                <LightBulbIcon className="w-5 h-5 mr-2 text-primary dark:text-primary-light" />
                {t('aiPanel.title')}
            </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-smooth p-1">
          {!canShowAiTools && (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>{t('noteEditor.aiFeatures.keyNotSet')}</p>
            </div>
          )}
          {canShowAiTools && !editorReady && (isEditMode || isViewMode) && (
             <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>{t('aiPanel.loadingContext')}</p> 
            </div>
          )}
          {canShowAiTools && editorReady && isEditMode && (
            <AiFeaturesPanel 
              displayApiMessage={displayApiMessage}
              selectedAiModel={settings.aiModel}
            />
          )}
          {canShowAiTools && editorReady && isViewMode && (
            <ViewNoteAiPanel
              displayApiMessage={displayApiMessage}
              selectedAiModel={settings.aiModel}
            />
          )}
        </div>
      </div>
    </aside>
  );
};