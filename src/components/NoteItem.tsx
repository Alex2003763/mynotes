
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../types'; // EditorJsOutputData removed
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { useNotes } from '../contexts/NoteContext';
import { EyeIcon, PinIcon, StarIcon } from './Icons';

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

// Optimized helper function to generate a summary from Markdown string
const markdownToSummaryText = (markdown: string | undefined): string => {
  if (!markdown) return '';
  
  // More efficient processing with early returns
  const lines = markdown.split('\n', 4); // Only process first 4 lines for performance
  let summary = lines.slice(0, 3).join(' ');
  
  if (summary.length === 0) return '';
  
  // Optimized regex operations
  summary = summary
    .replace(/^[#>\s*-]+/gm, '') // Remove leading markdown syntax
    .replace(/(\*\*|__|\*|_|~~|`)/g, '') // Remove formatting characters
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Keep alt text
    .trim();
  
  return summary;
};

const NoteItemComponent: React.FC<NoteItemProps> = ({ note, isSelected, onSelect }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toggleNoteAttribute } = useNotes();

  const MAX_SUMMARY_LENGTH = 90;
  
  // Memoize expensive computations
  const summary = useMemo(() => {
    const contentSummary = markdownToSummaryText(note.content);
    return contentSummary.length > MAX_SUMMARY_LENGTH
      ? `${contentSummary.substring(0, MAX_SUMMARY_LENGTH)}...`
      : contentSummary;
  }, [note.content]);
  
  const formattedDate = useMemo(() =>
    formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true }),
    [note.updatedAt]
  );

  const handleViewNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/view/${note.id}`);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNoteAttribute(note.id, 'isPinned');
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNoteAttribute(note.id, 'isFavorite');
  };

  return (
    <div
      onClick={onSelect}
      className={`
        p-3 hover:bg-slate-100 dark:hover:bg-slate-700/70 cursor-pointer
        ${isSelected ? 'bg-primary-light/20 dark:bg-primary-dark/40 border-l-4 border-primary' : 'border-l-4 border-transparent'}
        transition-all duration-150 ease-in-out flex justify-between items-start
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-current={isSelected ? "page" : undefined}
    >
      <div className="flex-grow overflow-hidden mr-2">
        <div className="flex items-center">
          <h3 className={`font-semibold truncate text-sm ${isSelected ? 'text-primary dark:text-primary-light' : 'text-slate-800 dark:text-slate-100'}`}>
            {note.title || t('noteItem.untitled')}
          </h3>
          {(note as any).isPinned && <PinIcon className="w-3 h-3 ml-2 text-slate-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          {summary || t('noteItem.noContent')}
        </p>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
              {formattedDate}
            </p>
            <div className="flex items-center space-x-1 note-item-buttons ml-2">
              <button
                onClick={(e) => {
                  console.log('[NoteItem] Favorite button clicked, current state:', (note as any).isFavorite);
                  handleToggleFavorite(e);
                }}
                className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 min-h-[44px] min-w-[44px] touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                <StarIcon className={`w-5 h-5 ${(note as any).isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400 hover:text-slate-500'}`} />
              </button>
              <button
                onClick={(e) => {
                  console.log('[NoteItem] Pin button clicked, current state:', (note as any).isPinned);
                  handleTogglePin(e);
                }}
                className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 min-h-[44px] min-w-[44px] touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                <PinIcon className={`w-5 h-5 ${(note as any).isPinned ? 'text-blue-500' : 'text-slate-400 hover:text-slate-500'}`} />
              </button>
            </div>
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="w-full overflow-hidden note-item-tags">
              {/* 在小螢幕上只顯示前1個標籤避免溢出 */}
              <div className="flex gap-1 sm:hidden">
                {note.tags.slice(0, 1).map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full truncate max-w-[80px]">
                    {tag}
                  </span>
                ))}
                {note.tags.length > 1 && (
                  <span className="px-2 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full flex-shrink-0">
                    +{note.tags.length - 1}
                  </span>
                )}
              </div>
              {/* 在大螢幕上顯示前2個標籤 */}
              <div className="hidden sm:flex flex-wrap gap-1">
                {note.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full truncate max-w-[100px]">
                    {tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full flex-shrink-0">
                    +{note.tags.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          console.log('[NoteItem] View button clicked for note:', note.id);
          handleViewNote(e);
        }}
        className="flex items-center justify-center p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
        style={{ touchAction: 'manipulation' }}
        title={t('noteItem.viewNote', { title: note.title || t('noteItem.untitled') })}
        aria-label={t('noteItem.viewNote', { title: note.title || t('noteItem.untitled') })}
      >
        <EyeIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const NoteItem = React.memo(NoteItemComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.note.tags.length === nextProps.note.tags.length &&
    prevProps.note.tags.every((tag, index) => tag === nextProps.note.tags[index]) &&
    (prevProps.note as any).isPinned === (nextProps.note as any).isPinned &&
    (prevProps.note as any).isFavorite === (nextProps.note as any).isFavorite &&
    prevProps.isSelected === nextProps.isSelected
  );
});

NoteItem.displayName = 'NoteItem';
