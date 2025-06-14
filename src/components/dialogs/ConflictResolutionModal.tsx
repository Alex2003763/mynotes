import React from 'react';
import { Modal } from '../Modal';
import { Note } from '../../types';
import { useI18n } from '../../contexts/I18nContext';

export type ConflictResolution = 'overwrite' | 'skip' | 'keep_both';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflictingNote: Note;
  onResolve: (resolution: ConflictResolution) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflictingNote,
  onResolve,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const footer = (
    <div className="flex flex-col sm:flex-row justify-end gap-3">
      <button
        onClick={() => onResolve('skip')}
        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
      >
        {t('conflictResolutionModal.skip')}
      </button>
      <button
        onClick={() => onResolve('keep_both')}
        className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary-light"
      >
        {t('conflictResolutionModal.keepBoth')}
      </button>
      <button
        onClick={() => onResolve('overwrite')}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light"
      >
        {t('conflictResolutionModal.overwrite')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => onResolve('skip')} title={t('conflictResolutionModal.title')} footer={footer}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t('conflictResolutionModal.message', { title: conflictingNote.title })}
      </p>
    </Modal>
  );
};