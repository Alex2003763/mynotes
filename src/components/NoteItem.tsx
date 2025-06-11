
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../types'; // EditorJsOutputData removed
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { EyeIcon } from './Icons';

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
        <h3 className={`font-semibold truncate text-sm ${isSelected ? 'text-primary dark:text-primary-light' : 'text-slate-800 dark:text-slate-100'}`}>
          {note.title || t('noteItem.untitled')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          {summary || t('noteItem.noContent')}
        </p>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {formattedDate}
          </p>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end shrink-0 ml-2">
              {note.tags.slice(0, 1).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                  {tag}
                </span>
              ))}
              {note.tags.length > 1 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                  {t('noteItem.moreTags', { count: (note.tags.length - 1).toString() })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={handleViewNote}
        className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0"
        title={t('noteItem.viewNote', { title: note.title || t('noteItem.untitled') })} 
        aria-label={t('noteItem.viewNote', { title: note.title || t('noteItem.untitled') })}
      >
        <EyeIcon className="w-4 h-4" />
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
    prevProps.isSelected === nextProps.isSelected
  );
});

NoteItem.displayName = 'NoteItem';
