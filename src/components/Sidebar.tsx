import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FilterAndSortOptions } from './FilterAndSortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { CogIcon, StatItem, XIcon } from './Icons';
import { UnifiedFilterInput } from './UnifiedFilterInput';

interface SidebarProps {
  isOpen: boolean; // For mobile toggle
  onClose: () => void; // For mobile toggle
  width: number; // For desktop resizable width
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, width, onOpenSettings }) => {
  const {
    notes,
    currentSort, setCurrentSort,
    currentFilter, setCurrentFilter,
  } = useNotes();
  const { t } = useI18n();
  const location = useLocation();
  
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSortChange = (sortKey: string) => {
    setCurrentSort(sortKey as any);
  };

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter as any);
  };
  
  const sidebarStyle: React.CSSProperties = isMobileView ? {} : { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };

  if (isMobileView && !isOpen) {
    return null; // Don't render if mobile and closed
  }

  return (
    <aside
      className={`
        ${isMobileView ? 'fixed inset-y-0 left-0 z-30 w-64 sm:w-72 transform transition-transform duration-300 ease-in-out shadow-xl' : 'relative z-20 flex flex-col'}
        flex-shrink-0 bg-slate-50 dark:bg-slate-800
        border-r border-slate-200 dark:border-slate-700
        ${isMobileView ? (isOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        print:hidden
      `}
      style={sidebarStyle}
      aria-label={t('sidebar.notesTitle')}
    >
      <div className="flex flex-col h-full">
        {isMobileView && (
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">{t('sidebar.notesTitle')}</h2>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0 ml-2"
                    aria-label={t('header.toggleSidebarOpen')}
                >
                    <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>
        )}

        { !location.pathname.startsWith('/note/') && !location.pathname.startsWith('/view/') && (
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="w-full">
              <UnifiedFilterInput />
            </div>
            <div className="w-full">
              <FilterAndSortOptions
                currentSort={currentSort}
                onSortChange={handleSortChange}
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
        )}

        {/* 統計數據面板 */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">{t('aiPanel.statsTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
            <StatItem label={t('aiPanel.totalNotes')} value={notes.length.toString()} />
            <StatItem label={t('aiPanel.tagsUsed')} value={new Set(notes.flatMap(n => n.tags)).size.toString()} />
          </div>
        </div>

        {/* 底部設定按鈕 */}
        <div className="mt-auto p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <CogIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 dark:fill-white" />
            <span className="text-xs sm:text-sm font-medium">{t('header.settings')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
