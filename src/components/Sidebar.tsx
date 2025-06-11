import React, { useState, useEffect } from 'react';
import { NoteList } from './NoteList';
import { SortOptions } from './SortOptions';
import { useNotes } from '../contexts/NoteContext';
import { useI18n } from '../contexts/I18nContext';
import { XIcon } from './Icons';
import { UnifiedFilterInput } from './UnifiedFilterInput';

interface SidebarProps {
  isOpen: boolean; // For mobile toggle
  onClose: () => void; // For mobile toggle
  width: number; // For desktop resizable width
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, width }) => {
  const { 
    currentSort, setCurrentSort,
  } = useNotes();
  const { t } = useI18n();
  
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
  
  const sidebarStyle: React.CSSProperties = isMobileView ? {} : { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };

  if (isMobileView && !isOpen) {
    return null; // Don't render if mobile and closed
  }

  return (
    <aside 
      className={`
        ${isMobileView ? 'fixed inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 ease-in-out shadow-xl' : 'relative z-20 flex flex-col'}
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
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('sidebar.notesTitle')}</h2>
                <button 
                    onClick={onClose} 
                    className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={t('header.toggleSidebarOpen')}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        )}

        <div className="p-4 flex items-center gap-2"> 
          <div className="flex-1">
            <UnifiedFilterInput />
          </div>
          <SortOptions currentSort={currentSort} onSortChange={handleSortChange} />
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <NoteList />
        </div>
      </div>
    </aside>
  );
};