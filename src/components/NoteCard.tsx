import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { useNotes } from '../contexts/NoteContext';
import { 
  EyeIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  ClockIcon,
  TagIcon,
  HeartIcon,
  DocumentTextIcon,
  PinIcon,
  StarIcon
} from './Icons';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  viewMode?: 'grid' | 'list';
  isLoading?: boolean;
}

// 輔助函數：從內容生成摘要
const markdownToSummaryText = (markdown: string | undefined): string => {
  if (!markdown) return '';
  
  const lines = markdown.split('\n', 4);
  let summary = lines.slice(0, 3).join(' ');
  
  if (summary.length === 0) return '';
  
  summary = summary
    .replace(/^[#>\s*-]+/gm, '')
    .replace(/(\*\*|__|\*|_|~~|`)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .trim();
  
  return summary;
};

// 顏色主題配置
const tagColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
];

const getTagColor = (tag: string): string => {
  const hash = tag.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return tagColors[Math.abs(hash) % tagColors.length];
};

const NoteCardComponent: React.FC<NoteCardProps> = ({ 
  note, 
  isSelected, 
  onSelect, 
  viewMode = 'grid',
  isLoading = false 
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { deleteNote, toggleNoteAttribute } = useNotes();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉下拉菜單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const MAX_SUMMARY_LENGTH = viewMode === 'grid' ? 120 : 150;
  
  const summary = useMemo(() => {
    const fullContent = note.pages?.map(p => p.content).join('\n') || note.content || '';
    const contentSummary = markdownToSummaryText(fullContent);
    return contentSummary.length > MAX_SUMMARY_LENGTH
      ? `${contentSummary.substring(0, MAX_SUMMARY_LENGTH)}...`
      : contentSummary || t('noteCard.noContent');
  }, [note.pages, note.content, MAX_SUMMARY_LENGTH, t]);
  
  const formattedDate = useMemo(() =>
    formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true }),
    [note.updatedAt]
  );

  const createdDate = useMemo(() =>
    formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }),
    [note.createdAt]
  );

  const handleViewNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    navigate(`/view/${note.id}`);
  };

  const handleEditNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    navigate(`/note/${note.id}`);
  };

  const handleDeleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (window.confirm(t('noteEditor.deleteConfirmation'))) {
      setIsDeleting(true);
      try {
        await deleteNote(note.id);
      } catch (error) {
        console.error('Failed to delete note:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNoteAttribute(note.id, 'isFavorite');
  };

  const handleTogglePin = (e: React.MouseEvent) => {
   e.stopPropagation();
   toggleNoteAttribute(note.id, 'isPinned');
 };

  const cardClasses = `
    group relative overflow-visible
    bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900
    rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-700/60
    shadow-lg hover:shadow-xl
    transition-all duration-200 ease-out cursor-pointer
    backdrop-blur-sm
    ${isSelected ? 'ring-2 ring-primary ring-offset-2 sm:ring-offset-4 dark:ring-offset-slate-900 shadow-primary/20' : ''}
    ${isLoading || isDeleting ? 'opacity-60 pointer-events-none' : ''}
    ${viewMode === 'list'
      ? 'flex flex-row w-full max-w-full sm:max-w-4xl h-auto min-h-[120px] sm:max-h-32'
      : 'flex flex-col w-full sm:w-64 h-auto sm:h-64 min-h-[200px] sm:min-h-[256px]'}
    hover:border-primary/30 dark:hover:border-primary-light/30
  `;

  const contentClasses = viewMode === 'list'
    ? 'flex-1 p-2 sm:p-2.5 bg-gradient-to-r from-transparent to-slate-50/30 dark:to-slate-800/30'
    : 'p-2.5 sm:p-3 bg-gradient-to-b from-transparent to-slate-50/20 dark:to-slate-800/20 flex-1';

  const actionsClasses = viewMode === 'list'
    ? 'flex flex-row items-center justify-center p-3 sm:p-4 bg-gradient-to-t from-slate-100/80 to-transparent dark:from-slate-700/50 dark:to-transparent border-l border-slate-200/60 dark:border-slate-600/60 backdrop-blur-sm'
    : 'flex flex-row items-center justify-between p-3 sm:p-4 bg-gradient-to-t from-slate-100/80 to-transparent dark:from-slate-700/50 dark:to-transparent border-t border-slate-200/60 dark:border-slate-600/60 backdrop-blur-sm';

  if (isLoading) {
    return (
      <div className={cardClasses}>
        <div className="animate-pulse">
          <div className={contentClasses}>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cardClasses}
      style={{ zIndex: showDropdown ? 9999 : 'auto' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-current={isSelected ? "page" : undefined}
      aria-label={`${t('noteCard.title')}: ${note.title || t('noteCard.untitled')}`}
    >
      {/* 載入覆蓋層 */}
      {(isLoading || isDeleting) && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
            {isDeleting ? t('noteCard.deleting') : t('noteCard.loading')}
          </div>
        </div>
      )}

      {/* 卡片頭部 */}
      <div className={contentClasses}>
        <header className="flex items-start justify-between mb-1 sm:mb-1.5">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className={`
              font-medium ${viewMode === 'list' ? 'text-sm sm:text-base' : 'text-sm sm:text-base'} leading-tight
              ${isSelected
                ? 'text-primary dark:text-primary-light'
                : 'text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-primary-light'
              }
              transition-colors duration-200
              ${note.title ? '' : 'italic text-slate-500 dark:text-slate-400'}
              ${viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-2 sm:line-clamp-1'}
            `}>
              {note.title || t('noteCard.untitled')}
            </h3>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {formattedDate}
            </div>
          </div>
          
          <div
            className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex items-center space-x-0.5 sm:space-x-1 z-20 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity duration-200 note-card-actions"
            onTouchStart={(e) => {
              console.log('[NoteCard] Touch detected on action buttons area');
              e.currentTarget.style.opacity = '1';
            }}
          >
          <button
            onClick={(e) => {
              console.log('[NoteCard] Favorite button clicked, current state:', (note as any).isFavorite);
              handleToggleFavorite(e);
            }}
            className="flex items-center justify-center p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <StarIcon className={`w-5 h-5 ${(note as any).isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
          </button>
          <button
            onClick={(e) => {
              console.log('[NoteCard] Pin button clicked, current state:', (note as any).isPinned);
              handleTogglePin(e);
            }}
            className="flex items-center justify-center p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <PinIcon className={`w-5 h-5 ${(note as any).isPinned ? 'text-blue-500' : 'text-slate-500'}`} />
          </button>
           {/* 三點下拉菜單 */}
           <div className="relative" ref={dropdownRef}>
             <button
               onClick={(e) => {
                 console.log('[NoteCard] Three-dot menu clicked, current state:', showDropdown);
                 toggleDropdown(e);
               }}
               className="flex items-center justify-center p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
               style={{ touchAction: 'manipulation' }}
             >
               <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
               </svg>
             </button>
             
             {/* 下拉菜單 */}
             {showDropdown && (
               <div
                 className="note-card-dropdown absolute right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[160px] max-w-[200px] animate-in slide-in-from-top-2 duration-150"
                 onTouchStart={() => console.log('[NoteCard] Dropdown menu touched')}
               >
                 <button
                   onClick={handleViewNote}
                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150 text-left min-h-[44px] touch-manipulation"
                 >
                   <EyeIcon className="w-5 h-5 flex-shrink-0" />
                   <span className="truncate">{t('noteCard.view')}</span>
                 </button>
                 <button
                   onClick={handleEditNote}
                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150 text-left min-h-[44px] touch-manipulation"
                 >
                   <PencilSquareIcon className="w-5 h-5 flex-shrink-0" />
                   <span className="truncate">{t('noteCard.edit')}</span>
                 </button>
                 <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                 <button
                   onClick={handleDeleteNote}
                   className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 text-left min-h-[44px] touch-manipulation"
                   disabled={isDeleting}
                 >
                   <TrashIcon className="w-5 h-5 flex-shrink-0" />
                   <span className="truncate">{isDeleting ? t('noteCard.deleting') : t('noteCard.delete')}</span>
                 </button>
               </div>
             )}
           </div>
          </div>
        </header>

        {/* 內容預覽 */}
        <div className="mb-1.5 sm:mb-2 flex-1">
          <p className={`
            text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400
            ${viewMode === 'grid' ? 'line-clamp-3 sm:line-clamp-4' : 'line-clamp-2 sm:line-clamp-1'}
          `}>
            {summary}
          </p>
        </div>

        {/* 標籤區域 */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {note.tags.slice(0, viewMode === 'grid' ? 3 : 4).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className={`
                  inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium
                  ${getTagColor(tag)}
                  transition-all duration-200 hover:scale-105
                `}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > (viewMode === 'grid' ? 3 : 4) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                +{note.tags.length - (viewMode === 'grid' ? 3 : 4)}
              </span>
            )}
          </div>
        )}
      </div>

    </article>
  );
};

// 記憶化組件以提高性能
export const NoteCard = React.memo(NoteCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    JSON.stringify(prevProps.note.pages) === JSON.stringify(nextProps.note.pages) &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.note.tags.length === nextProps.note.tags.length &&
    prevProps.note.tags.every((tag, index) => tag === nextProps.note.tags[index]) &&
    (prevProps.note as any).isPinned === (nextProps.note as any).isPinned &&
    (prevProps.note as any).isFavorite === (nextProps.note as any).isFavorite &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isLoading === nextProps.isLoading
  );
});

NoteCard.displayName = 'NoteCard';