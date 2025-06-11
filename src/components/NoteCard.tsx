import React, { useMemo, useState } from 'react';
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
  DocumentTextIcon
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
  const { deleteNote } = useNotes();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const MAX_SUMMARY_LENGTH = viewMode === 'grid' ? 120 : 150;
  
  const summary = useMemo(() => {
    const contentSummary = markdownToSummaryText(note.content);
    return contentSummary.length > MAX_SUMMARY_LENGTH
      ? `${contentSummary.substring(0, MAX_SUMMARY_LENGTH)}...`
      : contentSummary || t('noteCard.noContent');
  }, [note.content, MAX_SUMMARY_LENGTH, t]);
  
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
    navigate(`/view/${note.id}`);
  };

  const handleEditNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/edit/${note.id}`);
  };

  const handleDeleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const cardClasses = `
    group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
    shadow-sm hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-slate-900/20
    transition-all duration-300 ease-out cursor-pointer
    ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''}
    ${isLoading || isDeleting ? 'opacity-50 pointer-events-none' : ''}
    ${viewMode === 'list' ? 'flex flex-row w-full max-w-3xl max-h-40' : 'flex flex-col'}
    ${isHovered ? 'transform hover:-translate-y-1 hover:scale-[1.02]' : ''}
  `;

  const contentClasses = viewMode === 'list'
    ? 'flex-1 p-3'  // Reduced padding for list view
    : 'flex-1 p-5';

  const actionsClasses = viewMode === 'list'
    ? 'flex flex-row items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700' // Reduced padding for list view
    : 'flex flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700';

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
        <header className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className={`
              font-semibold ${viewMode === 'list' ? 'text-base' : 'text-lg'} leading-tight truncate
              ${isSelected
                ? 'text-primary dark:text-primary-light'
                : 'text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-primary-light'
              }
              transition-colors duration-200
            `}>
              {note.title || t('noteCard.untitled')}
            </h3>
            <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'mt-0.5' : 'mt-1'} text-xs text-slate-500 dark:text-slate-400`}>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formattedDate}
              </span>
              {note.createdAt !== note.updatedAt && (
                <span className="flex items-center gap-1">
                  <DocumentTextIcon className="w-3 h-3" />
                  {t('noteCard.createdAgo', { time: createdDate })}
                </span>
              )}
            </div>
          </div>
          
          {/* 收藏按鈕 */}
          <button
            onClick={handleToggleFavorite}
            className={`
              p-2 rounded-full transition-all duration-200 
              ${isFavorited 
                ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' 
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              }
              ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
            title={isFavorited ? t('noteCard.unfavorite') : t('noteCard.favorite')}
            aria-label={isFavorited ? t('noteCard.unfavorite') : t('noteCard.favorite')}
          >
            <HeartIcon className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </header>

        {/* 內容預覽 */}
        <div className="mb-4">
          <p className={`
            text-sm text-slate-600 dark:text-slate-300 leading-relaxed
            ${viewMode === 'grid' ? 'line-clamp-3' : 'line-clamp-2'}
          `}>
            {summary}
          </p>
        </div>

        {/* 標籤區域 */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5"> {/* Adjusted gap and margin for list view */}
            {note.tags.slice(0, viewMode === 'grid' ? 3 : (viewMode === 'list' ? 3 : 5)).map((tag, index) => ( // Reduced tags in list view to 3
              <span
                key={`${tag}-${index}`}
                className={`
                  inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium {/* Adjusted padding for tags */}
                  ${getTagColor(tag)}
                  transition-all duration-200 hover:scale-105
                `}
              >
                <TagIcon className="w-2.5 h-2.5" /> {/* Slightly smaller tag icon */}
                {tag}
              </span>
            ))}
            {note.tags.length > (viewMode === 'grid' ? 3 : (viewMode === 'list' ? 3 : 5)) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {t('noteCard.moreTags', { count: (note.tags.length - (viewMode === 'grid' ? 3 : (viewMode === 'list' ? 3 : 5))).toString() })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 卡片底部操作區 */}
      <footer className={actionsClasses}>
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewNote}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-light
              hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-800
            "
            title={t('noteItem.viewNote', { title: note.title || t('noteCard.untitled') })}
            aria-label={t('noteItem.viewNote', { title: note.title || t('noteCard.untitled') })}
          >
            <EyeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('noteCard.view')}</span>
          </button>

          <button
            onClick={handleEditNote}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-light
              hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-800
            "
            title={t('viewNote.editButton')}
            aria-label={t('viewNote.editButton')}
          >
            <PencilSquareIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('noteCard.edit')}</span>
          </button>
        </div>

        <button
          onClick={handleDeleteNote}
          className="
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800
          "
          title={t('noteEditor.deleteButtonTitle')}
          aria-label={t('noteEditor.deleteButtonTitle')}
          disabled={isDeleting}
        >
          <TrashIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('noteCard.delete')}</span>
        </button>
      </footer>
    </article>
  );
};

// 記憶化組件以提高性能
export const NoteCard = React.memo(NoteCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.note.tags.length === nextProps.note.tags.length &&
    prevProps.note.tags.every((tag, index) => tag === nextProps.note.tags[index]) &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.isLoading === nextProps.isLoading
  );
});

NoteCard.displayName = 'NoteCard';