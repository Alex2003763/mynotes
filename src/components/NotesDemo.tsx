import React from 'react';
import { NoteGridLayout } from './NoteGridLayout';

export const NotesDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto">
        <NoteGridLayout />
      </div>
    </div>
  );
};