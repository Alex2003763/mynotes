import React from 'react';
import { Modal } from '../Modal';
import { useI18n } from '../../contexts/I18nContext';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText,
  cancelButtonText,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-800"
      >
        {cancelButtonText || t('confirmationDialog.cancel')}
      </button>
      <button
        onClick={onConfirm}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark dark:focus:ring-offset-slate-800"
      >
        {confirmButtonText || t('confirmationDialog.confirm')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} footer={footer}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
};