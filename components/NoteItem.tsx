import React from 'react';
import { Note, EditorJsOutputData } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

// Helper function to convert EditorJsOutputData to plain text for summary
const editorDataToSummaryText = (data: EditorJsOutputData | undefined): string => {
  if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0) return '';
  
  // Try to get text from the first few blocks
  let summary = '';
  for (let i = 0; i < Math.min(data.blocks.length, 3); i++) { // Check first 3 blocks
    const block = data.blocks[i];
    let blockText = '';
    switch (block.type) {
      case 'header':
      case 'paragraph':
        blockText = block.data.text || '';
        break;
      case 'list':
        blockText = (block.data.items || []).join(' ');
        break;
      // Add other relevant block types if needed for summary
    }
    summary += blockText.trim() + ' ';
    if (summary.length > 120) break; // Stop if summary gets too long
  }
  return summary.trim().replace(/<[^>]+>/g, ''); // Strip any HTML
};


export const NoteItem: React.FC<NoteItemProps> = ({ note, isSelected, onSelect }) => {
  const { t } = useI18n(); 

  const MAX_SUMMARY_LENGTH = 90;
  
  const contentSummary = editorDataToSummaryText(note.content);
  const summary = contentSummary.length > MAX_SUMMARY_LENGTH 
    ? `${contentSummary.substring(0, MAX_SUMMARY_LENGTH)}...` 
    : contentSummary;
  
  const formattedDate = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });

  return (
    <div
      onClick={onSelect}
      className={`
        p-3 hover:bg-slate-100 dark:hover:bg-slate-700/70 cursor-pointer
        ${isSelected ? 'bg-primary-light/20 dark:bg-primary-dark/40 border-l-4 border-primary' : 'border-l-4 border-transparent'}
        transition-all duration-150 ease-in-out
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-current={isSelected ? "page" : undefined}
    >
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
            {note.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                {t('noteItem.moreTags', { count: (note.tags.length - 2).toString() })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};